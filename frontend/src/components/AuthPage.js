// frontend/src/components/AuthPage.js
import React, { useState } from 'react';
import logo from '../assets/logo.jpg';
import { useNavigate } from 'react-router-dom';
import './AuthPage.css';

// ELIMINADA: La variable API_BASE_URL, ya que usaremos el proxy de package.json

function AuthPage() {
    const navigate = useNavigate(); 
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [nomUser, setNomUser] = useState('');
    const [apePatUser, setApePatUser] = useState('');
    const [apeMatUser, setApeMatUser] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // CAMBIO CLAVE: Usamos la ruta RELATIVA. El proxy (configurado en package.json)
        // redirigirá esto automáticamente a http://localhost:8000/api/register/
        const endpoint = isRegistering ? '/api/register/' : '/api/login/';
        
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
                    credentials: 'include', // Asegúrate que esto esté si no está en otra parte
                },
                body: JSON.stringify(requestBody), 
            });
            
            // LÍNEA CRÍTICA: Definición de 'data'
            const data = await response.json(); // <-- ASEGÚRATE QUE ESTA LÍNEA NO ESTÉ COMENTADA
    
            if (response.ok) { // Línea 47 (approx)
                alert(data.message);
                navigate('/dashboard'); 
            } else { // Línea 50 (approx)
                alert(data.error);
            }
        } catch (error) {
            // ...
        }
    };

    return (
        // ... (el resto de tu componente JSX, el cual es correcto)
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
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)}
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