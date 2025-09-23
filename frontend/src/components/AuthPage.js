// frontend/src/components/AuthPage.js
import React, { useState } from 'react';
import logo from '../assets/logo.jpg';
import './AuthPage.css';

const API_BASE_URL = 'http://localhost:8000/api';

function AuthPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState(''); // Estado para el nombre de usuario
    const [nomUser, setNomUser] = useState('');
    const [apePatUser, setApePatUser] = useState('');
    const [apeMatUser, setApeMatUser] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const endpoint = isRegistering ? `${API_BASE_URL}/register/` : `${API_BASE_URL}/login/`;
        
        const requestBody = {
            email: email,
            password: password,
            username: username,
            nom_user: nomUser,
            ape_pat_user: apePatUser,
            ape_mat_user: apeMatUser,
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody), 
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(data.message);
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Hubo un error al conectar con el servidor.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <img src={logo} alt="Logo" className="logo" />
                <h1>Bienvenido a UpeApp</h1>
                <p>Ingresa tus datos para {isRegistering ? 'registrarte' : 'iniciar sesión'}</p>

                <form onSubmit={handleSubmit}>
                    {isRegistering && (
                        <>
                            <div className="form-group">
                                <label htmlFor="nomUser">Nombre:</label>
                                <input type="text" id="nomUser" value={nomUser} onChange={(e) => setNomUser(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="apePatUser">Apellido Paterno:</label>
                                <input type="text" id="apePatUser" value={apePatUser} onChange={(e) => setApePatUser(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="apeMatUser">Apellido Materno:</label>
                                <input type="text" id="apeMatUser" value={apeMatUser} onChange={(e) => setApeMatUser(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="username">Nombre de usuario:</label>
                                <input
                                    type="text"
                                    id="username"
                                    value={username} // Enlazado a la nueva variable de estado
                                    onChange={(e) => setUsername(e.target.value)} // Actualiza el estado cuando se escribe
                                    placeholder="Ingresa tu nombre de usuario"
                                    required
                                />
                            </div>
                        </>
                    )}
                    <div className="form-group">
                        <label htmlFor="email">Correo electrónico:</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Contraseña:</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="primary-button">
                        {isRegistering ? 'Registrarse' : 'Iniciar sesión'}
                    </button>
                </form>

                <p className="forgot-password">
                    <a href="#">¿Olvidaste tu contraseña?</a>
                </p>
                <button className="toggle-auth" onClick={() => setIsRegistering(!isRegistering)}>
                    {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                </button>
            </div>
        </div>
    );
}

export default AuthPage;