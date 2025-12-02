// frontend-admin/src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';

function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('adminToken');
    if (saved) {
      setToken(saved);
    }
  }, []);

  function handleLogin(newToken) {
    localStorage.setItem('adminToken', newToken);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem('adminToken');
    setToken(null);
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            token ? <Navigate to="/" replace /> : <AdminLoginPage onLogin={handleLogin} />
          }
        />
        <Route
          path="/"
          element={
            token ? (
              <DashboardPage token={token} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/pedidos"
          element={
            token ? (
              <OrdersPage token={token} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="*"
          element={<Navigate to={token ? '/' : '/login'} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
