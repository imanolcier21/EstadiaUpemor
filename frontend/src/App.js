// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './components/AuthPage';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminUserManagement from './components/AdminUserManagement'; // Lo crearemos en el siguiente paso
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />

        <Route path="/dashboard/estudiante" element={<StudentDashboard />} />
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUserManagement />} />
        <Route path="*" element={<AuthPage />} />
        {/* Agrega aquí más rutas como /posts, /profile, etc. */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;