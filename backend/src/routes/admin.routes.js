// backend/src/routes/admin.routes.js
const express = require('express');
const router = express.Router();

const authAdmin = require('../middlewares/authAdmin');
const {
  loginAdmin,
  getDashboardData,
  gerarRelatorioPedidosXlsx,
  enviarRelatorioPedidosEmail,
} = require('../controllers/admin.controller');

router.post('/login', loginAdmin);
router.get('/dashboard', authAdmin, getDashboardData);
router.get('/relatorios/pedidos-xlsx', authAdmin, gerarRelatorioPedidosXlsx);
router.post('/relatorios/pedidos-email', authAdmin, enviarRelatorioPedidosEmail);

module.exports = router;
