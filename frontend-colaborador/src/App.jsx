// frontend-colaborador/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EmployeeOrderPage from './pages/EmployeeOrderPage.jsx';

function App() {
  return (
    <Router>
      <div className="app-root">
        <Routes>
          <Route path="/" element={<EmployeeOrderPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
