// backend/src/routes/orders.routes.js
const express = require("express");
const router = express.Router();

const {
  criarPedido,
  listarPedidos,
  obterPedidoDetalhado,
  gerarFichaXlsx,
  atualizarStatusPedido,
  getEmployeeByBadge,
  editarPedido, // 🆕
} = require("../controllers/orders.controller");

const authAdmin = require("../middlewares/authAdmin");

// POST aberto para colaborador
router.post("/", criarPedido);

// ROTA ABERTA PARA COLABORADOR
router.get("/employee/:cracha", getEmployeeByBadge);

// Rotas abaixo só para admin
router.get("/", authAdmin, listarPedidos);
router.get("/:id", authAdmin, obterPedidoDetalhado);
router.get("/:id/xlsx", authAdmin, gerarFichaXlsx);

// Atualizar status do pedido
router.patch("/:id/status", authAdmin, atualizarStatusPedido);

// 🆕 Editar pedido
router.put("/:id", authAdmin, editarPedido);

module.exports = router;
