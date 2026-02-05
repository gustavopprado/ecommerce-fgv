// backend/src/controllers/orders.controller.js
const pool = require("../config/db");
const ExcelJS = require("exceljs");
const path = require("path");
const nodemailer = require("nodemailer");

// =======================
// Helpers
// =======================
function isValidDateOnly(str) {
  return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function normalizeInt(v) {
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function calcTotalFromItens(itens) {
  return itens.reduce((acc, it) => {
    const qtd = Number(it.quantidade || 0);
    const preco = Number(it.preco_unitario || 0);
    return acc + qtd * preco;
  }, 0);
}

function validateItensEdicao(itens) {
  if (!Array.isArray(itens) || itens.length === 0) return "O pedido precisa ter ao menos um item.";

  for (let i = 0; i < itens.length; i++) {
    const it = itens[i];

    const codigo = (it.codigo_produto ?? "").toString().trim();
    const desc = (it.descricao_produto ?? "").toString().trim();

    const qtd = Number(it.quantidade);
    const preco = Number(it.preco_unitario);

    if (!codigo) return `Item #${i + 1}: codigo_produto é obrigatório.`;
    if (!desc) return `Item #${i + 1}: descricao_produto é obrigatória.`;
    if (!Number.isFinite(qtd) || qtd <= 0) return `Item #${i + 1}: quantidade inválida.`;
    if (!Number.isFinite(preco) || preco < 0) return `Item #${i + 1}: preco_unitario inválido.`;
  }

  return null;
}

// Monta WHERE (mesma regra do listarPedidos)
function buildWhereFromQuery(query) {
  const { inicio, fim, ano, mes } = query;

  const params = [];
  let where = "";

  // 1) Período específico (prioridade)
  if (inicio || fim) {
    if (inicio && !isValidDateOnly(inicio)) {
      return { error: "Parâmetro 'inicio' inválido (use YYYY-MM-DD)." };
    }
    if (fim && !isValidDateOnly(fim)) {
      return { error: "Parâmetro 'fim' inválido (use YYYY-MM-DD)." };
    }
    if (inicio && fim && fim < inicio) {
      return { error: "Período inválido: 'fim' não pode ser menor que 'inicio'." };
    }

    const parts = [];
    if (inicio) {
      parts.push("p.data_pedido >= ?");
      params.push(inicio);
    }
    if (fim) {
      parts.push("p.data_pedido < DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(fim);
    }

    where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
    return { where, params };
  }

  // 2) Ano/Mês (compatível)
  let anoNum = ano ? normalizeInt(ano) : null;
  let mesNum = mes ? normalizeInt(mes) : null;

  if (!anoNum && mesNum) anoNum = new Date().getFullYear();

  if (anoNum && (anoNum < 2000 || anoNum > 2100)) {
    return { error: "Parâmetro 'ano' inválido." };
  }
  if (mesNum && (mesNum < 1 || mesNum > 12)) {
    return { error: "Parâmetro 'mes' inválido (1..12)." };
  }

  if (anoNum && mesNum) {
    const start = `${anoNum}-${String(mesNum).padStart(2, "0")}-01`;
    const endDate = new Date(anoNum, mesNum, 1); // mês seguinte
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`;
    where = "WHERE p.data_pedido >= ? AND p.data_pedido < ?";
    params.push(start, end);
  } else if (anoNum) {
    const start = `${anoNum}-01-01`;
    const end = `${anoNum + 1}-01-01`;
    where = "WHERE p.data_pedido >= ? AND p.data_pedido < ?";
    params.push(start, end);
  }

  return { where, params };
}

// =======================
// POST /api/pedidos
// =======================
async function criarPedido(req, res) {
  const { nome, setor, cracha, aceitaDesconto, itens, numeroParcelas } = req.body;

  if (!nome || !setor || !cracha) {
    return res.status(400).json({ error: "Nome, setor e crachá são obrigatórios." });
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: "O pedido precisa ter ao menos um item." });
  }

  const aceitaFlag = !!aceitaDesconto;

  const valorTotal = itens.reduce((acc, item) => {
    const preco = Number(item.cost) || 0;
    const qtd = Number(item.quantity) || 0;
    return acc + preco * qtd;
  }, 0);

  // número de parcelas (1 a 10)
  let parcelas = parseInt(numeroParcelas, 10);
  if (Number.isNaN(parcelas) || parcelas < 1) parcelas = 1;
  if (parcelas > 10) parcelas = 10;

  // regra: abaixo de 100, só pode 1x
  if (valorTotal < 100 && parcelas > 1) {
    return res.status(400).json({
      error: "Pedidos abaixo de R$ 100,00 só podem ser parcelados em 1x.",
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // upsert funcionário por crachá
    const [funcRows] = await conn.query("SELECT id FROM funcionarios WHERE cracha = ?", [cracha]);

    let funcionarioId;

    if (funcRows.length > 0) {
      funcionarioId = funcRows[0].id;
      await conn.query("UPDATE funcionarios SET nome = ?, setor = ? WHERE id = ?", [
        nome,
        setor,
        funcionarioId,
      ]);
    } else {
      const [result] = await conn.query(
        "INSERT INTO funcionarios (nome, setor, cracha) VALUES (?, ?, ?)",
        [nome, setor, cracha]
      );
      funcionarioId = result.insertId;
    }

    // cria pedido
    const [pedidoResult] = await conn.query(
      "INSERT INTO pedidos (funcionario_id, valor_total, aceita_desconto, numero_parcelas) VALUES (?, ?, ?, ?)",
      [funcionarioId, valorTotal, aceitaFlag ? 1 : 0, parcelas]
    );

    const pedidoId = pedidoResult.insertId;

    // cria itens
    const values = itens.map((item) => [
      pedidoId,
      item.code,
      item.description,
      Number(item.quantity) || 0,
      Number(item.cost) || 0,
    ]);

    await conn.query(
      "INSERT INTO itens_pedido (pedido_id, codigo_produto, descricao_produto, quantidade, preco_unitario) VALUES ?",
      [values]
    );

    await conn.commit();

    // E-mail em background
    enviarEmailNovoPedido(pedidoId).catch((err) => {
      console.error("Erro ao enviar e-mail (novo pedido):", err);
    });

    return res.status(201).json({
      message: "Pedido criado com sucesso.",
      pedidoId,
      valorTotal,
    });
  } catch (err) {
    await conn.rollback();
    console.error("Erro ao criar pedido:", err);
    return res.status(500).json({ error: "Erro ao criar pedido." });
  } finally {
    conn.release();
  }
}

// =======================
// GET /api/pedidos (admin)
// suportando filtros:
// ?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
// ?ano=YYYY&mes=MM
// =======================
async function listarPedidos(req, res) {
  try {
    const built = buildWhereFromQuery(req.query);
    if (built.error) return res.status(400).json({ error: built.error });

    const { where, params } = built;

    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.data_pedido,
        p.valor_total,
        p.status,
        p.aceita_desconto,
        p.numero_parcelas,
        p.editado,
        p.editado_em,
        f.nome AS funcionario_nome,
        f.setor,
        f.cracha
      FROM pedidos p
      LEFT JOIN funcionarios f ON f.id = p.funcionario_id
      ${where}
      ORDER BY p.data_pedido DESC
      `,
      params
    );

    return res.json(rows);
  } catch (err) {
    console.error("Erro ao listar pedidos:", {
      message: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage,
    });
    return res.status(500).json({ error: "Erro ao listar pedidos." });
  }
}

// =======================
// GET /api/pedidos/:id (admin)
// =======================
async function obterPedidoDetalhado(req, res) {
  const { id } = req.params;

  try {
    const [pedRows] = await pool.query(
      `
      SELECT
        p.id,
        p.data_pedido,
        p.valor_total,
        p.status,
        p.aceita_desconto,
        p.numero_parcelas,
        p.editado,
        p.editado_em,
        p.observacoes_edicao,
        f.nome AS funcionario_nome,
        f.setor,
        f.cracha
      FROM pedidos p
      LEFT JOIN funcionarios f ON f.id = p.funcionario_id
      WHERE p.id = ?
    `,
      [id]
    );

    if (pedRows.length === 0) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    const pedido = pedRows[0];

    const [itensRows] = await pool.query(
      `
      SELECT codigo_produto, descricao_produto, quantidade, preco_unitario
      FROM itens_pedido
      WHERE pedido_id = ?
    `,
      [id]
    );

    return res.json({ pedido, itens: itensRows });
  } catch (err) {
    console.error("Erro ao obter pedido detalhado:", {
      message: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage,
    });
    return res.status(500).json({ error: "Erro ao obter pedido detalhado." });
  }
}

// =======================
// XLSX
// =======================
async function gerarFichaXlsx(req, res) {
  const pedidoId = req.params.id;

  try {
    const buffer = await gerarFichaXlsxBuffer(pedidoId);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=ficha_pedido_${pedidoId}.xlsx`);

    return res.send(buffer);
  } catch (error) {
    console.error("Erro ao gerar ficha XLSX:", error);
    return res.status(500).json({ error: "Erro ao gerar ficha XLSX." });
  }
}

async function gerarFichaXlsxBuffer(pedidoId) {
  const connection = await pool.getConnection();

  try {
    const [pedRows] = await connection.query(
      `
      SELECT p.*, f.nome AS funcionario_nome, f.setor, f.cracha
      FROM pedidos p
      LEFT JOIN funcionarios f ON f.id = p.funcionario_id
      WHERE p.id = ?
    `,
      [pedidoId]
    );

    if (pedRows.length === 0) throw new Error("Pedido não encontrado");

    const pedido = pedRows[0];

    const [itensRows] = await connection.query(
      `
      SELECT codigo_produto, descricao_produto, quantidade, preco_unitario
      FROM itens_pedido
      WHERE pedido_id = ?
    `,
      [pedidoId]
    );

    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, "..", "templates", "ficha_base.xlsx");
    await workbook.xlsx.readFile(templatePath);

    const sheet = workbook.getWorksheet(1);

    sheet.getCell("C3").value = pedido.funcionario_nome || "";
    sheet.getCell("A4").value = pedido.cracha || "";
    sheet.getCell("D4").value = pedido.setor || "";
    sheet.getCell("C4").value = pedido.numero_parcelas || 1;
    sheet.getCell("E4").value = pedido.data_pedido || null;
    sheet.getCell("D23").value = Number(pedido.valor_total || 0);

    const startRow = 7;
    itensRows.forEach((item, index) => {
      const row = sheet.getRow(startRow + index);
      const qtd = Number(item.quantidade || 0);
      const preco = Number(item.preco_unitario || 0);

      row.getCell(2).value = item.codigo_produto;
      row.getCell(3).value = item.descricao_produto;
      row.getCell(1).value = qtd;
      row.getCell(4).value = preco;
      row.getCell(5).value = qtd * preco;
      row.commit();
    });

    return await workbook.xlsx.writeBuffer();
  } finally {
    connection.release();
  }
}

// =======================
// E-mail: novo pedido
// =======================
async function enviarEmailNovoPedido(pedidoId) {
  let pedido;
  const connection = await pool.getConnection();

  try {
    const [pedRows] = await connection.query(
      `
      SELECT p.*, f.nome AS funcionario_nome, f.setor, f.cracha
      FROM pedidos p
      LEFT JOIN funcionarios f ON f.id = p.funcionario_id
      WHERE p.id = ?
    `,
      [pedidoId]
    );

    if (pedRows.length === 0) return;
    pedido = pedRows[0];
  } catch (err) {
    console.error("Erro ao buscar dados do pedido para e-mail:", err);
    return;
  } finally {
    connection.release();
  }

  try {
    const buffer = await gerarFichaXlsxBuffer(pedidoId);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const destinatario =
      process.env.NEW_ORDER_EMAIL || process.env.REPORT_EMAIL || process.env.SMTP_USER;

    if (!destinatario) return;

    const valorTotalFormatado = Number(pedido.valor_total || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const dataFmt = pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleString("pt-BR") : "";

    const html = `
      <p><strong>Novo pedido recebido no e-commerce interno.</strong></p>
      <p>
        <strong>Pedido:</strong> #${pedido.id}<br/>
        <strong>Data:</strong> ${dataFmt}<br/>
        <strong>Colaborador:</strong> ${pedido.funcionario_nome || ""} (${pedido.cracha || ""})<br/>
        <strong>Setor:</strong> ${pedido.setor || ""}<br/>
        <strong>Parcelas:</strong> ${pedido.numero_parcelas || 1}<br/>
        <strong>Aceita desconto em folha:</strong> ${pedido.aceita_desconto ? "Sim" : "Não"}<br/>
        <strong>Valor total:</strong> ${valorTotalFormatado}
      </p>
      <p>A ficha em XLSX segue anexada.</p>
    `;

    await transporter.sendMail({
      from: `"Requisições FGVTN" <${process.env.REPORT_FROM || process.env.SMTP_USER}>`,
      to: destinatario,
      subject: `Novo pedido #${pedido.id} - ${pedido.funcionario_nome || ""}`,
      html,
      attachments: [
        {
          filename: `ficha_pedido_${pedido.id}.xlsx`,
          content: buffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
  } catch (err) {
    console.error("Erro ao enviar e-mail de novo pedido:", err);
  }
}

// =======================
// E-mail: pedido editado
// =======================
async function enviarEmailPedidoEditado(pedidoId, observacoes) {
  let pedido;
  const connection = await pool.getConnection();

  try {
    const [pedRows] = await connection.query(
      `
      SELECT p.*, f.nome AS funcionario_nome, f.setor, f.cracha
      FROM pedidos p
      LEFT JOIN funcionarios f ON f.id = p.funcionario_id
      WHERE p.id = ?
    `,
      [pedidoId]
    );

    if (pedRows.length === 0) return;
    pedido = pedRows[0];
  } catch (err) {
    console.error("Erro ao buscar pedido para e-mail (editado):", err);
    return;
  } finally {
    connection.release();
  }

  try {
    const buffer = await gerarFichaXlsxBuffer(pedidoId);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const destinatario =
      process.env.NEW_ORDER_EMAIL || process.env.REPORT_EMAIL || process.env.SMTP_USER;

    if (!destinatario) return;

    const valorTotalFormatado = Number(pedido.valor_total || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const dataFmt = pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleString("pt-BR") : "";

    const obsHtml = observacoes
      ? `<p><strong>Observações da edição:</strong><br/>${String(observacoes).replace(/\n/g, "<br/>")}</p>`
      : `<p><em>Observações da edição: (não informado)</em></p>`;

    const html = `
      <p><strong>Pedido ALTERADO no e-commerce interno.</strong></p>
      <p>
        <strong>Pedido:</strong> #${pedido.id}<br/>
        <strong>Data do pedido:</strong> ${dataFmt}<br/>
        <strong>Colaborador:</strong> ${pedido.funcionario_nome || ""} (${pedido.cracha || ""})<br/>
        <strong>Setor:</strong> ${pedido.setor || ""}<br/>
        <strong>Valor total atual:</strong> ${valorTotalFormatado}<br/>
      </p>
      ${obsHtml}
      <p>A nova ficha em XLSX segue anexada.</p>
    `;

    await transporter.sendMail({
      from: `"Requisições FGVTN" <${process.env.REPORT_FROM || process.env.SMTP_USER}>`,
      to: destinatario,
      subject: `Pedido #${pedido.id} alterado - ${pedido.funcionario_nome || ""}`,
      html,
      attachments: [
        {
          filename: `ficha_pedido_${pedido.id}_ALTERADO.xlsx`,
          content: buffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
  } catch (err) {
    console.error("Erro ao enviar e-mail de pedido editado:", err);
  }
}

// =======================
// PUT /api/pedidos/:id (admin)
// =======================
async function editarPedido(req, res) {
  const { id } = req.params;
  const { itens, observacoes } = req.body;

  const errItens = validateItensEdicao(itens);
  if (errItens) return res.status(400).json({ error: errItens });

  const novoTotal = calcTotalFromItens(itens);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Confere se existe e pega valor atual
    const [pedRows] = await conn.query(`SELECT id, valor_total FROM pedidos WHERE id = ?`, [id]);
    if (pedRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    // 1) salva valor_total_original uma vez (se ainda não existir)
    // 2) aplica novo total
    // 3) marca como editado
    await conn.query(
      `
      UPDATE pedidos
      SET
        valor_total_original = IFNULL(valor_total_original, valor_total),
        valor_total = ?,
        editado = 1,
        editado_em = NOW(),
        observacoes_edicao = ?
      WHERE id = ?
      `,
      [novoTotal, observacoes || null, id]
    );

    // Substitui itens
    await conn.query(`DELETE FROM itens_pedido WHERE pedido_id = ?`, [id]);

    const values = itens.map((it) => [
      id,
      it.codigo_produto,
      it.descricao_produto,
      Number(it.quantidade) || 0,
      Number(it.preco_unitario) || 0,
    ]);

    await conn.query(
      `
      INSERT INTO itens_pedido (pedido_id, codigo_produto, descricao_produto, quantidade, preco_unitario)
      VALUES ?
      `,
      [values]
    );

    await conn.commit();

    // E-mail em background
    enviarEmailPedidoEditado(id, observacoes).catch((e) =>
      console.error("Erro ao enviar e-mail de pedido editado:", e)
    );

    return res.json({ message: "Pedido editado com sucesso.", id, valor_total: novoTotal });
  } catch (err) {
    await conn.rollback();
    console.error("Erro ao editar pedido:", err);
    return res.status(500).json({ error: "Erro ao editar pedido." });
  } finally {
    conn.release();
  }
}

// =======================
// PATCH /api/pedidos/:id/status
// =======================
async function atualizarStatusPedido(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["Pendente", "Concluido", "Cancelado"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Status inválido." });
  }

  try {
    const [result] = await pool.query("UPDATE pedidos SET status = ? WHERE id = ?", [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    return res.json({ message: "Status atualizado com sucesso." });
  } catch (err) {
    console.error("Erro ao atualizar status do pedido:", err);
    return res.status(500).json({ error: "Erro ao atualizar status." });
  }
}

// =======================
// GET /api/pedidos/employee/:cracha
// =======================
async function getEmployeeByBadge(req, res) {
  const cracha = parseInt(req.params.cracha, 10);

  if (Number.isNaN(cracha)) {
    return res.status(400).json({ error: "Crachá inválido." });
  }

  const sql = `
    SELECT cracha, nome_completo, descricao_centro_custo
    FROM funcionarios_json
    WHERE cracha = ?
  `;

  try {
    const [results] = await pool.query(sql, [cracha]);
    const employee = results[0];

    if (!employee) {
      return res.status(404).json({ error: "Funcionário não encontrado." });
    }

    return res.json({
      nome: employee.nome_completo,
      setor: employee.descricao_centro_custo,
      cracha: employee.cracha,
    });
  } catch (err) {
    console.error("Erro ao buscar funcionário no banco:", err);
    return res.status(500).json({ error: "Erro interno ao buscar dados do funcionário." });
  }
}

module.exports = {
  criarPedido,
  listarPedidos,
  obterPedidoDetalhado,
  gerarFichaXlsx,
  enviarEmailNovoPedido,
  atualizarStatusPedido,
  getEmployeeByBadge,
  editarPedido,
};
