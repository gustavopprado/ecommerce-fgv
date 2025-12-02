const express = require('express');
const router = express.Router();
const { listarProdutos } = require('../controllers/products.controller');

router.get('/produtos', listarProdutos);

module.exports = router;
