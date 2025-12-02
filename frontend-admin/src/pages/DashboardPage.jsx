// frontend-admin/src/pages/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import AdminHeader from '../components/AdminHeader.jsx';
import { getDashboardData } from '../services/api.js';

function DashboardPage({ token, onLogout }) {
  const [data, setData] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErro('');
        const resp = await getDashboardData(token);
        setData(resp);
      } catch (err) {
        setErro(err.message || 'Erro ao carregar dashboard.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  return (
    <div className="app-container">
      <AdminHeader onLogout={onLogout} />
      <main>
        <h2>Dashboard</h2>

        {loading && <p>Carregando...</p>}
        {erro && <div className="alert alert-error">{erro}</div>}

        {!loading && !erro && data && (
          <>
            <section className="grid grid-3">
              <div className="card">
                <h3>Total de pedidos</h3>
                <p className="metric">{data.totais?.total_pedidos ?? 0}</p>
              </div>
              <div className="card">
                <h3>Valor total</h3>
                <p className="metric">
                  {Number(data.totais?.total_valor || 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
              <div className="card">
                <h3>Colaboradores únicos</h3>
                <p className="metric">{data.totais?.total_colaboradores ?? 0}</p>
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
                    {data.pedidosPorStatus?.map((s) => (
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
                          {Number(m.total_valor || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
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
                        {Number(p.total_valor || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
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
