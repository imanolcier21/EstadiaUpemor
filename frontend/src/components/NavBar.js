// frontend/src/components/NavBar.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Usa el contexto para datos de usuario
import './NavBar.css'; 

function NavBar() {
    const { user, logout, isAuthenticated } = useAuth();

    // No renderiza la barra si no está autenticado
    if (!isAuthenticated || !user) {
        return null; 
    }

    const { userType, username } = user;
    const isAdmin = (userType === 'Admin' || userType === 'SuperUser');

    // 1. Definición de hipervínculos dinámicos
    const links = [
        { path: isAdmin ? '/dashboard/admin' : '/dashboard/estudiante', label: 'Inicio' },
    ];
    
    return (
        <nav className="navbar">
            <div className="navbar-brand">UpeApp</div>
            <div className="navbar-links">
                {links.map(link => (
                    <Link key={link.path} to={link.path} className="nav-link">
                        {link.label}
                    </Link>
                ))}
            </div>
            <div className="navbar-user-info">
                {/* 2. Mostrar el usuario y su rol */}
                <span>Bienvenido, {username} ({userType})</span>
                {/* 3. Botón para cerrar la sesión (usa la función logout del contexto) */}
                <button onClick={logout} className="logout-button">Cerrar Sesión</button>
            </div>
        </nav>
    );
}

export default NavBar;