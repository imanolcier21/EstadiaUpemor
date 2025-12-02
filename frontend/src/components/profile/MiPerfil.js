import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const GENERO_OPCIONES = [
    '', 'Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo'
];

const MiPerfil = () => {
    const { user: authUser } = useAuth();
    const [perfil, setPerfil] = useState(null);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [previewFoto, setPreviewFoto] = useState(null);
    const [form, setForm] = useState({});
    const [subiendo, setSubiendo] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [carreras, setCarreras] = useState([]);
    // Al editar, cargar carreras:
    useEffect(() => {
        if (!modoEdicion) return;
        fetch('/api/carreras/', { credentials: 'include' })
            .then(res => res.json())
            .then(setCarreras);
    }, [modoEdicion]);

    // Cargar mis datos al iniciar
    useEffect(() => {
        fetch('/api/perfil/mio/', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                setPerfil(data);
                setForm({ ...data });
                setPreviewFoto(data.foto_perfil_url);
            });
    }, []);

    function handleInput(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    }

    function handleSwitch(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.checked }));
    }

    function handleFile(e) {
        if (e.target.files && e.target.files[0]) {
            setForm(f => ({ ...f, foto_perfil: e.target.files[0] }));
            setPreviewFoto(URL.createObjectURL(e.target.files[0]));
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubiendo(true); setMensaje(''); setError('');
        const datos = new FormData();
        for (let key of Object.keys(form)) {
            if (form[key] !== null && form[key] !== undefined) {
                if (key === 'foto_perfil') {
                    if (form[key] instanceof File) datos.append('foto_perfil', form[key]);
                } else {
                    datos.append(key, form[key]);
                }
            }
        }
        const csrftoken = getCookie('csrftoken');
        try {
            const res = await fetch('/api/perfil/mio/', {
                method: 'PATCH',
                headers: { 'X-CSRFToken': csrftoken },
                body: datos,
                credentials: 'include',
            });
            const data = await res.json();
            if (res.ok) {
                setMensaje('¡Perfil actualizado!');
                setPerfil(data);
                setModoEdicion(false);
                setPreviewFoto(data.foto_perfil_url);
            } else {
                setError('Error al actualizar: ' + JSON.stringify(data));
            }
        } catch {
            setError('Error de red');
        } finally {
            setSubiendo(false);
        }
    }

    if (!perfil) return <div>Cargando perfil...</div>;
    return (
        <div style={{ maxWidth: 460, margin: '32px auto', background: '#fafbfc', borderRadius: 10, padding: 28, boxShadow: '0 1px 18px #0002' }}>
            <h2>Mi Perfil</h2>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img src={previewFoto || '/default-user.png'} alt="Foto de perfil" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ccc' }} />
            </div>
            {modoEdicion ? (
                <form onSubmit={handleSubmit} encType="multipart/form-data">
                    <input type="file" name="foto_perfil" accept="image/*" onChange={handleFile} />
                    <input type="text" name="NomUser" value={form.NomUser || ''} onChange={handleInput} placeholder="Nombre" style={{ marginTop: 8 }} />
                    <input type="text" name="ApePatUser" value={form.ApePatUser || ''} onChange={handleInput} placeholder="Apellido paterno" />
                    <input type="text" name="ApeMatUser" value={form.ApeMatUser || ''} onChange={handleInput} placeholder="Apellido materno" />
                    <input type="text" name="UserName" value={form.UserName || ''} onChange={handleInput} placeholder="Usuario" />

                    <select name="genero" value={form.genero || ''} onChange={handleInput} style={{ marginTop: 8 }}>
                        {GENERO_OPCIONES.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                    <select name="idCarrera" value={form.idCarrera || ''} onChange={handleInput} style={{ marginTop: 10 }} required>
                        <option value="">Selecciona carrera...</option>
                        {carreras.map(c => (
                            <option key={c.idCarrera} value={c.idCarrera}>{c.NomCarrera}</option>
                        ))}
                    </select>
                    <textarea name="descripcion" value={form.descripcion || ''} onChange={handleInput} placeholder="Descripción o biografía" style={{ marginTop: 8 }} />

                    <div>
                        <label><input type="checkbox" name="is_profile_public" checked={!!form.is_profile_public} onChange={handleSwitch} /> Perfil público</label>
                        <label style={{ marginLeft: 20 }}><input type="checkbox" name="show_posts_public" checked={!!form.show_posts_public} onChange={handleSwitch} /> Mostrar mis publicaciones</label>
                    </div>
                    <div>
                        <label><input type="checkbox" name="mostrar_contacto" checked={!!form.mostrar_contacto} onChange={handleSwitch} /> Mostrar contacto</label>
                        <input type="text" name="info_contacto" value={form.info_contacto || ''} onChange={handleInput} placeholder="WhatsApp, email alterno, etc." />
                    </div>
                    <button type="submit" style={{ marginTop: 16, background: '#088', color: 'white', border: 'none', borderRadius: 6, padding: 10, fontWeight: 600 }} disabled={subiendo}>{subiendo ? 'Guardando...' : 'Guardar'}</button>
                    <button type="button" style={{ marginLeft: 10 }} onClick={() => setModoEdicion(false)} disabled={subiendo}>Cancelar</button>
                </form>
            ) : (
                <div>
                    <div><b>Nombre: </b> {perfil.NomUser} {perfil.ApePatUser} {perfil.ApeMatUser}</div>
                    <div><b>Usuario: </b> @{perfil.UserName}</div>
                    <div><b>Género:</b> {perfil.genero}</div>
                    <div><b>Carrera:</b> {perfil.carrera_nombre || 'No especificada'}</div>
                    <div><b>Descripción:</b> <br />{perfil.descripcion}</div>
                    <div><b>Privacidad:</b> {perfil.is_profile_public ? 'Público' : 'Privado'}</div>
                    <div><b>Mostrar publicaciones:</b> {perfil.show_posts_public ? 'Sí' : 'No'}</div>
                    <div><b>Contacto visible:</b> {perfil.mostrar_contacto ? perfil.info_contacto : 'Oculto'}</div>
                    <button style={{ marginTop: 18, background: '#088', color: 'white', border: 'none', borderRadius: 6, padding: 10, fontWeight: 600 }} onClick={() => setModoEdicion(true)}>Editar perfil</button>
                </div>
            )}
            {mensaje && <div style={{ marginTop: 14, color: 'green' }}>{mensaje}</div>}
            {error && <div style={{ marginTop: 14, color: 'red' }}>{error}</div>}
        </div>
    );
};
export default MiPerfil;
