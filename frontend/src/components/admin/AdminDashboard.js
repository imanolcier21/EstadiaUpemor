// frontend/src/components/AdminDashboard.js (Contenido Corregido)

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../App.css';
import './AdminDashboard.css';

function AdminDashboard() {
    const { user } = useAuth();
    const isAdmin = user && (user.userType === 'Admin' || user.isSuperuser);

    if (!user) {
        return <div className="loading-message">Cargando dashboard...</div>;
    }

    return (
        <div className="admin-content-area">
            <div className="admin-dashboard-card"> {/* Nuevo contenedor para la tarjeta */}
                <h1>Dashboard de Administración</h1>
                <p>Bienvenido. Desde aquí puedes gestionar los recursos de la plataforma.</p>

                {/* Botones de Acción (los que se veían antes del NavBar) */}
                <div className="dashboard-nav-links">

                    <Link to="/admin/users" className="nav-button">
                        Gestión de Usuarios
                    </Link>
                    <Link to="/admin/carreras" className="nav-button">
                        Gestión de Carreras
                    </Link>
                    <Link to="/admin/posts" className="nav-button">
                        Gestión de Publicaciones
                    </Link>
                    <Link to="/grupos" className="nav-button">
                        Gestión de Grupos
                    </Link>
                    <Link to="/admin/reportes" className="dashboard-btn">
                        Dashboard de Reportes 📈
                    </Link>
                    {isAdmin && (
                        <Link to="/admin/backup" className="dashboard-btn" style={{ background: '#2172b2', color: '#fff', fontWeight: 'bold' }}>Respaldo BD 💾</Link>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;