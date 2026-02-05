// backend/src/controllers/products.controller.js
const pool = require('../config/db');

// GET /api/produtos
async function listarProdutos(req, res) {
  try {
    // Pega sempre o catálogo mais recente pelo ID
    const [rows] = await pool.query(
      'SELECT json_data FROM produtos_json ORDER BY id DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum catálogo encontrado.' });
    }

    let data = rows[0].json_data;
    let produtos;

    // Se vier Buffer (algumas configs do mysql2)
    if (Buffer.isBuffer(data)) {
      data = data.toString('utf8');
    }

    if (typeof data === 'string') {
      // String JSON > parse normal
      try {
        produtos = JSON.parse(data);
      } catch (e) {
        console.error(
          'Conteúdo de json_data não é um JSON válido (string):',
          e
        );
        return res
          .status(500)
          .json({ error: 'Catálogo inválido armazenado no banco.' });
      }
    } else if (typeof data === 'object' && data !== null) {
      // Já é objeto JS (coluna JSON do MySQL)
      produtos = data;
    } else {
      console.error('Tipo inesperado em json_data:', typeof data, data);
      return res
        .status(500)
        .json({ error: 'Formato inesperado do catálogo no banco.' });
    }

    return res.json(produtos);
  } catch (err) {
    console.error('Erro ao listar produtos:', err);
    return res.status(500).json({ error: 'Erro ao listar produtos.' });
  }
}

module.exports = {
  listarProdutos,
};
