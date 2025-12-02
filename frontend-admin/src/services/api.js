// frontend-admin/src/services/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function authHeaders(token, isJson = true) {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function loginAdmin({ username, password }) {
  const resp = await fetch(`${API_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Erro ao autenticar.');
  }
  return data.token;
}

export async function getDashboardData(token) {
  const resp = await fetch(`${API_URL}/api/admin/dashboard`, {
    headers: authHeaders(token, false),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Erro ao carregar dashboard.');
  }
  return data;
}

export async function listarPedidos(token) {
  const resp = await fetch(`${API_URL}/api/pedidos`, {
    headers: authHeaders(token, false),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Erro ao listar pedidos.');
  }
  return data;
}

export async function obterPedidoDetalhado(id, token) {
  const resp = await fetch(`${API_URL}/api/pedidos/${id}`, {
    headers: authHeaders(token, false),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Erro ao carregar detalhes do pedido.');
  }
  return data;
}

export async function baixarFichaXlsx(id, token) {
  const resp = await fetch(`${API_URL}/api/pedidos/${id}/xlsx`, {
    headers: authHeaders(token, false),
  });
  if (!resp.ok) {
    let msg = 'Erro ao baixar ficha.';
    try {
      const data = await resp.json();
      msg = data.error || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  const blob = await resp.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ficha_pedido_${id}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function baixarRelatorioGeralPedidosXlsx(token) {
  const resp = await fetch(`${API_URL}/api/admin/relatorios/pedidos-xlsx`, {
    headers: authHeaders(token, false),
  });
  if (!resp.ok) {
    let msg = 'Erro ao baixar relatório.';
    try {
      const data = await resp.json();
      msg = data.error || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  const blob = await resp.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'relatorio_pedidos.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function enviarRelatorioPedidosEmail(token) {
  const resp = await fetch(`${API_URL}/api/admin/relatorios/pedidos-email`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify({}),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Erro ao enviar relatório por e-mail.');
  }
  return data;
}
