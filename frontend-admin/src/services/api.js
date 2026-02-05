// frontend-admin/src/services/api.js
import axios from "axios";

const API_BASE_URL = `http://${window.location.hostname}:3001/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

function authHeaders(token, json = true) {
  const h = {};
  if (token) h.Authorization = `Bearer ${token}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export async function loginAdmin({ username, password }) {
  const resp = await api.post("/admin/login", { username, password });
  return resp.data.token;
}

export async function getDashboardData(token) {
  const resp = await api.get("/admin/dashboard", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.data;
}

export async function listarPedidos(token, filtros = {}) {
  const params = {};
  if (filtros.ano) params.ano = filtros.ano;
  if (filtros.mes) params.mes = filtros.mes;
  if (filtros.inicio) params.inicio = filtros.inicio;
  if (filtros.fim) params.fim = filtros.fim;

  const resp = await api.get("/pedidos", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return resp.data;
}

export async function obterPedidoDetalhado(id, token) {
  const resp = await api.get(`/pedidos/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.data;
}

export async function editarPedido(id, payload, token) {
  const resp = await api.put(`/pedidos/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.data;
}

export async function baixarFichaXlsx(id, token) {
  const resp = await fetch(`${API_BASE_URL}/pedidos/${id}/xlsx`, {
    headers: authHeaders(token, false),
  });
  if (!resp.ok) {
    let msg = "Erro ao baixar ficha.";
    try {
      const data = await resp.json();
      msg = data.error || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  const blob = await resp.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ficha_pedido_${id}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function baixarRelatorioGeralPedidosXlsx(token) {
  const resp = await fetch(`${API_BASE_URL}/admin/relatorios/pedidos-xlsx`, {
    headers: authHeaders(token, false),
  });
  if (!resp.ok) {
    let msg = "Erro ao baixar relatório.";
    try {
      const data = await resp.json();
      msg = data.error || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  const blob = await resp.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "relatorio_pedidos.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function enviarRelatorioPedidosEmail(token) {
  const resp = await fetch(`${API_BASE_URL}/admin/relatorios/pedidos-email`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify({}),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || "Erro ao enviar relatório por e-mail.");
  }
  return data;
}

export async function atualizarStatusPedido(id, status, token) {
  const resp = await api.patch(
    `/pedidos/${id}/status`,
    { status },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return resp.data;
}

export default api;
