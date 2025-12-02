// frontend/src/components/Header.jsx
import React from 'react';

const Header = () => {
    const abrirCatalogo = () => {
    const url = `${window.location.origin}/Guia_de_Produtos_2025.pdf`;
    window.open(url, '_blank', 'noopener,noreferrer');
    };

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo-wrapper">
          <img
            src="/logo_fgv_ecomerce_novembro_2025.png"
            alt="Logo FGVTN E-commerce"
            className="header-logo"
          />
        </div>
        <div className="header-title">
          <span>E-commerce Interno</span>
          <span>
            “Escolha seus itens com rapidez e autorize o desconto em folha com
            segurança.”
          </span>
        </div>
      </div>
      <button className="button-ver-catalogo" onClick={abrirCatalogo}>
        Ver catálogo (PDF)
      </button>
    </header>
  );
};

export default Header;
