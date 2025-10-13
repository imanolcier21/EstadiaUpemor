// frontend/src/components/AdminUserManagement.js
import React, { useState, useEffect, useCallback } from 'react'; // Importar useCallback
import UserCreationForm from './UserCreationForm'; // <--- ASEGÚRATE DE CREAR ESTE ARCHIVO
import '../App.css'; 

// La URL base es manejada por el proxy en package.json.
// Por lo tanto, usamos rutas relativas como '/api/usuarios/'.

function AdminUserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormVisible, setIsFormVisible] = useState(false);

    // 1. Declarar fetchUsers con useCallback para que pueda ser llamado
    //    desde fuera y evitar re-creación innecesaria.
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
    }, []); // Dependencia vacía para que la función sea estable

    // Ejecutar fetchUsers al montar el componente
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]); // Ahora depende de fetchUsers

    
    // 2. Función para manejar la eliminación de un usuario (DELETE)
    const handleDelete = async (userId, userName) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar al usuario ${userName} (ID: ${userId})? Esta acción es irreversible.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/usuarios/${userId}/`, {
                method: 'DELETE',
                headers: {
                    // Obtiene el token CSRF para peticiones peligrosas (POST, PUT, DELETE)
                    'X-CSRFToken': document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1],
                    'Content-Type': 'application/json',
                    credentials: 'include',
                },
            });

            if (response.status === 204) { // Código 204 es la respuesta estándar de DRF para DELETE exitoso
                alert(`Usuario ${userName} eliminado con éxito.`);
                fetchUsers(); // Recarga la lista para actualizar la tabla
            } else if (response.status === 403 || response.status === 401) {
                alert('Error: Permiso denegado para eliminar usuarios.');
            } else {
                alert(`Error al eliminar usuario: Código ${response.status}.`);
            }

        } catch (error) {
            alert('Error de red al intentar eliminar el usuario.');
        }
    };
    
    // Función para alternar la visibilidad del formulario de creación
    const handleOpenForm = () => {
        setIsFormVisible(!isFormVisible);
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
                    onClick={handleOpenForm}
                    style={{ marginBottom: '20px' }}
                >
                    {isFormVisible ? 'Cerrar Formulario' : 'Abrir Formulario de Creación'}
                </button>
                {/* Renderiza el componente de creación si es visible */}
                {isFormVisible && <UserCreationForm
                    onUserCreated={() => {
                        fetchUsers(); // Recarga la lista
                        setIsFormVisible(false); // Cierra el formulario
                    }}
                />}
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
                                    <button className="edit-button">Editar</button>
                                    {/* Botón de ELIMINACIÓN con el manejador de clic */}
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