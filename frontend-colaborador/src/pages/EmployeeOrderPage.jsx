// frontend-colaborador/src/pages/EmployeeOrderPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { getProdutos, criarPedido, getEmployeeDataByBadge } from '../services/api';
import Header from '../components/Header';
import ProductList from '../components/ProductList';
import Cart from '../components/Cart';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Lottie
import Lottie from 'react-lottie';
import successAnimationData from '../assets/success-animation.json';

const defaultOptions = {
  loop: true,
  autoplay: true,
  animationData: successAnimationData,
  rendererSettings: {
    preserveAspectRatio: 'xMidYMid slice',
  },
};

const EmployeeOrderPage = () => {
  const [nome, setNome] = useState('');
  const [setor, setSetor] = useState('');
  const [cracha, setCracha] = useState('');
  const [aceitaDesconto, setAceitaDesconto] = useState(false);

  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [carrinho, setCarrinho] = useState([]);

  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [loadingPedido, setLoadingPedido] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const [numeroParcelas, setNumeroParcelas] = useState(1);

  // dados do pedido final para a tela de resumo
  const [pedidoFinal, setPedidoFinal] = useState(null);

  // Referência para o elemento que será transformado em PDF
  const resumoRef = useRef(null);

  useEffect(() => {
    async function carregar() {
      try {
        setLoadingProdutos(true);
        const data = await getProdutos();

        // Filtra produtos com preço 0
        const produtosFiltrados = data.filter((produto) => produto.cost && produto.cost > 0);
        setProdutos(produtosFiltrados);
      } catch (e) {
        console.error(e);
        setErro('Erro ao carregar produtos.');
      } finally {
        setLoadingProdutos(false);
      }
    }
    carregar();
  }, []);

  // Busca funcionário ao mudar crachá
  useEffect(() => {
    if (cracha && String(cracha).length >= 3) {
      async function fetchEmployee() {
        try {
          setErro('');
          const data = await getEmployeeDataByBadge(cracha);
          setNome(data.nome || '');
          setSetor(data.setor || '');
        } catch (e) {
          // Se não encontrar, limpa pra permitir preenchimento manual
          setNome('');
          setSetor('');
        }
      }
      fetchEmployee();
    } else {
      if (nome || setor) {
        setNome('');
        setSetor('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cracha]);

  const total = carrinho.reduce((acc, item) => acc + item.cost * item.quantity, 0);

  useEffect(() => {
    if (total < 100 && numeroParcelas !== 1) {
      setNumeroParcelas(1);
    }
  }, [total, numeroParcelas]);

  const handleAddToCart = (produto) => {
    setCarrinho((atual) => {
      const existente = atual.find((i) => i.code === produto.code);
      if (existente) {
        return atual.map((i) => (i.code === produto.code ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...atual, { ...produto, quantity: 1 }];
    });

    setBusca('');
  };

  const handleChangeQuantity = (code, quantity) => {
    let q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) q = 1;
    setCarrinho((atual) => atual.map((i) => (i.code === code ? { ...i, quantity: q } : i)));
  };

  const handleRemoveItem = (code) => {
    setCarrinho((atual) => atual.filter((i) => i.code !== code));
  };

  const handleSubmitPedido = async () => {
    setMensagem('');
    setErro('');

    if (!nome || !setor || !cracha) {
      setErro('Preencha Nome, Setor e Crachá.');
      return;
    }

    if (!aceitaDesconto) {
      setErro('Você precisa aceitar o desconto em folha.');
      return;
    }

    if (carrinho.length === 0) {
      setErro('Adicione pelo menos um produto ao carrinho.');
      return;
    }

    let parcelas = Number(numeroParcelas) || 1;
    if (parcelas < 1) parcelas = 1;
    if (parcelas > 10) parcelas = 10;

    if (total < 100 && parcelas > 1) {
      setErro('Pedidos abaixo de R$ 100,00 só podem ser parcelados em 1x.');
      return;
    }

    const itensSnapshot = [...carrinho];

    const payload = {
      nome,
      setor,
      cracha,
      aceitaDesconto,
      numeroParcelas: parcelas,
      itens: itensSnapshot.map((item) => ({
        code: item.code,
        description: item.description,
        cost: item.cost,
        quantity: item.quantity,
      })),
    };

    try {
      setLoadingPedido(true);
      const resp = await criarPedido(payload);

      const valorFinal = resp && typeof resp.valorTotal === 'number' ? resp.valorTotal : total;

      setPedidoFinal({
        pedidoId: resp?.pedidoId,
        total: valorFinal,
        nome,
        setor,
        cracha,
        numeroParcelas: parcelas,
        itens: itensSnapshot,
        data: new Date().toISOString(),
      });

      setMensagem(`Pedido #${resp?.pedidoId} criado com sucesso.`);
      setCarrinho([]);
      setAceitaDesconto(false);
      setNumeroParcelas(1);
    } catch (e) {
      console.error(e);
      setErro(e.message || 'Erro ao criar pedido.');
    } finally {
      setLoadingPedido(false);
    }
  };

  const fecharResumo = () => {
    setPedidoFinal(null);
  };

  const handleExportarPDF = async () => {
    if (!pedidoFinal || !resumoRef.current) return;

    setErro('');
    setMensagem('Gerando PDF... Aguarde.');

    try {
      const canvas = await html2canvas(resumoRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`pedido_${pedidoFinal.pedidoId || 'novo'}.pdf`);

      setMensagem('PDF gerado com sucesso!');
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
      setErro('Erro ao gerar PDF. Verifique o console para detalhes.');
    }
  };

  const handleNovoPedido = () => {
    fecharResumo();
    setNome('');
    setSetor('');
    setCracha('');
    setAceitaDesconto(false);
    setCarrinho([]);
    setNumeroParcelas(1);
    setMensagem('');
    setErro('');
  };

  const totalFormatado = Number(pedidoFinal?.total || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div className="app-container">
      <Header />

      <section className="section-card">
        <h2 className="section-title">1) Informações do colaborador</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ maxWidth: '200px' }}>
            <label>
              Nº do crachá
              <input
                type="text"
                placeholder="Ex.: 12345"
                value={cracha}
                onChange={(e) => setCracha(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label>
                Nome completo
                <input
                  type="text"
                  placeholder="Ex.: Maria da Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  readOnly={!!nome && String(cracha).length >= 3}
                />
              </label>
            </div>

            <div>
              <label>
                Setor
                <input
                  type="text"
                  placeholder="Ex.: Compras, TI, RH"
                  value={setor}
                  onChange={(e) => setSetor(e.target.value)}
                  readOnly={!!setor && String(cracha).length >= 3}
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {erro && <div className="msg-erro">{erro}</div>}
      {mensagem && <div className="msg-sucesso">{mensagem}</div>}

      {loadingProdutos ? (
        <p>Carregando produtos...</p>
      ) : (
        <section className="layout-duas-colunas">
          <div className="layout-col">
            <div
              style={{
                padding: '10px',
                backgroundColor: '#fff3cd',
                color: '#856404',
                border: '1px solid #ffeeba',
                borderRadius: '4px',
                marginBottom: '15px',
                fontSize: '14px',
              }}
            >
              <p>
                <strong>Aviso Importante sobre Entregas:</strong>
                <br />
                Todos os pedidos devem ser feitos até <strong>Terça-feira</strong> para serem entregues na mesma semana (
                <strong>Quinta-feira</strong>). Pedidos feitos após a Terça-feira só serão entregues na Quinta-feira da
                semana seguinte.
              </p>
            </div>

            <ProductList produtos={produtos} busca={busca} setBusca={setBusca} onAddToCart={handleAddToCart} />
          </div>

          <div className="layout-col">
            <Cart
              itens={carrinho}
              total={total}
              numeroParcelas={numeroParcelas}
              setNumeroParcelas={setNumeroParcelas}
              onChangeQuantity={handleChangeQuantity}
              onRemoveItem={handleRemoveItem}
              onSubmit={handleSubmitPedido}
              loading={loadingPedido}
              aceitaDesconto={aceitaDesconto}
              setAceitaDesconto={setAceitaDesconto}
            />
          </div>
        </section>
      )}

      {/* ✅ Tela de resumo final do pedido */}
        {pedidoFinal && (
        <div className="overlay-resumo">
            {/* Background animado + escurecimento */}
            <div className="overlay-bg" aria-hidden="true">
            <Lottie
                options={defaultOptions}
                height="100%"
                width="100%"
                isClickToPauseDisabled
            />
            </div>

            {/* Card em primeiro plano */}
            <div className="pedido-card pedido-card--final" ref={resumoRef}>
            {/* header do card */}
            <div className="pedido-topbar">
                <div>
                <h2 className="pedido-nome">{pedidoFinal.nome}</h2>
                <p className="pedido-sub">
                    Setor: {pedidoFinal.setor} • Crachá: {pedidoFinal.cracha}
                </p>
                </div>

                <div className="pedido-parcelas">
                Parcelas: <strong>{pedidoFinal.numeroParcelas}</strong>
                </div>
            </div>

            <hr className="pedido-sep" />

            {/* itens */}
            <div className="pedido-itens">
                {pedidoFinal.itens.map((item) => (
                <div key={item.code} className="pedido-item">
                    <div className="pedido-cod">{item.code}</div>
                    <div className="pedido-desc">{item.description}</div>
                    <div className="pedido-qtd">x{item.quantity}</div>
                    <div className="pedido-valor">
                    {(item.cost * item.quantity).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                    })}
                    </div>
                </div>
                ))}
            </div>

            {/* total */}
            <div className="pedido-total">
                Total:{' '}
                <strong>
                {pedidoFinal.total.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                })}
                </strong>
            </div>

            {/* botões DENTRO do card */}
            <div className="pedido-acoes">
                <button className="btn-outline" onClick={handleNovoPedido}>
                Novo pedido
                </button>

                <button className="btn-primary" onClick={handleExportarPDF}>
                Exportar PDF
                </button>
            </div>
            </div>
        </div>
        )}
    </div>
  );
};

export default EmployeeOrderPage;
