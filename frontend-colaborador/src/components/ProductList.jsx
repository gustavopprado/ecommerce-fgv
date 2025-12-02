// frontend/src/components/ProductList.jsx
import React from 'react';

const ProductList = ({ produtos, busca, setBusca, onAddToCart }) => {
  const term = busca.trim().toLowerCase();

  const filtrados =
    term.length >= 2
      ? produtos.filter((p) => {
          return (
            p.code.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term)
          );
        })
      : [];

  return (
    <div className="section-card">
      <h2 className="section-title">Buscar produto</h2>
      <p style={{ fontSize: 13, marginTop: 0, marginBottom: 8 }}>
        Digite o <strong>código</strong> ou parte da{' '}
        <strong>descrição</strong> do produto.
      </p>
      <input
        type="text"
        placeholder="Ex: 0072.972010 ou 'PRATO GIRATORIO'"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ width: '100%', marginBottom: 8 }}
      />

      {term.length > 0 && term.length < 2 && (
        <p style={{ fontSize: 12, color: '#6d6e71' }}>
          Digite pelo menos 2 caracteres para buscar.
        </p>
      )}

      {term.length >= 2 && filtrados.length === 0 && (
        <p style={{ fontSize: 13 }}>Nenhum produto encontrado.</p>
      )}

      {filtrados.length > 0 && (
        <ul className="lista-produtos">
          {filtrados.map((p) => (
            <li key={p.code} className="item-produto">
              <div style={{ fontSize: 14 }}>
                <strong>{p.description}</strong>
              </div>
              <div style={{ fontSize: 13, color: '#6d6e71' }}>
                Código: {p.code}
              </div>
              <div style={{ fontSize: 13 }}>
                Preço médio: R$ {p.cost.toFixed(2)}
              </div>
              <button
                className="button-primario"
                style={{ marginTop: 6 }}
                onClick={() => onAddToCart(p)}
              >
                Adicionar ao carrinho
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProductList;
