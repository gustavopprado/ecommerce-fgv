// backend/src/controllers/orders.controller.js
const pool = require('../config/db');
const ExcelJS = require('exceljs');
const path = require('path');
const nodemailer = require('nodemailer');

// POST /api/pedidos
async function criarPedido(req, res) {
  const {
    nome,
    setor,
    cracha,
    aceitaDesconto,
    itens,
    numeroParcelas,
  } = req.body;

  if (!nome || !setor || !cracha) {
    return res.status(400).json({ error: 'Nome, setor e crachá são obrigatórios.' });
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'O pedido precisa ter ao menos um item.' });
  }

  const aceitaFlag = !!aceitaDesconto;

  const valorTotal = itens.reduce((acc, item) => {
    const preco = Number(item.cost) || 0;
    const qtd = Number(item.quantity) || 0;
    return acc + preco * qtd;
  }, 0);

  // número de parcelas (1 a 10)
  let parcelas = parseInt(numeroParcelas, 10);
  if (isNaN(parcelas) || parcelas < 1) parcelas = 1;
  if (parcelas > 10) parcelas = 10;

  // regra: abaixo de 100, só pode 1x
  if (valorTotal < 100 && parcelas > 1) {
    return res.status(400).json({
      error: 'Pedidos abaixo de R$ 100,00 só podem ser parcelados em 1x.',
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [funcRows] = await conn.query(
      'SELECT id FROM funcionarios WHERE cracha = ?',
      [cracha]
    );

    let funcionarioId;
    if (funcRows.length > 0) {
      funcionarioId = funcRows[0].id;
      await conn.query(
        'UPDATE funcionarios SET nome = ?, setor = ? WHERE id = ?',
        [nome, setor, funcionarioId]
      );
    } else {
      const [result] = await conn.query(
        'INSERT INTO funcionarios (nome, setor, cracha) VALUES (?, ?, ?)',
        [nome, setor, cracha]
      );
      funcionarioId = result.insertId;
    }

    const [pedidoResult] = await conn.query(
      'INSERT INTO pedidos (funcionario_id, valor_total, aceita_desconto, numero_parcelas) VALUES (?, ?, ?, ?)',
      [funcionarioId, valorTotal, aceitaFlag ? 1 : 0, parcelas]
    );
    const pedidoId = pedidoResult.insertId;

    const values = itens.map((item) => [
      pedidoId,
      item.code,
      item.description,
      item.quantity,
      item.cost,
    ]);

    await conn.query(
      'INSERT INTO itens_pedido (pedido_id, codigo_produto, descricao_produto, quantidade, preco_unitario) VALUES ?',
      [values]
    );

    await conn.commit();

    // Dispara e-mail em background (não trava resposta)
    enviarEmailNovoPedido(pedidoId).catch((err) => {
      console.error('Erro ao enviar e-mail (novo pedido):', err);
    });

    return res.status(201).json({
      message: 'Pedido criado com sucesso.',
      pedidoId,
      valorTotal,
    });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao criar pedido:', err);
    return res.status(500).json({ error: 'Erro ao criar pedido.' });
  } finally {
    conn.release();
  }
}

// GET /api/pedidos  (lista para admin)
async function listarPedidos(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.data_pedido, p.valor_total, p.status, p.aceita_desconto,
              p.numero_parcelas,
              f.nome AS funcionario_nome, f.setor, f.cracha
       FROM pedidos p
       JOIN funcionarios f ON f.id = p.funcionario_id
       ORDER BY p.data_pedido DESC`
    );

    return res.json(rows);
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    return res.status(500).json({ error: 'Erro ao listar pedidos.' });
  }
}

// GET /api/pedidos/:id  (detalhe completo p/ admin)
async function obterPedidoDetalhado(req, res) {
  const { id } = req.params;

  try {
    const [pedRows] = await pool.query(
      `SELECT p.id, p.data_pedido, p.valor_total, p.status, p.aceita_desconto,
              p.numero_parcelas,
              f.nome AS funcionario_nome, f.setor, f.cracha
       FROM pedidos p
       JOIN funcionarios f ON f.id = p.funcionario_id
       WHERE p.id = ?`,
      [id]
    );

    if (pedRows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const pedido = pedRows[0];

    const [itensRows] = await pool.query(
      `SELECT codigo_produto, descricao_produto, quantidade, preco_unitario
       FROM itens_pedido
       WHERE pedido_id = ?`,
      [id]
    );

    return res.json({
      pedido,
      itens: itensRows,
    });
  } catch (err) {
    console.error('Erro ao obter pedido detalhado:', err);
    return res.status(500).json({ error: 'Erro ao obter pedido detalhado.' });
  }
}

// GET /api/pedidos/:id/xlsx  (gera ficha a partir do modelo)
async function gerarFichaXlsx(req, res) {
  const pedidoId = req.params.id;

  try {
    const buffer = await gerarFichaXlsxBuffer(pedidoId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=ficha_pedido_${pedidoId}.xlsx`
    );

    return res.send(buffer);
  } catch (error) {
    console.error('Erro ao gerar ficha XLSX:', error);
    return res.status(500).json({ error: 'Erro ao gerar ficha XLSX.' });
  }
}

/**
 * Gera o XLSX em memória usando o MESMO template do painel admin.
 * Retorna um Buffer (para download ou anexo em e-mail).
 */
async function gerarFichaXlsxBuffer(pedidoId) {
  const connection = await pool.getConnection();

  try {
    // 1) Buscar dados do pedido + funcionário
    const [pedRows] = await connection.query(
      `SELECT p.*, f.nome AS funcionario_nome, f.setor, f.cracha
       FROM pedidos p
       JOIN funcionarios f ON f.id = p.funcionario_id
       WHERE p.id = ?`,
      [pedidoId]
    );

    if (pedRows.length === 0) {
      throw new Error('Pedido não encontrado');
    }

    const pedido = pedRows[0];

    // 2) Buscar itens do pedido
    const [itensRows] = await connection.query(
      `SELECT codigo_produto, descricao_produto, quantidade, preco_unitario
       FROM itens_pedido
       WHERE pedido_id = ?`,
      [pedidoId]
    );

    // 3) Carregar o MESMO template usado no painel admin
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, '..', 'templates', 'ficha_base.xlsx');
    await workbook.xlsx.readFile(templatePath);

    const sheet = workbook.getWorksheet(1); // primeira aba

    // Ajustar estas células conforme o seu template real:
    sheet.getCell('C3').value = pedido.funcionario_nome; // nome do colaborador
    sheet.getCell('A4').value = pedido.cracha;           // crachá
    sheet.getCell('D4').value = pedido.setor;            // setor
    sheet.getCell('C4').value = pedido.numero_parcelas;  // nº parcelas
    sheet.getCell('E4').value = pedido.data_pedido;      // data do pedido
    sheet.getCell('D23').value = pedido.valor_total;     // total

    // Itens a partir da linha 7 (ajuste se o seu template for diferente)
    let startRow = 7;
    itensRows.forEach((item, index) => {
      const row = sheet.getRow(startRow + index);
      row.getCell(2).value = item.codigo_produto;                   // codigo
      row.getCell(3).value = item.descricao_produto;                // descrição
      row.getCell(1).value = item.quantidade;                       // quantidade
      row.getCell(4).value = item.preco_unitario;                   // preço unitário
      row.getCell(5).value = item.quantidade * item.preco_unitario; // subtotal
      row.commit();
    });

    // 5) Gerar o buffer em memória
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } finally {
    connection.release();
  }
}

// Gera XLSX em memória + envia e-mail para o comercial com os dados do pedido
async function enviarEmailNovoPedido(pedidoId) {
  let pedido;

    const pass = process.env.SMTP_PASS || '';
    console.log('[EMAIL DEBUG - PASS RAW]', JSON.stringify(pass), 'len=', pass.length);
    for (let i = 0; i < pass.length; i++) {
      console.log('CHAR', i, '=>', JSON.stringify(pass[i]), 'code:', pass.charCodeAt(i));
    }

    console.log('[EMAIL DEBUG - NOVO PEDIDO]', {
    SMTP_USER: process.env.SMTP_USER,
    REPORT_FROM: process.env.REPORT_FROM,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    });

    console.log('[EMAIL DEBUG - SENHA]', {
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS_LEN: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 'undefined',
    });

  // 1) Buscar dados básicos do pedido para montar o corpo do e-mail
  const connection = await pool.getConnection();
  try {
    const [pedRows] = await connection.query(
      `SELECT p.*, f.nome AS funcionario_nome, f.setor, f.cracha
       FROM pedidos p
       JOIN funcionarios f ON f.id = p.funcionario_id
       WHERE p.id = ?`,
      [pedidoId]
    );

    if (pedRows.length === 0) {
      console.warn('Pedido não encontrado para envio de e-mail:', pedidoId);
      return;
    }

    pedido = pedRows[0];
  } catch (err) {
    console.error('Erro ao buscar dados do pedido para e-mail:', err);
    return;
  } finally {
    connection.release();
  }

  try {
    // 2) Gera o buffer da ficha usando o mesmo template
    const buffer = await gerarFichaXlsxBuffer(pedidoId);

    // 3) Transporter (SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const destinatario =
      process.env.NEW_ORDER_EMAIL || process.env.REPORT_EMAIL || process.env.SMTP_USER;

    const valorTotalFormatado = Number(pedido.valor_total || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const dataFmt = new Date(pedido.data_pedido).toLocaleString('pt-BR');

    const html = `
      <p><strong>Novo pedido recebido no e-commerce interno.</strong></p>
      <p>
        <strong>Pedido:</strong> #${pedido.id}<br/>
        <strong>Data:</strong> ${dataFmt}<br/>
        <strong>Colaborador:</strong> ${pedido.funcionario_nome} (${pedido.cracha})<br/>
        <strong>Setor:</strong> ${pedido.setor}<br/>
        <strong>Parcelas:</strong> ${pedido.numero_parcelas || 1}<br/>
        <strong>Aceita desconto em folha:</strong> ${
          pedido.aceita_desconto ? 'Sim' : 'Não'
        }<br/>
        <strong>Valor total:</strong> ${valorTotalFormatado}
      </p>

      <p>
        A ficha em XLSX segue anexada neste e-mail.<br/>
        Você também pode gerar novamente a ficha pelo painel admin, se necessário.
      </p>
    `;

    await transporter.sendMail({
      from: `"Requisições FGVTN" <${process.env.REPORT_FROM || process.env.SMTP_USER}>`,
      to: destinatario,
      subject: `Novo pedido #${pedido.id} - ${pedido.funcionario_nome}`,
      html,
      attachments: [
        {
          filename: `ficha_pedido_${pedido.id}.xlsx`,
          content: buffer,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });

    console.log('E-mail de novo pedido enviado para', destinatario);
  } catch (err) {
    console.error('Erro ao enviar e-mail de novo pedido:', err);
  }
}

module.exports = {
  criarPedido,
  listarPedidos,
  obterPedidoDetalhado,
  gerarFichaXlsx,
  enviarEmailNovoPedido,
};
