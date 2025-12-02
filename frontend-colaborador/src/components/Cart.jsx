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
}) => {
  const abrirProdutoNoCatalogo = (code) => {
    const base = window.location.origin;
    const url = `${base}/Guia_de_Produtos_2025.pdf#search=${encodeURIComponent(
      code
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleChangeParcelas = (e) => {
    let val = Number(e.target.value) || 1;
    if (val < 1) val = 1;
    if (val > 10) val = 10;
    // se total < 100, sempre força 1x
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

      <ul className="lista-carrinho">
        {itens.map((item) => (
          <li key={item.code} className="item-carrinho">
            <div style={{ fontSize: 14 }}>
              <strong>{item.description}</strong>
            </div>
            <div style={{ fontSize: 13, color: '#6d6e71' }}>
              Código: {item.code}
            </div>

            <div
              style={{
                fontSize: 13,
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span>Quantidade:</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  className="button-secundario"
                  style={{ padding: '2px 8px' }}
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
                    if (isNaN(val) || val < 1) {
                      onChangeQuantity(item.code, 1);
                    } else if (val > 9999) {
                      onChangeQuantity(item.code, 9999);
                    } else {
                      onChangeQuantity(item.code, val);
                    }
                  }}
                  style={{ width: 70, textAlign: 'center' }}
                />
                <button
                  type="button"
                  className="button-secundario"
                  style={{ padding: '2px 8px' }}
                  onClick={() =>
                    onChangeQuantity(item.code, item.quantity + 1)
                  }
                >
                  +
                </button>
              </div>

              <span style={{ marginLeft: 6 }}>
                x R$ {item.cost.toFixed(2)} ={' '}
                <strong>
                  R$ {(item.cost * item.quantity).toFixed(2)}
                </strong>
              </span>
            </div>

            <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
              <button
                className="button-secundario"
                onClick={() => abrirProdutoNoCatalogo(item.code)}
              >
                Ver produto no catálogo
              </button>
              <button
                className="button-secundario"
                onClick={() => onRemoveItem(item.code)}
              >
                Remover
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Seletor de parcelas atrelado ao total do carrinho */}
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
                  border: '1px solid #d8d9db',
                  fontSize: 13,
                }}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map(
                  (n) => (
                    <option key={n} value={n}>
                      {n}x
                    </option>
                  )
                )}
              </select>
            </label>
            <div style={{ fontSize: 11, color: '#6d6e71', marginTop: 2 }}>
              {parcelasHabilitadas ? (
                <>Parcelamento disponível para pedidos a partir de R$ 100,00.</>
              ) : (
                <>
                  Total atual abaixo de R$ 100,00. Parcelamento em
                  mais vezes será liberado ao atingir R$ 100,00.
                </>
              )}
            </div>
          </div>

          <span className="badge-total">
            Total: R$ {total.toFixed(2)}
          </span>
        </div>

        <button
          className="button-primario"
          onClick={onSubmit}
          disabled={loading || itens.length === 0}
        >
          {loading ? 'Enviando...' : 'Confirmar Pedido'}
        </button>
      </div>
    </div>
  );
};

export default Cart;
