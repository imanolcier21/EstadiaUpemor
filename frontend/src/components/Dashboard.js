// frontend/src/components/Dashboard.js
import React from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
    // Aquí iría la lógica para decidir si mostrar el Dashboard de Admin o de Estudiante
    return (
        <div>
            <h1>Dashboard Principal (Inicio de sesión completado)</h1>
            <p>Bienvenido, Super Administrador.</p>
            
            {/* Enlace a la gestión de usuarios */}
            <Link to="/admin/users">Ir a Gestión de Usuarios (CRUD)</Link>
            
            {/* Placeholder para la funcionalidad de Publicaciones */}
            <p>Aquí irá el feed de publicaciones para Estudiantes.</p>
        </div>
    );
}

export default Dashboard;