// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard'; // Lo crearemos en el siguiente paso
import AdminUserManagement from './components/AdminUserManagement'; // Lo crearemos en el siguiente paso
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin/users" element={<AdminUserManagement />} />
        {/* Agrega aquí más rutas como /posts, /profile, etc. */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;