// frontend-admin/src/pages/OrdersPage.jsx
import React, { useEffect, useState } from 'react';
import AdminHeader from '../components/AdminHeader.jsx';
import {
  listarPedidos,
  obterPedidoDetalhado,
  baixarFichaXlsx,
  baixarRelatorioGeralPedidosXlsx,
  enviarRelatorioPedidosEmail,
} from '../services/api.js';

function OrdersPage({ token, onLogout }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [pedidoDetalhado, setPedidoDetalhado] = useState(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErro('');
        const data = await listarPedidos(token);
        setPedidos(data);
      } catch (err) {
        setErro(err.message || 'Erro ao listar pedidos.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleVerDetalhes(id) {
    try {
      setLoadingDetalhe(true);
      setErro('');
      const data = await obterPedidoDetalhado(id, token);
      setPedidoDetalhado(data);
    } catch (err) {
      setErro(err.message || 'Erro ao carregar detalhes do pedido.');
    } finally {
      setLoadingDetalhe(false);
    }
  }

  async function handleBaixarFicha(id) {
    try {
      setErro('');
      setMensagem('');
      await baixarFichaXlsx(id, token);
      setMensagem(`Ficha do pedido ${id} baixada com sucesso.`);
    } catch (err) {
      setErro(err.message || 'Erro ao baixar ficha.');
    }
  }

  async function handleBaixarRelatorioGeral() {
    try {
      setErro('');
      setMensagem('');
      await baixarRelatorioGeralPedidosXlsx(token);
      setMensagem('Relatório geral baixado com sucesso.');
    } catch (err) {
      setErro(err.message || 'Erro ao baixar relatório geral.');
    }
  }

  async function handleEnviarRelatorioEmail() {
    try {
      setErro('');
      setMensagem('');
      const resp = await enviarRelatorioPedidosEmail(token);
      setMensagem(resp.message || 'Relatório enviado por e-mail.');
    } catch (err) {
      setErro(err.message || 'Erro ao enviar relatório por e-mail.');
    }
  }

  return (
    <div className="app-container">
      <AdminHeader onLogout={onLogout} />
      <main>
        <div className="page-header">
          <h2>Pedidos</h2>
          <div className="page-actions">
            <button className="btn" type="button" onClick={handleBaixarRelatorioGeral}>
              Baixar relatório geral (XLSX)
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleEnviarRelatorioEmail}
            >
              Enviar relatório por e-mail
            </button>
          </div>
        </div>

        {loading && <p>Carregando pedidos...</p>}
        {erro && <div className="alert alert-error">{erro}</div>}
        {mensagem && <div className="alert alert-success">{mensagem}</div>}

        {!loading && !erro && (
          <div className="grid grid-2">
            <section className="card">
              <h3>Lista de pedidos</h3>
              {pedidos.length === 0 ? (
                <p>Nenhum pedido encontrado.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Data</th>
                      <th>Colaborador</th>
                      <th>Setor</th>
                      <th>Crachá</th>
                      <th>Status</th>
                      <th>Parcelas</th>
                      <th>Valor total</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.map((p) => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td>{new Date(p.data_pedido).toLocaleString('pt-BR')}</td>
                        <td>{p.funcionario_nome}</td>
                        <td>{p.setor}</td>
                        <td>{p.cracha}</td>
                        <td>{p.status}</td>
                        <td>{p.numero_parcelas || 1}</td>
                        <td>
                          {Number(p.valor_total || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </td>
                        <td>
                          <button
                            className="btn btn-small"
                            type="button"
                            onClick={() => handleVerDetalhes(p.id)}
                          >
                            Detalhes
                          </button>
                          <button
                            className="btn btn-small btn-secondary"
                            type="button"
                            onClick={() => handleBaixarFicha(p.id)}
                          >
                            Ficha XLSX
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="card">
              <h3>Detalhes do pedido</h3>
              {loadingDetalhe && <p>Carregando detalhes...</p>}
              {!loadingDetalhe && !pedidoDetalhado && <p>Selecione um pedido na lista.</p>}
              {!loadingDetalhe && pedidoDetalhado && (
                <div className="pedido-detalhes">
                  <h4>Pedido #{pedidoDetalhado.pedido.id}</h4>
                  <p>
                    <strong>Colaborador:</strong> {pedidoDetalhado.pedido.funcionario_nome} (
                    {pedidoDetalhado.pedido.cracha}) — {pedidoDetalhado.pedido.setor}
                  </p>
                  <p>
                    <strong>Data:</strong>{' '}
                    {new Date(pedidoDetalhado.pedido.data_pedido).toLocaleString('pt-BR')}
                  </p>
                  <p>
                    <strong>Status:</strong> {pedidoDetalhado.pedido.status}
                  </p>
                  <p>
                    <strong>Parcelas:</strong> {pedidoDetalhado.pedido.numero_parcelas || 1}
                  </p>
                  <p>
                    <strong>Valor total:</strong>{' '}
                    {Number(pedidoDetalhado.pedido.valor_total || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </p>

                  <h4>Itens</h4>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descrição</th>
                        <th>Quantidade</th>
                        <th>Preço unitário</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidoDetalhado.itens.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.codigo_produto}</td>
                          <td>{item.descricao_produto}</td>
                          <td>{item.quantidade}</td>
                          <td>
                            {Number(item.preco_unitario || 0).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </td>
                          <td>
                            {Number((item.preco_unitario || 0) * item.quantidade).toLocaleString(
                              'pt-BR',
                              {
                                style: 'currency',
                                currency: 'BRL',
                              },
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default OrdersPage;
