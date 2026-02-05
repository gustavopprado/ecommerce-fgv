import axios from 'axios';

const API_BASE_URL = `http://${window.location.hostname}:3001/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

export async function getProdutos() {
  const resp = await api.get('/produtos');
  return resp.data;
}

export async function getEmployeeDataByBadge(cracha) {
  try {
    const resp = await api.get(`/pedidos/employee/${cracha}`);
    return resp.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Erro ao buscar dados do funcionário.');
  }
}

export async function criarPedido(pedidoData) {
  try {
    console.log('Enviando pedido para o backend:', pedidoData);
    const response = await api.post('/pedidos', pedidoData);
    console.log('Resposta do backend:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar pedido:', error.response || error.message || error);
    throw new Error(error.response?.data?.error || 'Erro ao criar pedido');
  }
}

export default api;
