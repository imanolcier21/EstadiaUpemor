// frontend/src/components/AdminCareerManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import ConfirmModal from './ConfirmModal'; 
import '../App.css'; 
import './AdminUserManagement.css'; // Reutilizar estilos de tabla y formulario

function AdminCareerManagement() {
    const [carreras, setCarreras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Estados de Formulario
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingCareer, setEditingCareer] = useState(null); 
    const [formInput, setFormInput] = useState({ idCarrera: '', NomCarrera: '' });

    // Estado de Confirmación de Eliminación
    const [confirmingCareer, setConfirmingCareer] = useState(null);

    // --- LÓGICA DE LECTURA (READ) ---
    const fetchCarreras = useCallback(async () => {
        try {
            const response = await fetch('/api/carreras/', { // Ruta del ViewSet (api/carreras/)
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Permiso denegado o error al cargar carreras.');
            }

            const data = await response.json();
            setCarreras(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []); 

    useEffect(() => {
        fetchCarreras();
    }, [fetchCarreras]); 

    // --- MANEJO DE FORMULARIO (CREATE & UPDATE) ---
    const handleOpenCreateForm = () => {
        setEditingCareer(null);
        setFormInput({ idCarrera: '', NomCarrera: '' }); // Limpiar campos
        setIsFormVisible(true);
    };

    const handleEditClick = (career) => {
        setEditingCareer(career);
        setFormInput({ idCarrera: career.idCarrera, NomCarrera: career.NomCarrera });
        setIsFormVisible(true);
    };

    const handleInputChange = (e) => {
        setFormInput({ ...formInput, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const isEditing = editingCareer !== null;
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `/api/carreras/${editingCareer.idCarrera}/` : '/api/carreras/';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'X-CSRFToken': document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1],
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formInput),
            });

            if (response.ok || response.status === 201) {
                alert(`Carrera ${isEditing ? 'actualizada' : 'creada'} con éxito.`);
                setIsFormVisible(false);
                setEditingCareer(null);
                fetchCarreras(); // Recargar la lista
            } else {
                const errorData = await response.json();
                alert(`Error al guardar: ${JSON.stringify(errorData)}`);
            }
        } catch (error) {
            alert('Error de red al intentar guardar la carrera.');
        }
    };
    
    // --- LÓGICA DE ELIMINACIÓN (DELETE) ---

    const handleDeleteClick = (career) => {
        setConfirmingCareer(career);
    };

    const executeDelete = async () => {
        const careerId = confirmingCareer.idCarrera;
        const careerName = confirmingCareer.NomCarrera;
        
        setConfirmingCareer(null); 

        try {
            const response = await fetch(`/api/carreras/${careerId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1],
                },
                credentials: 'include',
            });

            if (response.status === 204) { 
                alert(`[Notificación]: Carrera ${careerName} eliminada con éxito.`); 
                fetchCarreras(); 
            } else {
                alert(`[Notificación]: Error al eliminar carrera. Código ${response.status}.`);
            }

        } catch (error) {
            alert('[Notificación]: Error de red al intentar eliminar la carrera.');
        }
    };

    if (loading) return <div className="loading-message">Cargando gestión de carreras...</div>;
    if (error) return <div className="error-message">Error al cargar carreras: {error}</div>;

    return (
        <div className="admin-management-container">
            
            {/* MODAL DE CONFIRMACIÓN */}
            {confirmingCareer && (
                <ConfirmModal
                    message={`¿Estás seguro de que quieres eliminar la carrera ${confirmingCareer.NomCarrera} (${confirmingCareer.idCarrera})? Esta acción es irreversible.`}
                    onConfirm={executeDelete}
                    onCancel={() => setConfirmingCareer(null)}
                />
            )}

            <h1>Gestión de Carreras (Admin)</h1>
            <p className="subtitle">Módulo 6: CRUD de las carreras de la UPEMOR.</p>
            
            <section className="create-user-section">
                <h2>{editingCareer ? 'Editar Carrera' : 'Crear Nueva Carrera'}</h2>
                <button 
                    className="primary-button"
                    onClick={handleOpenCreateForm}
                    style={{ marginBottom: '20px' }}
                >
                    {isFormVisible && !editingCareer ? 'Cerrar Formulario' : 'Abrir Formulario de Creación'}
                </button>
            </section>
            
            {/* FORMULARIO DE CREACIÓN/EDICIÓN */}
            {isFormVisible && (
                <form className="creation-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Código (Ej: ITI, IET)</label>
                        <input 
                            type="text" 
                            name="idCarrera" 
                            value={formInput.idCarrera} 
                            onChange={handleInputChange} 
                            required 
                            disabled={!!editingCareer} // No se debe editar el ID en la vista de edición
                        />
                    </div>
                    <div className="form-group">
                        <label>Nombre Completo</label>
                        <input 
                            type="text" 
                            name="NomCarrera" 
                            value={formInput.NomCarrera} 
                            onChange={handleInputChange} 
                            required 
                        />
                    </div>
                    <button type="submit" className="primary-button">
                        {editingCareer ? 'Guardar Cambios' : 'Crear Carrera'}
                    </button>
                </form>
            )}
            
            <hr />

            {/* SECCIÓN DE LECTURA (READ) */}
            <section className="user-list-section">
                <h2>Lista de Carreras ({carreras.length})</h2>
                <table className="user-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Nombre de la Carrera</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {carreras.map((career) => (
                            <tr key={career.idCarrera}>
                                <td data-label="Código">{career.idCarrera}</td>
                                <td data-label="Nombre de la Carrera">{career.NomCarrera}</td>
                                <td data-label="Acciones">
                                    <button 
                                        className="edit-button"
                                        onClick={() => handleEditClick(career)}
                                    >
                                        Editar
                                    </button>
                                    <button 
                                        className="delete-button"
                                        onClick={() => handleDeleteClick(career)}
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

export default AdminCareerManagement;