// frontend-admin/src/pages/AdminLoginPage.jsx
import React, { useState } from 'react';
import { loginAdmin } from '../services/api.js';

function AdminLoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const token = await loginAdmin({ username, password });
      onLogin(token);
    } catch (err) {
      setErro(err.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-container">
      <div className="card card-login">
        <h1>Painel Administrativo</h1>
        <p>Faça login para acessar os pedidos e dashboards.</p>

        <form onSubmit={handleSubmit} className="form">
          <label className="form-field">
            <span>Usuário</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="form-field">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {erro && <div className="alert alert-error">{erro}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="hint">
          Usuário padrão de teste: <strong>admin</strong> • Senha: <strong>Setav@*2025Painel</strong>
        </p>
      </div>
    </div>
  );
}

export default AdminLoginPage;
