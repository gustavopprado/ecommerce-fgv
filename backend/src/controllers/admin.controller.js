// backend/src/controllers/admin.controller.js
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const { sendMail } = require('../utils/email');
const pool = require('../config/db'); // seu arquivo db.js

// POST /api/admin/login
async function loginAdmin(req, res) {
  const { username, password } = req.body;

  // 🔐 VERSÃO DE TESTE: usuário/senha fixos
  const adminUser = 'admin';
  const adminPass = 'Setav@*2025Painel'; // exatamente igual ao que você quer

  console.log('LOGIN ADMIN REQ:', { username, password });

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }

  const secret = process.env.JWT_SECRET || 'segredo_teste';
  const token = jwt.sign({ role: 'admin', username }, secret, {
    expiresIn: '8h',
  });

  return res.json({ token });
}

// GET /api/admin/dashboard
async function getDashboardData(req, res) {
  try {
    // total de pedidos, total de valor, total de colaboradores
    const [[totais]] = await pool.query(
      `SELECT 
         COUNT(*) AS total_pedidos,
         COALESCE(SUM(valor_total),0) AS total_valor,
         COUNT(DISTINCT funcionario_id) AS total_colaboradores
       FROM pedidos`
    );

    // pedidos por status
    const [statusRows] = await pool.query(
      `SELECT status, COUNT(*) AS total
       FROM pedidos
       GROUP BY status`
    );

    // pedidos por mês (YYYY-MM)
    const [mesesRows] = await pool.query(
      `SELECT DATE_FORMAT(data_pedido, '%Y-%m') AS mes,
              COUNT(*) AS total_pedidos,
              COALESCE(SUM(valor_total),0) AS total_valor
       FROM pedidos
       GROUP BY DATE_FORMAT(data_pedido, '%Y-%m')
       ORDER BY mes`
    );

    // top 10 produtos mais pedidos
    const [topProdutosRows] = await pool.query(
      `SELECT 
         codigo_produto,
         descricao_produto,
         SUM(quantidade) AS total_quantidade,
         SUM(quantidade * preco_unitario) AS total_valor
       FROM itens_pedido
       GROUP BY codigo_produto, descricao_produto
       ORDER BY total_quantidade DESC
       LIMIT 10`
    );

    return res.json({
      totais,
      pedidosPorStatus: statusRows,
      pedidosPorMes: mesesRows,
      topProdutos: topProdutosRows,
    });
  } catch (err) {
    console.error('Erro em getDashboardData:', err);
    return res.status(500).json({ error: 'Erro ao carregar dados do dashboard.' });
  }
}

// Gera um XLSX com todos pedidos + itens
async function gerarWorkbookPedidos() {
  const workbook = new ExcelJS.Workbook();

  // Sheet de pedidos
  const sheetPedidos = workbook.addWorksheet('Pedidos');
  sheetPedidos.addRow([
    'ID Pedido',
    'Data',
    'Nome Colaborador',
    'Setor',
    'Crachá',
    'Status',
    'Parcelas',
    'Valor Total',
  ]);

  const [pedidos] = await pool.query(
    `SELECT p.id, p.data_pedido, p.valor_total, p.status, p.numero_parcelas,
            f.nome AS funcionario_nome, f.setor, f.cracha
     FROM pedidos p
     JOIN funcionarios f ON f.id = p.funcionario_id
     ORDER BY p.data_pedido DESC`
  );

  pedidos.forEach((p) => {
    sheetPedidos.addRow([
      p.id,
      p.data_pedido,
      p.funcionario_nome,
      p.setor,
      p.cracha,
      p.status,
      p.numero_parcelas || 1,
      Number(p.valor_total || 0),
    ]);
  });

  // Sheet de itens
  const sheetItens = workbook.addWorksheet('Itens');
  sheetItens.addRow([
    'ID Pedido',
    'Código Produto',
    'Descrição',
    'Quantidade',
    'Preço Unitário',
    'Subtotal',
  ]);

  const [itens] = await pool.query(
    `SELECT ip.pedido_id, ip.codigo_produto, ip.descricao_produto,
            ip.quantidade, ip.preco_unitario
     FROM itens_pedido ip
     ORDER BY ip.pedido_id`
  );

  itens.forEach((item) => {
    sheetItens.addRow([
      item.pedido_id,
      item.codigo_produto,
      item.descricao_produto,
      item.quantidade,
      Number(item.preco_unitario || 0),
      Number(item.preco_unitario || 0) * item.quantidade,
    ]);
  });

  return workbook;
}

// GET /api/admin/relatorios/pedidos-xlsx
async function gerarRelatorioPedidosXlsx(req, res) {
  try {
    const workbook = await gerarWorkbookPedidos();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=relatorio_pedidos.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erro ao gerar XLSX geral:', err);
    return res.status(500).json({ error: 'Erro ao gerar XLSX geral.' });
  }
}

// POST /api/admin/relatorios/pedidos-email
async function enviarRelatorioPedidosEmail(req, res) {
  try {
    // 1) Gera o workbook igual ao download
    const workbook = await gerarWorkbookPedidos();
    const buffer = await workbook.xlsx.writeBuffer();

    // 2) Define destinatário
    const destinatario = process.env.REPORT_EMAIL || process.env.SMTP_USER;

    // 3) Envia usando o helper
    await sendMail({
      to: destinatario,
      subject: 'Relatório de pedidos - E-commerce interno',
      html: `
        <p>Segue em anexo o relatório de pedidos do e-commerce interno em formato XLSX.</p>
        <p>Este e-mail foi gerado automaticamente pelo sistema.</p>
      `,
      attachments: [
        {
          filename: 'relatorio_pedidos.xlsx',
          content: buffer,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });

    return res.json({ message: 'Relatório enviado por e-mail com sucesso.' });
  } catch (err) {
    console.error('Erro ao enviar relatório por e-mail:', err);
    return res.status(500).json({ error: 'Erro ao enviar relatório por e-mail.' });
  }
}

module.exports = {
  loginAdmin,
  getDashboardData,
  gerarRelatorioPedidosXlsx,
  enviarRelatorioPedidosEmail,
};
