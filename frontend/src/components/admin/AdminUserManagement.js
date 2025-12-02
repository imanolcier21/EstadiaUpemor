// frontend/src/components/AdminUserManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import UserCreationForm from './UserCreationForm';
import UserEditForm from './UserEditForm';
import ConfirmModal from '../layout/ConfirmModal'; // Importado para el modal de confirmación
import AdminLayout from '../layout/AdminLayout';
import '../../App.css';
import './AdminUserManagement.css'; // Para el diseño de la tabla y botones
// La URL base es manejada por el proxy en package.json.

function AdminUserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Controla si se muestra el modal o sección de formulario (Creación o Edición)
    const [isFormVisible, setIsFormVisible] = useState(false);

    // Almacena el objeto del usuario a editar (null para creación)
    const [editingUser, setEditingUser] = useState(null);

    // Controla si se muestra el modal de confirmación, guarda el objeto a eliminar
    const [confirmingUser, setConfirmingUser] = useState(null);

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

    // Función que se llama desde el botón (guarda el usuario para abrir el modal)
    const handleDeleteClick = (user) => {
        setConfirmingUser(user);
    };

    // Función que ejecuta el fetch DELETE (llamada por el modal al confirmar)
    const executeDelete = async () => {
        const userId = confirmingUser.idUser;
        const userName = confirmingUser.UserName;

        // Cerrar el modal antes de ejecutar la petición
        setConfirmingUser(null);

        try {
            const response = await fetch(`/api/usuarios/${userId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1],
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (response.status === 204) {
                // Usar alert temporalmente como notificación de éxito de plataforma
                alert(`[Notificación de Plataforma]: Usuario ${userName} eliminado con éxito.`);
                fetchUsers(); // Recarga la lista
            } else if (response.status === 403 || response.status === 401) {
                alert('[Notificación de Plataforma]: Error: Permiso denegado para eliminar.');
            } else {
                alert(`[Notificación de Plataforma]: Error al eliminar usuario. Código ${response.status}.`);
            }

        } catch (error) {
            alert('[Notificación de Plataforma]: Error de red al intentar eliminar el usuario.');
        }
    };


    // --- LÓGICA DE CREACIÓN/EDICIÓN (C & U) ---

    // Función para abrir el formulario de CREACIÓN
    const handleOpenCreateForm = () => {
        setEditingUser(null); // Modo: Creación
        setIsFormVisible(true);
    };

    // Función para abrir el formulario de EDICIÓN
    const handleEdit = (user) => {
        setEditingUser(user); // Modo: Edición, carga los datos
        setIsFormVisible(true);
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
        <div className='admin-management-content'>
            <div className="admin-management-container">

                {/* 1. RENDERIZADO DEL MODAL DE CONFIRMACIÓN */}
                {confirmingUser && (
                    <ConfirmModal
                        message={`¿Estás seguro de que quieres eliminar a ${confirmingUser.UserName} (ID: ${confirmingUser.idUser})? Esta acción es irreversible.`}
                        onConfirm={executeDelete}
                        onCancel={() => setConfirmingUser(null)} // Cierra el modal
                    />
                )}

                <h1>Gestión de Usuarios (Admin)</h1>
                <p className="subtitle">Módulo 2: CRUD de Usuarios de la Plataforma.</p>

                <section className="create-user-section">
                    <h2>Crear Nuevo Usuario/Admin</h2>
                    <button
                        className="primary-button"
                        onClick={handleOpenCreateForm}
                        style={{ marginBottom: '20px' }}
                    >
                        {isFormVisible && !editingUser ? 'Cerrar Formulario' : 'Abrir Formulario de Creación'}
                    </button>

                    {/* RENDERIZADO CONDICIONAL DE FORMULARIO DE CREACIÓN/EDICIÓN */}
                    {isFormVisible && (
                        <div className="form-modal-section">
                            {editingUser ? (
                                // Muestra Edición si hay un usuario cargado
                                <UserEditForm user={editingUser} onClose={handleCloseForm} />
                            ) : (
                                // Muestra Creación si no hay usuario cargado
                                <UserCreationForm onUserCreated={handleCloseForm} />
                            )}
                        </div>
                    )}
                </section>

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
                                    <td data-label="ID">{user.idUser}</td>
                                    <td data-label="Nombre de Usuario">{user.UserName}</td>
                                    <td data-label="Correo Electrónico">{user.CorreoUser}</td>
                                    <td data-label="Tipo">{user.TipoUser}</td>
                                    <td data-label="Carrera">{user.idCarrera || 'Sin Asignar'}</td>
                                    <td data-label="Acciones">
                                        {/* Botón de EDICIÓN */}
                                        <button
                                            className="edit-button"
                                            onClick={() => handleEdit(user)}
                                        >
                                            Editar
                                        </button>

                                        {/* Botón de ELIMINACIÓN (llama a la modal) */}
                                        <button
                                            className="delete-button"
                                            onClick={() => handleDeleteClick(user)}
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
        </div>
    );
}

export default AdminUserManagement;