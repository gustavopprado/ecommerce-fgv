// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const productsRoutes = require('./routes/products.routes');
const ordersRoutes = require('./routes/orders.routes');
const adminRoutes = require('./routes/admin.routes');
const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  override: true,
});

// Safety: remove espaços/brancos da senha caso ainda venha sujo
if (process.env.SMTP_PASS) {
  const raw = process.env.SMTP_PASS;
  process.env.SMTP_PASS = raw.replace(/\s+/g, '');
  console.log('[ENV FIX]', { RAW_LEN: raw.length, FIXED_LEN: process.env.SMTP_PASS.length });
}


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend OK');
});

app.use('/api', productsRoutes);          // /api/produtos
app.use('/api/pedidos', ordersRoutes);   // /api/pedidos...
app.use('/api/admin', adminRoutes);      // /api/admin/login, /dashboard, relatorios

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
