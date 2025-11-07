// frontend/src/components/UserEditForm.js
import React, { useState, useEffect } from 'react';

// Si tu AdminUserManagement.js usa rutas relativas, aquí también deberías usarlas:
const API_BASE_URL = ''; // Usar ruta relativa si el proxy está configurado correctamente

function UserEditForm({ user, onClose }) {
    // 1. INICIALIZACIÓN DE ESTADOS: Tomar valores de las props 'user'
    const [formData, setFormData] = useState({
        CorreoUser: user.CorreoUser || '',
        UserName: user.UserName || '',
        NomUser: user.NomUser || '',
        ApePatUser: user.ApePatUser || '',
        ApeMatUser: user.ApeMatUser || '',
        TipoUser: user.TipoUser || 'Estudiante',
        // La contraseña se deja vacía en el estado inicial por seguridad
        password: '', 
        genero: user.genero || '',
    });
    const [message, setMessage] = useState(''); // Estado para mensajes de feedback
    const [carreras, setCarreras] = useState([]);

    useEffect(() => {
      fetch('/api/carreras/', { credentials: 'include' })
        .then(res => res.json()).then(setCarreras);
    }, []);

    // Función para manejar los cambios en los campos del formulario
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Actualizando...'); // Se usa setMessage

        // Obtener el CSRF token
        const csrftoken = document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        if (!csrftoken) { setMessage('Error: Token CSRF no encontrado.'); return; }
        
        // CORRECCIÓN 1: Asegurar que el endpoint use la URL relativa y el ID
        const endpoint = `/api/usuarios/${user.idUser}/`; 

        // Preparar dataToSend
        const dataToSend = {
            ...formData,
        };
        
        // Lógica: Si el campo password está vacío, lo eliminamos del objeto
        if (dataToSend.password === '') {
             delete dataToSend.password;
        }

        try {
            const response = await fetch(endpoint, {
                method: 'PUT', // Método de actualización
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                credentials: 'include', 
                body: JSON.stringify(dataToSend),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`Usuario ${data.UserName} actualizado exitosamente.`);
                setTimeout(onClose, 1000); 
            } else {
                // Muestra errores de validación del backend (ej: correo ya existe)
                setMessage(`Error de validación: ${JSON.stringify(data)}`);
            }
        } catch (error) {
            setMessage('Error de red al actualizar usuario.'); // Se usa setMessage
        }
    };

    return (
        <div className="modal-content">
            <h3>Editar Usuario: {user.UserName}</h3>
            <div style={{ color: message.includes('Error') ? 'red' : 'green' }}>{message}</div>
            
            <form onSubmit={handleSubmit} className="creation-form">
                {/* Campos precargados con los valores del estado (usando formData) */}
                <select name="idCarrera" value={formData.idCarrera || ''} onChange={handleChange} required>
                    <option value="">Selecciona carrera...</option>
                    {carreras.map(c => (
                        <option key={c.idCarrera} value={c.idCarrera}>{c.NomCarrera}</option>
                    ))}
                </select>
                <input type="email" name="CorreoUser" value={formData.CorreoUser} onChange={handleChange} required />
                <input type="text" name="UserName" value={formData.UserName} onChange={handleChange} required />
                <input type="text" name="NomUser" value={formData.NomUser} onChange={handleChange} required />
                
                {/* Contraseña: Se precarga vacío y solo se envía si se escribe algo */}
                <input type="password" name="password" placeholder="Nueva Contraseña (Dejar vacío para no cambiar)" onChange={handleChange} value={formData.password} />
                
                {/* Selección de Rol (TipoUser) */}
                <select name="TipoUser" onChange={handleChange} value={formData.TipoUser}>
                    <option value="Estudiante">Estudiante</option>
                    <option value="Profesor">Profesor</option>
                    <option value="Admin">Administrador</option>
                </select>

                <select name="genero" value={formData.genero} onChange={handleChange} required>
                    <option value="">Selecciona Género</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                    <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                </select>

                <button type="submit">Guardar Cambios</button>
                <button type="button" onClick={onClose} style={{ marginLeft: '10px' }}>Cancelar</button>
            </form>
        </div>
    );
}

export default UserEditForm;