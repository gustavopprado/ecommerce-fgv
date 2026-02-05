const express = require('express');
const path = require('path');

const app = express();
const PORT = 4173;

const distPath = path.join(__dirname, 'dist');

// arquivos estáticos
app.use(express.static(distPath));

// fallback SPA (todas as rotas voltam pro index.html)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend COLABORADOR rodando em http://localhost:${PORT}`);
});
