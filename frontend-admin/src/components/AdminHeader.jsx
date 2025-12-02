// frontend-admin/src/components/AdminHeader.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function AdminHeader({ onLogout }) {
  const location = useLocation();
  const isDashboard = location.pathname === '/';
  const isPedidos = location.pathname.startsWith('/pedidos');

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <h1 className="admin-logo">Painel • E-commerce Interno</h1>
        <nav className="admin-nav">
          <Link className={isDashboard ? 'nav-link active' : 'nav-link'} to="/">
            Dashboard
          </Link>
          <Link className={isPedidos ? 'nav-link active' : 'nav-link'} to="/pedidos">
            Pedidos
          </Link>
        </nav>
      </div>
      <button className="btn btn-secondary" type="button" onClick={onLogout}>
        Sair
      </button>
    </header>
  );
}

export default AdminHeader;
