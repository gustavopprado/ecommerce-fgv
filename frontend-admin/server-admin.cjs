const express = require('express');
const path = require('path');

const app = express();
const PORT = 4174;

const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

// Catch-all sem usar '*'
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend ADMIN rodando em http://localhost:${PORT}`);
});
