// frontend/src/components/AuthPage.js
import React, { useState } from 'react';
import logo from '../assets/logo.jpg';
import { useNavigate } from 'react-router-dom';
import './AuthPage.css';


function AuthPage() {
    const navigate = useNavigate(); 

    const [message, setMessage] = useState({text: '', type: ''});
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
                    credentials: 'include', 
                },
                body: JSON.stringify(requestBody), 
            });
            
            
            const data = await response.json(); 
    
            if (response.ok) { 
                const {message, TipoUser, is_superuser, is_profile_complete} = data;

                setMessage({text: data.message, type: 'success'});
                setEmail('');
                setPassword('');

                let redirectPath;

                if (TipoUser === 'Estudiante' && !is_profile_complete) {
                    redirectPath = 'onboarding/estudiante';
                }else if (TipoUser === 'Admin' || is_superuser) {
                    redirectPath = '/dashboard/admin';
                }else {
                    redirectPath = '/dashboard/estudiante';
                }
                
                setTimeout(() => navigate(redirectPath), 1000);
            } else { 
                setMessage({text: data.error, type: 'error'});
            }
        } catch (error) {
            setMessage({text: 'Error al conectar con el servidor', type: 'error'}); 
        }
    };

    return (
        
        <div className="auth-container">
            <div className="auth-box">
                {message.text && ( 
                    <div className={ `alert-box ${message.type}` }>
                        {message.text}
                    </div>
                )}
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