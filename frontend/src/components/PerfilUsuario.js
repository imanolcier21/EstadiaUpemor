import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const PerfilUsuario = () => {
    const { username } = useParams();
    const [perfil, setPerfil] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        setPerfil(null); setError(null);
        fetch(`/api/perfil/${username}/`)
            .then(res => {
                if (!res.ok) throw new Error('No encontrado o privado');
                return res.json();
            })
            .then(setPerfil)
            .catch(() => setError('Perfil no encontrado o privado'));
    }, [username]);
    if (error) return <div style={{color:'red', margin:'2em'}}>{error}</div>;
    if (!perfil) return <div style={{margin:'2em'}}>Cargando perfil...</div>;
    return (
        <div style={{ maxWidth: 460, margin: '32px auto', background: '#fafbfc', borderRadius: 10, padding: 28, boxShadow: '0 1px 18px #0002' }}>
            <h2>Perfil de @{perfil.UserName}</h2>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img src={perfil.foto_perfil_url || '/default-user.png'} alt={perfil.UserName} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ccc' }} />
            </div>
            <div><b>Nombre:</b> {perfil.NomUser} {perfil.ApePatUser} {perfil.ApeMatUser}</div>
            <div><b>Género:</b> {perfil.genero}</div>
            <div><b>Descripción:</b> <br />{perfil.descripcion}</div>
            <div><b>Mostrar publicaciones públicas:</b> {perfil.show_posts_public ? 'Sí':'No'}</div>
            <div><b>Contacto:</b> {perfil.mostrar_contacto ? perfil.info_contacto : 'Oculto'}</div>
        </div>
    );
};
export default PerfilUsuario;
