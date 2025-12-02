const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ecommerce',
});

function importarJson() {
  const filePath = path.join(__dirname, '../data/produtos.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Erro ao ler o arquivo JSON:', err);
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
