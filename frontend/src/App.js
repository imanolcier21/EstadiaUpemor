// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './components/AuthPage';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminUserManagement from './components/AdminUserManagement'; // Lo crearemos en el siguiente paso
import './App.css';
import StudentOnboarding from './components/StudentOnboarding';
import AdminCareerManagement from './components/AdminCareerManagement';
import { AuthProvider  } from './context/AuthContext';
import AdminLayout from './components/AdminLayout';

function App() {
  return (
    <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* RUTA PÚBLICA / LOGIN */}
        <Route path="/" element={<AuthPage />} />
        <Route path="/onboarding/estudiante" element={<StudentOnboarding />} />
        
        {/* RUTA CENTRALIZADA: Un solo Layout que maneja TODO el contenido después del login */}
        <Route element={<AdminLayout />}>
            {/* 1. Dashboard Principal (Ruta: /dashboard/admin) */}
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            {/* 2. CRUDs de Gestión (Rutas: /admin/users, /admin/carreras) */}
            <Route path="/admin/users" element={<AdminUserManagement />} />
            <Route path="/admin/carreras" element={<AdminCareerManagement />} />
            {/* 3. Dashboard Estudiante */}
            <Route path="/dashboard/estudiante" element={<StudentDashboard />} />
        </Route>
        
        <Route path="*" element={<AuthPage />} />
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;