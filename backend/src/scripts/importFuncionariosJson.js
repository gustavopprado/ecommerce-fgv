// backend/src/scripts/importFuncionariosJson.js
const mysql = require('mysql2/promise'); // 🆕 Usaremos a versão promise do mysql2
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo JSON de funcionários
const filePath = path.join(__dirname, '../data/infos_funcionarios_trim.json'); 
const DB_NAME = process.env.DB_NAME || 'ecommerce';
const TABLE_NAME = 'funcionarios_json';

async function importarFuncionariosJson() {
    let connection;
    try {
        // 1. Conectar ao banco de dados usando promessas
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            database: DB_NAME,
        });

        console.log(`Conectado ao banco de dados: ${DB_NAME}`);

        // 2. Ler e parsear o JSON (síncrono, como no seu original)
        const data = fs.readFileSync(filePath, 'utf8');
        const funcionarios = JSON.parse(data);
        
        if (funcionarios.length === 0) {
            console.log('Nenhum funcionário para importar.');
            return;
        }

        // 3. Limpar a tabela
        const truncateSql = `TRUNCATE TABLE ${TABLE_NAME}`; 
        await connection.execute(truncateSql);
        console.log(`Tabela ${TABLE_NAME} limpa com sucesso.`);

        // 4. Mapear os dados para inserção
        const insertSql = `
            INSERT INTO ${TABLE_NAME} (cracha, nome_completo, centro_custo, descricao_centro_custo) 
            VALUES ?`;
            
        const values = funcionarios.map(f => [
            f['Crachá'],
            f['Nome Completo'],
            f['Centro de Custo'],
            f['Descrição Centro de Custo']
        ]);
        
        // 5. Inserir os dados (inserção em massa)
        const [results] = await connection.query(insertSql, [values]);

        console.log(`Importação de funcionários concluída. Linhas afetadas: ${results.affectedRows}`);
        
    } catch (error) {
        console.error('--- ERRO FATAL DURANTE A IMPORTAÇÃO DE FUNCIONÁRIOS ---');
        console.error(error);
        if (error.code === 'ENOENT') {
             console.error(`Verifique se o arquivo JSON existe no caminho: ${filePath}`);
        }
        
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Executar a função e capturar erros no nível superior
importarFuncionariosJson().catch(err => {
    console.error('Erro de execução do script:', err);
});