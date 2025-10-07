// frontend/src/components/AdminUserManagement.js
import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000/api';

function AdminUserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Función para obtener la lista de usuarios desde Django
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // El endpoint de listado es /api/usuarios/
                const response = await fetch(`${API_BASE_URL}/usuarios/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        // NOTA: Para producción, necesitarás enviar un token de autenticación (JWT o Cookie)
                    },
                });

                if (!response.ok) {
                    throw new Error('No autorizado o error del servidor');
                }

                const data = await response.json();
                setUsers(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    if (loading) return <div>Cargando lista de usuarios...</div>;
    if (error) return <div>Error al cargar usuarios: {error}. ¿Está el servidor de Django corriendo y el usuario logueado?</div>;

    return (
        <div className="admin-management">
            <h1>Gestión de Usuarios (Admin)</h1>
            <p>Ruta: /admin/users</p>
            
            {/* Formulario de CREACIÓN de un nuevo usuario/administrador iría aquí */}
            <h2>Crear Nuevo Usuario/Admin</h2>
            {/* ... Implementación del formulario POST a /api/usuarios/ ... */}

            <hr />

            <h2>Lista de Usuarios (READ)</h2>
            <table className="user-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre de Usuario</th>
                        <th>Correo</th>
                        <th>Tipo</th>
                        <th>Carrera</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.idUser}>
                            <td>{user.idUser}</td>
                            <td>{user.UserName}</td>
                            <td>{user.CorreoUser}</td>
                            <td>{user.TipoUser}</td>
                            <td>{user.idCarrera || 'N/A'}</td>
                            <td>
                                {/* Botones de EDICIÓN (UPDATE) y ELIMINACIÓN (DELETE) irían aquí */}
                                <button>Editar</button>
                                <button>Eliminar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminUserManagement;