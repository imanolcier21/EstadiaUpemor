// frontend/src/components/StudentOnboarding.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthPage.css'; // Reutilizar estilos de formulario

function StudentOnboarding() {
    const navigate = useNavigate();
    
    // Estados para el formulario y datos dinámicos
    const [carreras, setCarreras] = useState([]);
    const [formData, setFormData] = useState({
        carrera_id: '',
        foto_perfil: null, // Para manejar el archivo
        // Puedes añadir aquí el estado de 'gustos'
    });
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);

    // --- LÓGICA DE CARGA DE CARRERAS ---
    useEffect(() => {
        const fetchCarreras = async () => {
            try {
                const response = await fetch('/api/carreras/', {
                    method: 'GET',
                    credentials: 'include',
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setCarreras(data);
                    // Opcional: establecer la primera carrera como predeterminada
                    if (data.length > 0) {
                        setFormData(prev => ({ ...prev, carrera_id: data[0].idCarrera }));
                    }
                } else {
                    setMessage({ text: 'Error al cargar las carreras. Intente de nuevo.', type: 'error' });
                }
            } catch (error) {
                setMessage({ text: 'Error de red al cargar datos.', type: 'error' });
            }
        };

        fetchCarreras();
    }, []);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'foto_perfil') {
            setFormData({ ...formData, foto_perfil: files[0] });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: 'Guardando perfil...', type: '' });

        // FormData es NECESARIO para enviar archivos (foto_perfil)
        const dataToSend = new FormData();
        dataToSend.append('carrera_id', formData.carrera_id);
        if (formData.foto_perfil) {
            dataToSend.append('foto_perfil', formData.foto_perfil);
        }

        try {
            // Nota: Se usa un fetch POST para enviar archivos/MultiPart
            const response = await fetch('/api/profile/onboard/', {
                method: 'POST', 
                // NO se debe establecer Content-Type para FormData
                credentials: 'include',
                body: dataToSend,
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ text: '¡Perfil completado! Redirigiendo...', type: 'success' });
                setTimeout(() => navigate('/dashboard/estudiante'), 1500); 
            } else {
                setMessage({ text: `Error: ${JSON.stringify(data.error || data)}`, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Error de red al completar el perfil.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container"> {/* Reutiliza el contenedor centralizado */}
            <div className="auth-box"> 
                <h1>¡Bienvenido a UpeApp!</h1>
                <p>Por favor, completa tu perfil para acceder a la plataforma.</p>

                {message.text && (
                    <div className={`alert-box ${message.type}`}>
                        {message.text}
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    
                    {/* CAMPO DE CARRERA (Menú Desplegable) */}
                    <div className="form-group">
                        <label htmlFor="carrera_id">Selecciona tu Carrera</label>
                        <select 
                            id="carrera_id" 
                            name="carrera_id" 
                            value={formData.carrera_id} 
                            onChange={handleChange} 
                            required
                        >
                            {/* Mostrar 'Cargando' si la lista está vacía */}
                            {carreras.length === 0 && <option value="">Cargando carreras...</option>}
                            
                            {/* Opciones generadas por la API */}
                            {carreras.map(c => (
                                <option key={c.idCarrera} value={c.idCarrera}>
                                    {c.idCarrera} - {c.NomCarrera}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* CAMPO DE FOTO DE PERFIL */}
                    <div className="form-group">
                        <label htmlFor="foto_perfil">Foto de Perfil (Opcional)</label>
                        <input 
                            type="file" 
                            id="foto_perfil" 
                            name="foto_perfil" 
                            accept="image/*"
                            onChange={handleChange} 
                        />
                    </div>

                    {/* [AQUÍ IRÍA EL CAMPO DE GUSTOS/INTERESES SI LO IMPLEMENTAS] */}

                    <button 
                        type="submit" 
                        className="primary-button" 
                        disabled={loading || !formData.carrera_id}
                    >
                        {loading ? 'Procesando...' : 'Completar Perfil'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default StudentOnboarding;