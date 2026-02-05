// frontend/src/components/Cart.jsx
import React from 'react';

const Cart = ({
  itens,
  total,
  numeroParcelas,
  setNumeroParcelas,
  onChangeQuantity,
  onRemoveItem,
  onSubmit,
  loading,
  aceitaDesconto,
  setAceitaDesconto,
}) => {
  const abrirProdutoNoCatalogo = (code) => {
    const PDF_URL =
      'https://www.fgvtn.com.br/site/novopdf/Guia_de_Produtos_2025.pdf';
    const url = `${PDF_URL}#search=${encodeURIComponent(code)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleChangeParcelas = (e) => {
    let val = Number(e.target.value) || 1;
    if (val < 1) val = 1;
    if (val > 10) val = 10;
    if (total < 100) val = 1;
    setNumeroParcelas(val);
  };

  const parcelasHabilitadas = total >= 100;

  return (
    <div className="section-card">
      <h2 className="section-title">Carrinho</h2>

      {itens.length === 0 && (
        <p style={{ fontSize: 13 }}>Nenhum item no carrinho.</p>
      )}

      <ul className="lista-carrinho lista-carrinho--simple">
        {itens.map((item) => (
          <li key={item.code} className="item-carrinho item-carrinho--simple">
            <div style={{ fontSize: 14 }}>
              <strong>{item.description}</strong>
            </div>

            <div
              style={{
                fontSize: 13,
                color: 'var(--cinza-escuro)',
                marginTop: 2,
              }}
            >
              Código: {item.code}
            </div>

            <div className="cart-row-simple">
              <div className="quantity-control">
                <button
                  type="button"
                  className="button-secundario"
                  onClick={() =>
                    onChangeQuantity(
                      item.code,
                      item.quantity > 1 ? item.quantity - 1 : 1
                    )
                  }
                >
                  -
                </button>

                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (isNaN(val) || val < 1) onChangeQuantity(item.code, 1);
                    else if (val > 9999) onChangeQuantity(item.code, 9999);
                    else onChangeQuantity(item.code, val);
                  }}
                  style={{ width: 55, textAlign: 'center' }}
                />

                <button
                  type="button"
                  className="button-secundario"
                  onClick={() => onChangeQuantity(item.code, item.quantity + 1)}
                >
                  +
                </button>
              </div>

              <div className="cart-price-simple">
                <span style={{ color: 'var(--cinza-escuro)' }}>
                  {Number(item.cost).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}{' '}
                  × {item.quantity} =
                </span>
                <strong style={{ marginLeft: 6, color: 'var(--preto)' }}>
                  {(item.cost * item.quantity).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </strong>
              </div>

              <div className="cart-actions-simple">
                <button
                  type="button"
                  className="button-secundario"
                  onClick={() => abrirProdutoNoCatalogo(item.code)}
                >
                  Ver produto no catálogo
                </button>

                <button
                  type="button"
                  className="button-secundario"
                  onClick={() => onRemoveItem(item.code)}
                >
                  Remover
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 18, paddingLeft: 12 }}>
        <label style={{ fontSize: 13 }}>
          <input
            type="checkbox"
            checked={aceitaDesconto}
            onChange={(e) => setAceitaDesconto(e.target.checked)}
          />{' '}
          Declaro que estou ciente de que o valor deste pedido será descontado da
          minha folha salarial.
        </label>
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          paddingLeft: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 13 }}>
            <label>
              Parcelar em:{' '}
              <select
                value={numeroParcelas}
                onChange={handleChangeParcelas}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--cinza-claro)',
                  fontSize: 13,
                }}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
            </label>

            <div style={{ fontSize: 11, color: 'var(--cinza-escuro)', marginTop: 2 }}>
              {parcelasHabilitadas ? (
                <>Parcelamento disponível para pedidos a partir de R$ 100,00.</>
              ) : (
                <>Total abaixo de R$ 100,00: parcelamento travado em 1x.</>
              )}
            </div>
          </div>

          <span className="badge-total">
            Total:{' '}
            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        {numeroParcelas > 1 && (
          <div
            style={{
              fontSize: 13,
              color: '#000',
              textAlign: 'right',
              marginTop: -4,
              marginRight: 4,
            }}
          >
            {numeroParcelas}x de{' '}
            {(total / numeroParcelas).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </div>
        )}

        <button
          className="button-primario"
          onClick={onSubmit}
          disabled={loading || itens.length === 0}
          style={{ padding: '12px 16px', borderRadius: 16, fontSize: 14 }}
        >
          {loading ? 'Enviando...' : 'Confirmar Pedido'}
        </button>
      </div>
    </div>
  );
};

export default Cart;
