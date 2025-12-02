// backend/src/controllers/products.controller.js
const pool = require('../config/db');

async function listarProdutos(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT json_data FROM produtos_json ORDER BY data_atualizacao DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum catálogo encontrado.' });
    }

    let produtos = rows[0].json_data;

    // Se vier como Buffer, converte pra string
    if (Buffer.isBuffer(produtos)) {
      produtos = produtos.toString('utf8');
    }

    // Se for string, faz o parse; se já for objeto/array, mantém
    if (typeof produtos === 'string') {
      produtos = JSON.parse(produtos);
    }

    return res.json(produtos);
  } catch (err) {
    console.error('Erro ao buscar produtos:', err);
    return res.status(500).json({ error: 'Erro ao buscar produtos.' });
  }
}

module.exports = { listarProdutos };
