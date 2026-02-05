// frontend-admin/src/pages/DashboardPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import AdminHeader from "../components/AdminHeader.jsx";
import { getDashboardData, listarPedidos } from "../services/api.js";

const MESES = [
  { value: "", label: "Todos" },
  { value: "1", label: "Jan" },
  { value: "2", label: "Fev" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Abr" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Ago" },
  { value: "9", label: "Set" },
  { value: "10", label: "Out" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dez" },
];

function DashboardPage({ token, onLogout }) {
  const [data, setData] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  // ====== filtros (UI) ======
  const anoAtual = new Date().getFullYear();
  const [filtroAnoUI, setFiltroAnoUI] = useState(String(anoAtual));
  const [filtroMesUI, setFiltroMesUI] = useState(""); // '' = todos

  // ====== filtros (aplicados) ======
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    ano: String(anoAtual),
    mes: "",
  });

  // lista de anos (ajuste se quiser mais/menos)
  const anosOptions = useMemo(() => {
    const years = [];
    for (let y = anoAtual; y >= anoAtual - 6; y--) years.push(String(y));
    return years;
  }, [anoAtual]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErro("");

        const filtros = { ano: filtrosAplicados.ano };
        if (filtrosAplicados.mes) filtros.mes = filtrosAplicados.mes;

        const dashboardResp = await getDashboardData(token, filtros);
        const ordersResp = await listarPedidos(token, filtros);

        setData(dashboardResp);
        setAllOrders(Array.isArray(ordersResp) ? ordersResp : []);
      } catch (err) {
        setErro(err.message || "Erro ao carregar dashboard.");
      } finally {
        setLoading(false);
      }
    }

    if (token) load();
  }, [token, filtrosAplicados]);

  // ====== métricas corrigidas (sem Cancelado) ======
  const metricasCorrigidas = useMemo(() => {
    if (!allOrders || allOrders.length === 0) {
      return {
        total_pedidos_validos: 0,
        total_valor_valido: 0,
        total_colaboradores_validos: 0,
      };
    }

    const pedidosValidos = allOrders.filter((p) => p.status !== "Cancelado");

    const totalValorValido = pedidosValidos.reduce(
      (acc, p) => acc + Number(p.valor_total || 0),
      0
    );

    const colaboradoresUnicos = new Set(pedidosValidos.map((p) => p.cracha));
    const totalColaboradoresValidos = colaboradoresUnicos.size;

    return {
      total_pedidos_validos: pedidosValidos.length,
      total_valor_valido: totalValorValido,
      total_colaboradores_validos: totalColaboradoresValidos,
    };
  }, [allOrders]);

  const valorTotalFormatado = Number(
    metricasCorrigidas.total_valor_valido || 0
  ).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  function aplicarFiltros() {
    setFiltrosAplicados({
      ano: filtroAnoUI,
      mes: filtroMesUI,
    });
  }

  function limparFiltros() {
    const novoAno = String(anoAtual);
    setFiltroAnoUI(novoAno);
    setFiltroMesUI("");
    setFiltrosAplicados({ ano: novoAno, mes: "" });
  }

  const periodoLabel = useMemo(() => {
    const mes = filtrosAplicados.mes ? String(filtrosAplicados.mes).padStart(2, "0") : "todos";
    return `${filtrosAplicados.ano} / ${mes}`;
  }, [filtrosAplicados]);

  return (
    <div className="app-container">
      <AdminHeader onLogout={onLogout} />

      <main>
        <h2>Dashboard</h2>

        {/* ✅ FILTROS: sempre aparecem */}
        <section className="card" style={{ marginBottom: 16 }}>
          <h3>Filtros</h3>

          <div className="grid grid-3" style={{ alignItems: "end" }}>
            <div>
              <label>Ano</label>
              <select
                className="input"
                value={filtroAnoUI}
                onChange={(e) => setFiltroAnoUI(e.target.value)}
              >
                {anosOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Mês</label>
              <select
                className="input"
                value={filtroMesUI}
                onChange={(e) => setFiltroMesUI(e.target.value)}
              >
                {MESES.map((m) => (
                  <option key={m.value || "all"} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={aplicarFiltros}
                style={{
                  background: "#7bc258",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                Aplicar
              </button>

              <button
                type="button"
                className="btn"
                onClick={limparFiltros}
                style={{
                  background: "#6d6e71",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                Limpar
              </button>
            </div>
          </div>

          <p style={{ marginTop: 10, opacity: 0.8 }}>
            Período aplicado: <strong>{periodoLabel}</strong>
          </p>
        </section>

        {loading && <p>Carregando...</p>}
        {erro && <div className="alert alert-error">{erro}</div>}

        {!loading && !erro && data && (
          <>
            <section className="grid grid-3">
              <div className="card">
                <h3>Total de pedidos</h3>
                <p className="metric">{metricasCorrigidas.total_pedidos_validos ?? 0}</p>
              </div>

              <div className="card">
                <h3>Valor total</h3>
                <p className="metric">{valorTotalFormatado}</p>
              </div>

              <div className="card">
                <h3>Colaboradores únicos</h3>
                <p className="metric">{metricasCorrigidas.total_colaboradores_validos ?? 0}</p>
              </div>
            </section>

            <section className="grid grid-2">
              <div className="card">
                <h3>Pedidos por status</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pedidosPorStatus
                      ?.filter((s) => s.status !== "Cancelado")
                      .map((s) => (
                        <tr key={s.status}>
                          <td>{s.status}</td>
                          <td>{s.total}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h3>Pedidos por mês</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Qtd</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pedidosPorMes?.map((m) => (
                      <tr key={m.mes}>
                        <td>{m.mes}</td>
                        <td>{m.total_pedidos}</td>
                        <td>
                          {Number(m.total_valor || 0).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h3>Top 10 produtos</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Quantidade</th>
                    <th>Valor total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProdutos?.map((p) => (
                    <tr key={p.codigo_produto}>
                      <td>{p.codigo_produto}</td>
                      <td>{p.descricao_produto}</td>
                      <td>{p.total_quantidade}</td>
                      <td>
                        {Number(p.total_valor || 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default DashboardPage;
