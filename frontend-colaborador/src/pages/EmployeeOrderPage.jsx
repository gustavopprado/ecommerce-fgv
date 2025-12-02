// frontend/src/pages/EmployeeOrderPage.jsx
import React, { useEffect, useState } from 'react';
import { getProdutos, criarPedido } from '../services/api';
import Header from '../components/Header';
import ProductList from '../components/ProductList';
import Cart from '../components/Cart';
import axios from 'axios';

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

  // parcelas do pedido (1 a 10)
  const [numeroParcelas, setNumeroParcelas] = useState(1);

  // dados do pedido final para a tela de resumo
  const [pedidoFinal, setPedidoFinal] = useState(null);

  useEffect(() => {
    async function carregar() {
      try {
        setLoadingProdutos(true);
        const data = await getProdutos();
        setProdutos(data);
      } catch (e) {
        console.error(e);
        setErro('Erro ao carregar produtos.');
      } finally {
        setLoadingProdutos(false);
      }
    }
    carregar();
  }, []);

  // total do carrinho
  const total = carrinho.reduce(
    (acc, item) => acc + item.cost * item.quantity,
    0
  );

  // se o total ficar abaixo de 100, força 1x
  useEffect(() => {
    if (total < 100 && numeroParcelas !== 1) {
      setNumeroParcelas(1);
    }
  }, [total, numeroParcelas]);

  const handleAddToCart = (produto) => {
    setCarrinho((atual) => {
      const existente = atual.find((i) => i.code === produto.code);
      if (existente) {
        return atual.map((i) =>
          i.code === produto.code
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...atual, { ...produto, quantity: 1 }];
    });

    // limpa o campo de busca para o próximo produto
    setBusca('');
  };

  const handleChangeQuantity = (code, quantity) => {
    if (quantity <= 0) quantity = 1;
    setCarrinho((atual) =>
      atual.map((i) =>
        i.code === code ? { ...i, quantity } : i
      )
    );
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

    // valida número de parcelas
    let parcelas = Number(numeroParcelas) || 1;
    if (parcelas < 1) parcelas = 1;
    if (parcelas > 10) parcelas = 10;

    if (total < 100 && parcelas > 1) {
      setErro('Pedidos abaixo de R$ 100,00 só podem ser parcelados em 1x.');
      return;
    }

    // snapshot dos itens antes de limpar o carrinho
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

      const valorFinal =
        resp && typeof resp.valorTotal === 'number'
          ? resp.valorTotal
          : total;

      // guarda dados para tela de resumo final
      setPedidoFinal({
        pedidoId: resp.pedidoId,
        total: valorFinal,
        nome,
        setor,
        cracha,
        numeroParcelas: parcelas,
        itens: itensSnapshot,
      });

      setMensagem(
        `Pedido #${resp.pedidoId} criado com sucesso. Total R$ ${valorFinal.toFixed(
          2
        )}`
      );
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

  return (
    <div className="app-container">
      <Header />

      <section className="section-card">
        <h2 className="section-title">1) Informações do colaborador</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1.5fr',
            gap: 12,
          }}
        >
          <div>
            <label>
              Nome completo
              <input
                type="text"
                placeholder="Ex.: Maria da Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </label>
          </div>
          <div>
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
          <div>
            <label>
              Setor
              <input
                type="text"
                placeholder="Ex.: Compras, TI, RH"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
              />
            </label>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={aceitaDesconto}
              onChange={(e) => setAceitaDesconto(e.target.checked)}
            />{' '}
            Declaro que estou ciente de que o valor deste pedido será
            descontado da minha folha salarial.
          </label>
        </div>
      </section>

      {erro && <div className="msg-erro">{erro}</div>}
      {mensagem && <div className="msg-sucesso">{mensagem}</div>}

      {loadingProdutos ? (
        <p>Carregando produtos...</p>
      ) : (
        <section className="layout-duas-colunas">
          <div className="layout-col">
            <ProductList
              produtos={produtos}
              busca={busca}
              setBusca={setBusca}
              onAddToCart={handleAddToCart}
            />
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
            />
          </div>
        </section>
      )}

      {/* Tela de resumo final do pedido */}
      {pedidoFinal && (
        <div className="overlay-resumo">
          <div className="overlay-card">
            <img
              src="/logo_fgv_ecomerce_novembro_2025.png"
              alt="Logo FGVTN E-commerce"
              className="overlay-logo"
            />
            <h2 className="overlay-titulo">Pedido concluído!</h2>
            <p className="overlay-subtitulo">
              Pedido #{pedidoFinal.pedidoId} registrado com sucesso.
            </p>

            <div className="overlay-info-colaborador">
              <p>
                <strong>Colaborador:</strong> {pedidoFinal.nome}
              </p>
              <p>
                <strong>Setor:</strong> {pedidoFinal.setor}
              </p>
              <p>
                <strong>Crachá:</strong> {pedidoFinal.cracha}
              </p>
            </div>

            <table className="resumo-tabela">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Qtd</th>
                  <th>Unitário</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {pedidoFinal.itens.map((item) => (
                  <tr key={item.code}>
                    <td>{item.code}</td>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>R$ {item.cost.toFixed(2)}</td>
                    <td>
                      R${' '}
                      {(item.cost * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="overlay-total">
              <span>
                {pedidoFinal.numeroParcelas > 1
                  ? `Total em ${pedidoFinal.numeroParcelas}x de R$ ${(
                      pedidoFinal.total / pedidoFinal.numeroParcelas
                    ).toFixed(2)}`
                  : 'Total à vista:'}
              </span>
              <strong>
                R$ {Number(pedidoFinal.total).toFixed(2)}
              </strong>
            </div>

            <div className="overlay-botoes">
              <button
                className="button-primario"
                onClick={fecharResumo}
              >
                Fechar resumo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeOrderPage;