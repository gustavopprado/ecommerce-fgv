// backend/src/controllers/admin.controller.js
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs");
const { sendMail } = require("../utils/email");
const pool = require("../config/db");

// POST /api/admin/login
async function loginAdmin(req, res) {
  try {
    const { username, password } = req.body;

    // 🔐 VERSÃO DE TESTE: usuário/senha fixos
    const adminUser = "admin";
    const adminPass = "Setav@*2025Painel";

    console.log("LOGIN ADMIN REQ:", { username, password });

    if (username !== adminUser || password !== adminPass) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    const secret = process.env.JWT_SECRET || "segredo_teste";
    const token = jwt.sign({ role: "admin", username }, secret, {
      expiresIn: "8h",
    });

    return res.json({ token });
  } catch (err) {
    console.error("Erro em loginAdmin:", err);
    return res.status(500).json({ error: "Erro interno ao efetuar login." });
  }
}

// ✅ GET /api/admin/dashboard?ano=YYYY&mes=MM
async function getDashboardData(req, res) {
  try {
    let { ano, mes } = req.query;

    ano = ano ? parseInt(String(ano), 10) : null;
    mes = mes ? parseInt(String(mes), 10) : null;

    // se veio mes sem ano, assume ano atual
    if (!ano && mes) ano = new Date().getFullYear();

    if (ano && (Number.isNaN(ano) || ano < 2000 || ano > 2100)) {
      return res.status(400).json({ error: "Parâmetro 'ano' inválido." });
    }
    if (mes && (Number.isNaN(mes) || mes < 1 || mes > 12)) {
      return res.status(400).json({ error: "Parâmetro 'mes' inválido (1..12)." });
    }

    let where = "";
    const params = [];

    if (ano && mes) {
      const start = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const endDate = new Date(ano, mes, 1); // próximo mês
      const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`;

      where = "WHERE p.data_pedido >= ? AND p.data_pedido < ?";
      params.push(start, end);
    } else if (ano) {
      const start = `${ano}-01-01`;
      const end = `${ano + 1}-01-01`;

      where = "WHERE p.data_pedido >= ? AND p.data_pedido < ?";
      params.push(start, end);
    }

    // totais
    const [[totais]] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_pedidos,
        COALESCE(SUM(p.valor_total), 0) AS total_valor,
        COUNT(DISTINCT p.funcionario_id) AS total_colaboradores
      FROM pedidos p
      ${where}
      `,
      params
    );

    // pedidos por status
    const [statusRows] = await pool.query(
      `
      SELECT p.status, COUNT(*) AS total
      FROM pedidos p
      ${where}
      GROUP BY p.status
      `,
      params
    );

    // pedidos por mês (YYYY-MM)
    const [mesesRows] = await pool.query(
      `
      SELECT
        DATE_FORMAT(p.data_pedido, '%Y-%m') AS mes,
        COUNT(*) AS total_pedidos,
        COALESCE(SUM(p.valor_total), 0) AS total_valor
      FROM pedidos p
      ${where}
      GROUP BY DATE_FORMAT(p.data_pedido, '%Y-%m')
      ORDER BY mes
      `,
      params
    );

    // top 10 produtos mais pedidos (respeita período via JOIN pedidos)
    const [topProdutosRows] = await pool.query(
      `
      SELECT
        ip.codigo_produto,
        ip.descricao_produto,
        SUM(ip.quantidade) AS total_quantidade,
        SUM(ip.quantidade * ip.preco_unitario) AS total_valor
      FROM itens_pedido ip
      INNER JOIN pedidos p ON p.id = ip.pedido_id
      ${where}
      GROUP BY ip.codigo_produto, ip.descricao_produto
      ORDER BY total_quantidade DESC
      LIMIT 10
      `,
      params
    );

    return res.json({
      totais,
      pedidosPorStatus: statusRows,
      pedidosPorMes: mesesRows,
      topProdutos: topProdutosRows,
    });
  } catch (err) {
    console.error("Erro em getDashboardData:", {
      message: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage,
    });
    return res.status(500).json({ error: "Erro ao carregar dados do dashboard." });
  }
}

// ====== (restante do seu arquivo continua igual) ======

async function gerarWorkbookPedidos() {
  const workbook = new ExcelJS.Workbook();

  const sheetPedidos = workbook.addWorksheet("Pedidos");
  sheetPedidos.addRow([
    "ID Pedido",
    "Data",
    "Nome Colaborador",
    "Setor",
    "Crachá",
    "Status",
    "Parcelas",
    "Valor Total",
  ]);

  const [pedidos] = await pool.query(`
    SELECT
      p.id,
      p.data_pedido,
      p.valor_total,
      p.status,
      p.numero_parcelas,
      f.nome AS funcionario_nome,
      f.setor,
      f.cracha
    FROM pedidos p
    LEFT JOIN funcionarios f ON f.id = p.funcionario_id
    ORDER BY p.data_pedido DESC
  `);

  pedidos.forEach((p) => {
    sheetPedidos.addRow([
      p.id,
      p.data_pedido,
      p.funcionario_nome || "",
      p.setor || "",
      p.cracha || "",
      p.status || "",
      p.numero_parcelas || 1,
      Number(p.valor_total || 0),
    ]);
  });

  const sheetItens = workbook.addWorksheet("Itens");
  sheetItens.addRow([
    "ID Pedido",
    "Código Produto",
    "Descrição",
    "Quantidade",
    "Preço Unitário",
    "Subtotal",
  ]);

  const [itens] = await pool.query(`
    SELECT
      ip.pedido_id,
      ip.codigo_produto,
      ip.descricao_produto,
      ip.quantidade,
      ip.preco_unitario
    FROM itens_pedido ip
    ORDER BY ip.pedido_id
  `);

  itens.forEach((item) => {
    const preco = Number(item.preco_unitario || 0);
    const qtd = Number(item.quantidade || 0);
    sheetItens.addRow([
      item.pedido_id,
      item.codigo_produto,
      item.descricao_produto,
      qtd,
      preco,
      preco * qtd,
    ]);
  });

  return workbook;
}

async function gerarRelatorioPedidosXlsx(req, res) {
  try {
    const workbook = await gerarWorkbookPedidos();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=relatorio_pedidos.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Erro ao gerar XLSX geral:", err);
    return res.status(500).json({ error: "Erro ao gerar XLSX geral." });
  }
}

async function enviarRelatorioPedidosEmail(req, res) {
  try {
    const workbook = await gerarWorkbookPedidos();
    const buffer = await workbook.xlsx.writeBuffer();

    const destinatario = process.env.REPORT_EMAIL || process.env.SMTP_USER;
    if (!destinatario) {
      return res.status(400).json({
        error: "Destinatário não configurado (REPORT_EMAIL ou SMTP_USER).",
      });
    }

    await sendMail({
      to: destinatario,
      subject: "Relatório de pedidos - E-commerce interno",
      html: `
        <p>Segue em anexo o relatório de pedidos do e-commerce interno em formato XLSX.</p>
        <p>Este e-mail foi gerado automaticamente pelo sistema.</p>
      `,
      attachments: [
        {
          filename: "relatorio_pedidos.xlsx",
          content: buffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    return res.json({ message: "Relatório enviado por e-mail com sucesso." });
  } catch (err) {
    console.error("Erro ao enviar relatório por e-mail:", err);
    return res.status(500).json({ error: "Erro ao enviar relatório por e-mail." });
  }
}

module.exports = {
  loginAdmin,
  getDashboardData,
  gerarRelatorioPedidosXlsx,
  enviarRelatorioPedidosEmail,
};
