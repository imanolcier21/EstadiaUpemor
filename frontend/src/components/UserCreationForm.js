// frontend/src/components/UserCreationForm.js
import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:8000/api';

function UserCreationForm({ onUserCreated }) {
    // States for all required fields (must match your Django model/view)
    const [formData, setFormData] = useState({
        CorreoUser: '',
        password: '',
        UserName: '',
        NomUser: '',
        ApePatUser: '',
        ApeMatUser: '',
        TipoUser: 'Estudiante', // Default role
    });
    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Procesando...');

        const csrftoken = document.cookie.split(';')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];

        if(!csrftoken){
            setMessage('Error: No se encontró el token CSRF.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/usuarios/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`Usuario ${formData.UserName} creado exitosamente.`);
                onUserCreated(); // Callback to refresh the user list
            } else {
                setMessage(`Error: ${JSON.stringify(data)}`);
            }
        } catch (error) {
            setMessage('Error de red al crear usuario.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="creation-form">
            <div style={{ color: message.includes('Error') ? 'red' : 'green' }}>{message}</div>
            
            {/* Form Fields */}
            <input type="email" name="CorreoUser" placeholder="Correo Electrónico" onChange={handleChange} required />
            <input type="password" name="password" placeholder="Contraseña" onChange={handleChange} required />
            <input type="text" name="UserName" placeholder="Nombre de Usuario" onChange={handleChange} required />
            <input type="text" name="NomUser" placeholder="Nombre" onChange={handleChange} required />
            <input type="text" name="ApePatUser" placeholder="Apellido Paterno" onChange={handleChange} required />
            <input type="text" name="ApeMatUser" placeholder="Apellido Materno" onChange={handleChange} />
            
            {/* Role Selection */}
            <select name="TipoUser" onChange={handleChange} value={formData.TipoUser}>
                <option value="Estudiante">Estudiante</option>
                <option value="Profesor">Profesor</option>
                <option value="Admin">Administrador</option>
            </select>

            <button type="submit" className="primary-button">Crear Usuario</button>
        </form>
    );
}

export default UserCreationForm;