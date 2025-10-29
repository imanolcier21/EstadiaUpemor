// frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // Estado inicial del usuario (null si no está logueado)
    const [user, setUser] = useState(null); 
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Función de LOGIN (Actualiza el estado con datos reales de Django)
    const login = (userData) => {
        setUser({
            username: userData.UserName || 'Usuario',
            userType: userData.TipoUser || 'Estudiante',
            isSuperuser: userData.is_superuser || false,
            isProfileComplete: userData.is_profile_complete || false,
        });
    };

    // Función de LOGOUT (Llama a la API de Django para matar la sesión)
    const logout = async () => {
        try {
            const response = await fetch('/api/logout/', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-type': 'application/json' },
            });

            // Si Django responde OK (200) o si hay error de red, forzamos el logout del cliente
            if (response.ok || !response.ok) {
                setUser(null); // Limpia el estado
                navigate('/'); // Redirige al login
            }
        } catch (error) {
            setUser(null);
            navigate('/');
        }
    };

    useEffect(() => {
        const verifySession = async () => {
            try {
                // Llama a la API de verificación de Django, enviando la cookie de sesión
                const response = await fetch('/api/check_session/', {
                    method: 'GET',
                    credentials: 'include',
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    // Si Django dice 200 OK, la sesión es válida. Guardamos los datos.
                    setUser({
                        username: userData.UserName,
                        userType: userData.TipoUser,
                        isSuperuser: userData.is_superuser,
                        isProfileComplete: userData.is_profile_complete,
                    });
                }
            } catch (error) {
                // Error de red o 401/403 (sesión inválida), 'user' permanece null.
            } finally {
                setLoading(false); // La carga inicial termina
            }
        };

        verifySession();
    }, []); // Se ejecuta solo al montar el componente (al iniciar la app)
    
    
    // El valor del contexto
    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}; 