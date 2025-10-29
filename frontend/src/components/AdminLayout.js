// frontend/src/components/AdminLayout.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';

// Este componente recibe el contenido específico de la página como 'children'
function AdminLayout({ children }) {
    return (
        <div className="app-admin-layout">
            
            {/* 1. La Barra de Navegación se renderiza una sola vez */}
            <NavBar />
            
            {/* 2. El Contenido Específico (Gestión de Usuarios, Carreras, etc.) va aquí */}
            <main className="app-main-content">
                <Outlet />
            </main>
            
            {/* Aquí podrías añadir un Footer si fuera necesario */}
        </div>
    );
}

export default AdminLayout;