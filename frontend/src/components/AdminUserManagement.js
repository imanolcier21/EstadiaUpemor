// frontend/src/components/AdminUserManagement.js
import React, { useState, useEffect } from 'react';
// Asegúrate de que este archivo App.css esté en frontend/src/ para estilos generales,
// o crea un AdminUserManagement.css para estilos específicos.
import '../App.css'; 


function AdminUserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Función para obtener la lista de usuarios desde Django
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // CAMBIO CLAVE: La URL debe ser solo la ruta, sin http://localhost:8000
                const response = await fetch('/api/usuarios/', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                });
    

                if (!response.ok) {
                    // Si el servidor responde con 401/403 (No Autorizado), capturamos el error
                    let errorMessage = 'No autorizado. Asegúrate de que el Superusuario esté logueado.';
                    if (response.status === 401 || response.status === 403) {
                         errorMessage = 'Permiso denegado. Solo Administradores pueden ver esta lista.';
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                setUsers(data);
            } catch (err) {
                // Captura errores de red o los errores lanzados arriba
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []); // El array vacío asegura que se ejecute solo una vez al montar el componente

    if (loading) return <div className="loading-message">Cargando lista de usuarios...</div>;
    
    // Muestra el mensaje de error si la petición falla
    if (error) return <div className="error-message">Error al cargar usuarios: {error}</div>;

    return (
        <div className="admin-management-container">
            <h1>Gestión de Usuarios (Admin)</h1>
            <p className="subtitle">Módulo 2: CRUD de Usuarios de la Plataforma.</p>
            
            {/* Sección de CREACIÓN (pendiente de implementar el formulario) */}
            <section className="create-user-section">
                <h2>Crear Nuevo Usuario/Admin</h2>
                {/* Aquí irá un formulario para POST a /api/usuarios/ */}
                <button className="primary-button">Abrir Formulario de Creación</button>
            </section>

            <hr />

            {/* Sección de LECTURA (READ) */}
            <section className="user-list-section">
                <h2>Lista de Usuarios Registrados ({users.length})</h2>
                <table className="user-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre de Usuario</th>
                            <th>Correo Electrónico</th>
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
                                <td>{user.idCarrera || 'Sin Asignar'}</td>
                                <td>
                                    {/* Botones de EDICIÓN (UPDATE) y ELIMINACIÓN (DELETE) */}
                                    <button className="edit-button">Editar</button>
                                    <button className="delete-button">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}

export default AdminUserManagement;