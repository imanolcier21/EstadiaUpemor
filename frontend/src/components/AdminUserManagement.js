// frontend/src/components/AdminUserManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import UserCreationForm from './UserCreationForm'; 
import UserEditForm from './UserEditForm'; // Importado para el formulario de edición
import '../App.css'; 

// La URL base es manejada por el proxy en package.json.

function AdminUserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Controla si se muestra el modal o sección de formulario
    const [isFormVisible, setIsFormVisible] = useState(false); 
    
    // Almacena el objeto del usuario a editar (null para creación)
    const [editingUser, setEditingUser] = useState(null); 

    // --- LÓGICA DE LECTURA (READ) ---
    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch('/api/usuarios/', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                let errorMessage = 'No autorizado. Asegúrate de que el Superusuario esté logueado.';
                if (response.status === 401 || response.status === 403) {
                     errorMessage = 'Permiso denegado. Solo Administradores pueden ver esta lista.';
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []); 

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]); 

    
    // --- LÓGICA DE ELIMINACIÓN (DELETE) ---
    const handleDelete = async (userId, userName) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar al usuario ${userName} (ID: ${userId})? Esta acción es irreversible.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/usuarios/${userId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1],
                    'Content-Type': 'application/json',
                    credentials: 'include',
                },
            });

            if (response.status === 204) { 
                alert(`Usuario ${userName} eliminado con éxito.`);
                fetchUsers(); // Recarga la lista
            } else if (response.status === 403 || response.status === 401) {
                alert('Error: Permiso denegado para eliminar usuarios.');
            } else {
                alert(`Error al eliminar usuario: Código ${response.status}.`);
            }

        } catch (error) {
            alert('Error de red al intentar eliminar el usuario.');
        }
    };
    
    
    // --- LÓGICA DE CREACIÓN/EDICIÓN (C & U) ---
    
    // Función para abrir el formulario de CREACIÓN
    const handleOpenCreateForm = () => {
        setEditingUser(null); // Asegura que el modo sea 'Creación'
        setIsFormVisible(true);
    };

    // Función para abrir el formulario de EDICIÓN
    const handleEdit = (user) => {
        setEditingUser(user); // Carga los datos del usuario
        setIsFormVisible(true); // Muestra el formulario
    };

    // Función para cerrar el formulario y recargar datos (Usado por ambos formularios)
    const handleCloseForm = () => {
        setEditingUser(null); // Limpia el usuario en edición
        setIsFormVisible(false);
        fetchUsers(); // Recarga la lista para ver los cambios
    };


    if (loading) return <div className="loading-message">Cargando lista de usuarios...</div>;
    if (error) return <div className="error-message">Error al cargar usuarios: {error}</div>;

    return (
        <div className="admin-management-container">
            <h1>Gestión de Usuarios (Admin)</h1>
            <p className="subtitle">Módulo 2: CRUD de Usuarios de la Plataforma.</p>
            
            <section className="create-user-section">
                <h2>Crear Nuevo Usuario/Admin</h2>
                <button 
                    className="primary-button"
                    // Al hacer clic en este botón, siempre se abre el modo "Creación"
                    onClick={handleOpenCreateForm}
                    style={{ marginBottom: '20px' }}
                >
                    {isFormVisible && !editingUser ? 'Cerrar Formulario' : 'Abrir Formulario de Creación'}
                </button>
            </section>
            
            {/* RENDERIZADO CONDICIONAL DE FORMULARIO */}
            {isFormVisible && (
                <div className="form-modal-section"> 
                    {/* Si editingUser tiene datos, renderiza el Formulario de Edición */}
                    {editingUser ? (
                        <UserEditForm user={editingUser} onClose={handleCloseForm} />
                    ) : (
                        // Si editingUser es null, renderiza el Formulario de Creación
                        <UserCreationForm onUserCreated={handleCloseForm} />
                    )}
                </div>
            )}
            
            <hr />

            {/* SECCIÓN DE LECTURA (READ) */}
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
                                    {/* Botón de EDICIÓN */}
                                    <button 
                                        className="edit-button"
                                        onClick={() => handleEdit(user)} // <-- Llama al modo edición
                                    >
                                        Editar
                                    </button>
                                    
                                    {/* Botón de ELIMINACIÓN */}
                                    <button 
                                        className="delete-button"
                                        onClick={() => handleDelete(user.idUser, user.UserName)}
                                    >
                                        Eliminar
                                    </button>
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