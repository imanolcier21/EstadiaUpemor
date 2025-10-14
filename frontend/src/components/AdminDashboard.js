// frontend/src/components/AdminDashboard.js
import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css'; 
import './AdminDashboard.css'; 

function AdminDashboard() {
    return (
        <div className="admin-dashboard-container">
            <h1>Dashboard de Administración</h1>
            <p>Bienvenido. Desde aquí puedes gestionar los recursos de la plataforma.</p>
            
            <div className="dashboard-nav-links">
                <Link to="/admin/users" className="nav-button">
                    Gestión de Usuarios
                </Link>
                {/* Próximamente: Más enlaces para Gestión de Carreras, Eventos, etc. */}
            </div>
        </div>
    );
}

export default AdminDashboard;