// frontend-admin/src/pages/OrdersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import AdminHeader from "../components/AdminHeader.jsx";
import {
  listarPedidos,
  obterPedidoDetalhado,
  baixarFichaXlsx,
  baixarRelatorioGeralPedidosXlsx,
  enviarRelatorioPedidosEmail,
  atualizarStatusPedido,
  editarPedido,
} from "../services/api.js";

function toYYYYMMDD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeek(d) {
  const day = d.getDay(); // 0 dom, 1 seg
  const diff = (day === 0 ? -6 : 1) - day; // segunda
  const x = new Date(d);
  x.setDate(d.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(0, 0, 0, 0);
  return e;
}

function periodo1515BaseHoje() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = now.getDate();

  let start, end;
  if (day >= 15) {
    start = new Date(y, m, 15);
    end = new Date(y, m + 1, 15);
  } else {
    start = new Date(y, m - 1, 15);
    end = new Date(y, m, 15);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return { inicio: toYYYYMMDD(start), fim: toYYYYMMDD(end) };
}

function OrdersPage({ token, onLogout }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [pedidoDetalhado, setPedidoDetalhado] = useState(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // filtro status
  const [filtroStatus, setFiltroStatus] = useState("Pendente");
  const statusOptions = ["Pendente", "Concluido", "Cancelado", "Todos"];

  // filtro período
  const [inicioUI, setInicioUI] = useState("");
  const [fimUI, setFimUI] = useState("");
  const [periodoAplicado, setPeriodoAplicado] = useState({ inicio: "", fim: "" });

  // modal edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPedido, setEditPedido] = useState(null);
  const [editItens, setEditItens] = useState([]);
  const [editObs, setEditObs] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setErro("");
      setMensagem("");

      const filtros = {};
      if (periodoAplicado.inicio) filtros.inicio = periodoAplicado.inicio;
      if (periodoAplicado.fim) filtros.fim = periodoAplicado.fim;

      const data = await listarPedidos(token, filtros);
      setPedidos(Array.isArray(data) ? data : []);
    } catch (err) {
      setErro(err.message || "Erro ao listar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, periodoAplicado]);

  async function handleVerDetalhes(id) {
    try {
      setLoadingDetalhe(true);
      setErro("");
      const data = await obterPedidoDetalhado(id, token);
      setPedidoDetalhado(data);
      setShowModal(true);
    } catch (err) {
      setErro(err.message || "Erro ao carregar detalhes do pedido.");
    } finally {
      setLoadingDetalhe(false);
    }
  }

  function handleFecharModal() {
    setShowModal(false);
  }

  async function handleBaixarFicha(id) {
    try {
      setErro("");
      setMensagem("");
      await baixarFichaXlsx(id, token);
      setMensagem(`Ficha do pedido ${id} baixada com sucesso.`);
    } catch (err) {
      setErro(err.message || "Erro ao baixar ficha.");
    }
  }

  async function handleBaixarRelatorioGeral() {
    try {
      setErro("");
      setMensagem("");
      await baixarRelatorioGeralPedidosXlsx(token);
      setMensagem("Relatório geral baixado com sucesso.");
    } catch (err) {
      setErro(err.message || "Erro ao baixar relatório geral.");
    }
  }

  async function handleEnviarRelatorioEmail() {
    try {
      setErro("");
      setMensagem("");
      const resp = await enviarRelatorioPedidosEmail(token);
      setMensagem(resp.message || "Relatório enviado por e-mail.");
    } catch (err) {
      setErro(err.message || "Erro ao enviar relatório por e-mail.");
    }
  }

  async function handleChangeStatus(id, novoStatus) {
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status: novoStatus } : p)));

    try {
      await atualizarStatusPedido(id, novoStatus, token);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      alert("Erro ao atualizar status. Tente novamente.");
      load();
    }
  }

  // ===== filtros período =====
  function aplicarPeriodo() {
    if (inicioUI && fimUI && fimUI < inicioUI) {
      setErro("Período inválido: a data final não pode ser menor que a inicial.");
      return;
    }
    setPeriodoAplicado({ inicio: inicioUI || "", fim: fimUI || "" });
  }

  function limparPeriodo() {
    setInicioUI("");
    setFimUI("");
    setPeriodoAplicado({ inicio: "", fim: "" });
  }

  function setUltimos7Dias() {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);

    const inicio = toYYYYMMDD(start);
    const fim = toYYYYMMDD(end);

    setInicioUI(inicio);
    setFimUI(fim);
    setPeriodoAplicado({ inicio, fim });
  }

  function setSemanaAtual() {
    const now = new Date();
    const s = startOfWeek(now);
    const e = endOfWeek(now);

    const inicio = toYYYYMMDD(s);
    const fim = toYYYYMMDD(e);

    setInicioUI(inicio);
    setFimUI(fim);
    setPeriodoAplicado({ inicio, fim });
  }

  function setPeriodo1515() {
    const { inicio, fim } = periodo1515BaseHoje();
    setInicioUI(inicio);
    setFimUI(fim);
    setPeriodoAplicado({ inicio, fim });
  }

  // ===== filtro status =====
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtroStatus === "Todos") return true;
      return p.status === filtroStatus;
    });
  }, [pedidos, filtroStatus]);

  // ===== edição =====
  async function handleAbrirEditar(id) {
    try {
      setErro("");
      setMensagem("");
      setSavingEdit(false);

      setLoadingDetalhe(true);
      const data = await obterPedidoDetalhado(id, token);

      setEditPedido(data.pedido);
      setEditObs(data.pedido?.observacoes_edicao || "");
      setEditItens(
        (data.itens || []).map((it) => ({
          codigo_produto: it.codigo_produto ?? "",
          descricao_produto: it.descricao_produto ?? "",
          quantidade: Number(it.quantidade ?? 1),
          preco_unitario: Number(it.preco_unitario ?? 0),
        }))
      );

      setShowEditModal(true);
    } catch (err) {
      setErro(err.message || "Erro ao abrir edição do pedido.");
    } finally {
      setLoadingDetalhe(false);
    }
  }

  function fecharEditModal() {
    setShowEditModal(false);
    setEditPedido(null);
    setEditItens([]);
    setEditObs("");
    setSavingEdit(false);
  }

  function atualizarItem(idx, campo, valor) {
    setEditItens((prev) => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }

  function removerItem(idx) {
    setEditItens((prev) => prev.filter((_, i) => i !== idx));
  }

  function adicionarItem() {
    setEditItens((prev) => [
      ...prev,
      { codigo_produto: "", descricao_produto: "", quantidade: 1, preco_unitario: 0 },
    ]);
  }

  const totalEdit = useMemo(() => {
    return editItens.reduce((acc, it) => {
      const qtd = Number(it.quantidade || 0);
      const preco = Number(it.preco_unitario || 0);
      return acc + qtd * preco;
    }, 0);
  }, [editItens]);

  async function salvarEdicao() {
    if (!editPedido?.id) return;

    if (!editItens.length) {
      setErro("O pedido precisa ter ao menos um item.");
      return;
    }

    setSavingEdit(true);
    setErro("");
    setMensagem("");

    try {
      await editarPedido(
        editPedido.id,
        {
          itens: editItens,
          observacoes: editObs || null,
        },
        token
      );

      setMensagem(
        `Pedido #${editPedido.id} editado com sucesso. Uma nova ficha foi enviada por e-mail.`
      );
      fecharEditModal();
      await load();
    } catch (err) {
      setErro(err.message || "Erro ao salvar edição do pedido.");
    } finally {
      setSavingEdit(false);
    }
  }

  const badgeStyle = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: "#ffe9a8",
    color: "#3d3d3d",
  };

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
            <button className="btn btn-secondary" type="button" onClick={handleEnviarRelatorioEmail}>
              Enviar relatório por e-mail
            </button>
          </div>
        </div>

        {loading && <p>Carregando pedidos...</p>}
        {erro && <div className="alert alert-error">{erro}</div>}
        {mensagem && <div className="alert alert-success">{mensagem}</div>}

        {!loading && !erro && (
          <section className="card">
            {/* FILTRO POR PERÍODO */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontWeight: 600 }}>Início</label>
                <input
                  type="date"
                  value={inicioUI}
                  onChange={(e) => setInicioUI(e.target.value)}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontWeight: 600 }}>Fim</label>
                <input
                  type="date"
                  value={fimUI}
                  onChange={(e) => setFimUI(e.target.value)}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                />
              </div>

              <button className="btn" type="button" onClick={aplicarPeriodo}>
                Aplicar período
              </button>

              <button className="btn btn-secondary" type="button" onClick={limparPeriodo}>
                Limpar período
              </button>

              <button className="btn btn-secondary" type="button" onClick={setUltimos7Dias}>
                Últimos 7 dias
              </button>

              <button className="btn btn-secondary" type="button" onClick={setSemanaAtual}>
                Esta semana
              </button>

              <button className="btn btn-secondary" type="button" onClick={setPeriodo1515}>
                15 → 15
              </button>
            </div>

            {/* FILTRO STATUS */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15 }}>
              <h3 style={{ margin: 0 }}>Filtro de Status:</h3>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              {periodoAplicado.inicio || periodoAplicado.fim ? (
                <span style={{ opacity: 0.8 }}>
                  Período: <strong>{periodoAplicado.inicio || "—"}</strong> até{" "}
                  <strong>{periodoAplicado.fim || "—"}</strong>
                </span>
              ) : null}
            </div>

            {pedidosFiltrados.length === 0 ? (
              <p>Nenhum pedido encontrado com o status "{filtroStatus}".</p>
            ) : (
              <div className="table-responsive">
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
                      <th className="col-acoes">Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pedidosFiltrados.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span>{p.id}</span>
                            {p.editado ? <span style={badgeStyle}>Editado</span> : null}
                          </div>
                        </td>

                        <td>{new Date(p.data_pedido).toLocaleString("pt-BR")}</td>
                        <td>{p.funcionario_nome}</td>
                        <td>{p.setor}</td>
                        <td>{p.cracha}</td>

                        <td>
                          <select
                            className="status-select"
                            value={p.status}
                            onChange={(e) => handleChangeStatus(p.id, e.target.value)}
                          >
                            <option value="Pendente">Pendente</option>
                            <option value="Concluido">Concluído</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </td>

                        <td>{p.numero_parcelas || 1}</td>

                        <td>
                          {Number(p.valor_total || 0).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>

                        <td className="col-acoes">
                          <div className="table-actions">
                            <button className="btn btn-small" type="button" onClick={() => handleVerDetalhes(p.id)}>
                              Detalhes
                            </button>

                            <button className="btn btn-small btn-secondary" type="button" onClick={() => handleBaixarFicha(p.id)}>
                              Ficha XLSX
                            </button>

                            <button className="btn btn-small" type="button" onClick={() => handleAbrirEditar(p.id)}>
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* MODAL DE DETALHES */}
        {showModal && pedidoDetalhado && (
          <div className="modal-backdrop" onClick={handleFecharModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Detalhes do pedido #{pedidoDetalhado.pedido.id}</h3>
                <button type="button" className="modal-close-btn" onClick={handleFecharModal}>
                  ✕
                </button>
              </div>

              {loadingDetalhe ? (
                <p>Carregando detalhes...</p>
              ) : (
                <div className="modal-body">
                  <p>
                    <strong>Colaborador:</strong> {pedidoDetalhado.pedido.funcionario_nome} (
                    {pedidoDetalhado.pedido.cracha}) — {pedidoDetalhado.pedido.setor}
                  </p>

                  <p>
                    <strong>Data:</strong>{" "}
                    {new Date(pedidoDetalhado.pedido.data_pedido).toLocaleString("pt-BR")}
                  </p>

                  <p>
                    <strong>Status:</strong> {pedidoDetalhado.pedido.status}
                  </p>

                  <p>
                    <strong>Parcelas:</strong> {pedidoDetalhado.pedido.numero_parcelas || 1}
                  </p>

                  <p>
                    <strong>Valor total:</strong>{" "}
                    {Number(pedidoDetalhado.pedido.valor_total || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>

                  {pedidoDetalhado.pedido.editado ? (
                    <p>
                      <strong>Alterações:</strong> <span style={badgeStyle}>Editado</span>{" "}
                      {pedidoDetalhado.pedido.editado_em
                        ? `em ${new Date(pedidoDetalhado.pedido.editado_em).toLocaleString("pt-BR")}`
                        : ""}
                    </p>
                  ) : null}

                  {pedidoDetalhado.pedido.observacoes_edicao ? (
                    <p>
                      <strong>Obs. edição:</strong> {pedidoDetalhado.pedido.observacoes_edicao}
                    </p>
                  ) : null}

                  <h4>Itens</h4>
                  <div className="table-responsive">
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
                              {Number(item.preco_unitario || 0).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                            <td>
                              {Number((item.preco_unitario || 0) * item.quantidade).toLocaleString(
                                "pt-BR",
                                { style: "currency", currency: "BRL" }
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleFecharModal}>
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL DE EDIÇÃO */}
        {showEditModal && editPedido && (
          <div className="modal-backdrop" onClick={fecharEditModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Editar pedido #{editPedido.id}</h3>
                <button type="button" className="modal-close-btn" onClick={fecharEditModal}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <p style={{ opacity: 0.85 }}>
                  <strong>Colaborador:</strong> {editPedido.funcionario_nome} ({editPedido.cracha}) —{" "}
                  {editPedido.setor}
                </p>

                <h4>Itens</h4>

                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descrição</th>
                        <th>Qtd</th>
                        <th>Preço</th>
                        <th>Subtotal</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      {editItens.map((it, idx) => {
                        const qtd = Number(it.quantidade || 0);
                        const preco = Number(it.preco_unitario || 0);
                        const subtotal = qtd * preco;

                        return (
                          <tr key={idx}>
                            <td>
                              <input
                                value={it.codigo_produto}
                                onChange={(e) => atualizarItem(idx, "codigo_produto", e.target.value)}
                                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                              />
                            </td>

                            <td>
                              <input
                                value={it.descricao_produto}
                                onChange={(e) => atualizarItem(idx, "descricao_produto", e.target.value)}
                                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="1"
                                value={it.quantidade}
                                onChange={(e) => atualizarItem(idx, "quantidade", Number(e.target.value))}
                                style={{ width: 90, padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.preco_unitario}
                                onChange={(e) => atualizarItem(idx, "preco_unitario", Number(e.target.value))}
                                style={{ width: 120, padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                              />
                            </td>

                            <td>
                              {Number(subtotal || 0).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>

                            <td>
                              <button className="btn btn-small btn-secondary" type="button" onClick={() => removerItem(idx)}>
                                Remover
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button className="btn btn-secondary" type="button" onClick={adicionarItem}>
                  + Adicionar item
                </button>

                <p style={{ marginTop: 12 }}>
                  <strong>Total recalculado:</strong>{" "}
                  {Number(totalEdit || 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>

                <div style={{ marginTop: 12 }}>
                  <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Observações (opcional)
                  </label>
                  <textarea
                    value={editObs}
                    onChange={(e) => setEditObs(e.target.value)}
                    rows={3}
                    style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
                    placeholder="Ex.: produto X sem estoque; substituído por Y aprovado pelo colaborador."
                  />
                </div>

                <div className="modal-footer" style={{ marginTop: 16, display: "flex", gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={fecharEditModal} disabled={savingEdit}>
                    Cancelar
                  </button>

                  <button type="button" className="btn" onClick={salvarEdicao} disabled={savingEdit}>
                    {savingEdit ? "Salvando..." : "Salvar edição"}
                  </button>
                </div>

                <p style={{ opacity: 0.75, marginTop: 10 }}>
                  Ao salvar, o pedido será marcado como <strong>Editado</strong> e uma nova ficha será enviada por e-mail.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default OrdersPage;
