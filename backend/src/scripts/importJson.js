// backend/src/scripts/importJson.js
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'ecommerce',
});

function importarJson() {
  const filePath = path.join(__dirname, '../data/produtos.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Erro ao ler JSON do arquivo:', err);
      connection.end();
      return;
    }

    // (opcional) valida se o JSON é válido antes de inserir
    try {
      JSON.parse(data);
    } catch (e) {
      console.error('JSON inválido em produtos.json:', e);
      connection.end();
      return;
    }

    const sql = 'INSERT INTO produtos_json (json_data) VALUES (?)';

    connection.query(sql, [data], (err, results) => {
      if (err) {
        console.error('Erro ao inserir JSON no banco:', err);
      } else {
        console.log('JSON inserido com sucesso. ID:', results.insertId);
      }
      connection.end();
    });
  });
}

importarJson();
