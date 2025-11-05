import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const ExplorarUsuarios = () => {
    const [query, setQuery] = useState('');
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagina, setPagina] = useState(1);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrev, setHasPrev] = useState(false);
    useEffect(() => { fetchUsuarios(1, ''); }, []);
    function buscar(e) {
        e.preventDefault();
        fetchUsuarios(1, query);
    }
    function fetchUsuarios(page, q) {
        setLoading(true);
        let url = `/api/usuarios/explorar/?page=${page}`;
        if (q) url += `&search=${encodeURIComponent(q)}`;
        fetch(url)
            .then(res => res.json())
            .then(data => {
                setUsuarios(data.results);
                setPagina(page);
                setHasNext(Boolean(data.next));
                setHasPrev(Boolean(data.previous));
            })
            .finally(() => setLoading(false));
    }
    return (
        <div style={{ maxWidth: 650, margin: '32px auto', background: '#fafbfc', borderRadius: 10, padding: 28, boxShadow: '0 1px 18px #0002' }}>
            <h2>Explorar Usuarios</h2>
            <form onSubmit={buscar} style={{marginBottom:18}}>
                <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nombre, usuario o bio..." style={{width:'70%',marginRight:14,padding:8}} />
                <button type="submit">Buscar</button>
            </form>
            {loading && <div>Cargando usuarios...</div>}
            <div style={{display:'flex', flexWrap:'wrap', gap:14, justifyContent:'center'}}>
                {usuarios.map(u => (
                    <div key={u.idUser} style={{ width:280, minHeight:166, background:'#fff', borderRadius:10, boxShadow:'0 0 8px #0001', margin:'8px 0', padding:12, display:'flex', gap:15 }}>
                        <img src={u.foto_perfil_url || '/default-user.png'} alt="foto" style={{ width:56, height:56, borderRadius:"50%", objectFit:"cover", border:'1px solid #ccc' }} />
                        <div style={{ flexGrow:1 }}>
                            <b>{u.NomUser} {u.ApePatUser}</b><br/>
                            <span style={{color:'#666'}}>@{u.UserName}</span>
                            <div style={{marginTop:5}}><span>{u.descripcion && u.descripcion.length > 82 ? u.descripcion.slice(0,80)+"..." : u.descripcion}</span></div>
                            <Link to={`/perfil/${u.UserName}`} style={{marginTop:10, display:'inline-block', color:'#088', fontWeight:'bold'}}>Ver perfil</Link>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{marginTop: 16, textAlign:'center'}}>
                <button disabled={!hasPrev} onClick={()=>fetchUsuarios(pagina-1,query)} style={{marginRight:8}}>Anterior</button>
                <span>Página {pagina}</span>
                <button disabled={!hasNext} onClick={()=>fetchUsuarios(pagina+1,query)} style={{marginLeft:8}}>Siguiente</button>
            </div>
        </div>
    );
};
export default ExplorarUsuarios;
