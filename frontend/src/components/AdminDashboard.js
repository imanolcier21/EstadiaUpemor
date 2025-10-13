// frontend/src/components/AdminDashboard.js
import React from 'react';
import { Link } from 'react-router-dom';

function AdminDashboard() {
    return (
        <div>
            <h1>Dashboard de Administración (Admin)</h1>
            <p>Bienvenido, Administrador/Super Administrador. Utiliza los siguientes enlaces para la gestión:</p>
            
            <div style={{ marginTop: '20px' }}>
                <Link to="/admin/users">
                    <button style={{ padding: '10px 20px', marginRight: '15px' }}>
                        Ir a Gestión de Usuarios (CRUD)
                    </button>
                </Link>
                {/* Agrega más enlaces para Gestión de Carreras, Eventos, Reportes, etc. */}
            </div>
        </div>
    );
}

export default AdminDashboard;