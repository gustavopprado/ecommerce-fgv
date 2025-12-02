// backend/src/routes/orders.routes.js
const express = require('express');
const router = express.Router();

const {
  criarPedido,
  listarPedidos,
  obterPedidoDetalhado,
  gerarFichaXlsx,
} = require('../controllers/orders.controller');

const authAdmin = require('../middlewares/authAdmin');

// POST aberto para colaborador
router.post('/', criarPedido);

// Rotas abaixo só para admin
router.get('/', authAdmin, listarPedidos);
router.get('/:id', authAdmin, obterPedidoDetalhado);
router.get('/:id/xlsx', authAdmin, gerarFichaXlsx);

module.exports = router;
