// frontend-colaborador/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Busca o catálogo mais recente de produtos.
 * GET /api/produtos
 */
export async function getProdutos() {
  const resp = await fetch(`${API_URL}/api/produtos`);
  if (!resp.ok) {
    throw new Error('Erro ao buscar produtos.');
  }
  return resp.json();
}

/**
 * Cria um novo pedido a partir dos dados do colaborador e dos itens do carrinho.
 * POST /api/pedidos
 */
export async function criarPedido(pedidoData) {
  try {
    console.log('Enviando pedido para o backend:', pedidoData);

    const response = await axios.post(`${API_URL}/api/pedidos`, pedidoData);

    console.log('Resposta do backend:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar pedido:', error.response || error.message || error);
    throw new Error('Erro ao criar pedido');
  }
}
