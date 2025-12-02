import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function GruposExplorar() {
  const [grupos, setGrupos] = useState([]);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    NomGrupo: '', DescGrupo: '', PrivGrupo: 'Publico', ReglasGrupo: '', ImagenGrupo: null
  });
  const navigate = useNavigate();

  useEffect(() => { fetchGrupos(); }, []);

  async function fetchGrupos() {
    setLoading(true);
    setMsg('');
    try {
      const url = '/api/grupos/?search=' + encodeURIComponent(search);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar grupos');
      const data = await res.json();
      setGrupos(data.results || data);
    } catch {
      setMsg('Error de conexión');
      setGrupos([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnirse(grupo) {
    setMsg('');
    try {
      const res = await fetch(`/api/grupos/${grupo.idGrupo}/unirse/`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.status || '¡Solicitud enviada!');
        fetchGrupos();
      } else {
        setMsg(data.error || 'Error');
      }
    } catch { setMsg('Error de red'); }
  }

  async function handleCrearGrupo(e) {
    e.preventDefault();
    setMsg('');
    const form = new FormData();
    Object.entries(formData).forEach(([k,v]) => {
      if (v) form.append(k, v);
    });
    try {
      const res = await fetch('/api/grupos/', {
        method: 'POST', credentials: 'include',
        body: form
      });
      const data = await res.json();
      if (res.ok && data && data.idGrupo) {
        setMsg('¡Grupo creado!');
        setFormOpen(false); setFormData({NomGrupo:'',DescGrupo:'',PrivGrupo:'Publico',ReglasGrupo:'',ImagenGrupo:null});
        navigate(`/grupos/${data.idGrupo}`);
      } else {
        setMsg((data && (data.error||JSON.stringify(data))) || 'Error');
      }
      fetchGrupos();
    } catch { setMsg('Error al crear grupo'); }
  }

  function handleInputChange(e) {
    const { name, value, files, type } = e.target;
    setFormData(f => ({ ...f, [name]: type === 'file' ? files[0] : value }));
  }

  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: 30 }}>
      <h2>Explorar grupos</h2>
      <div style={{ marginBottom: 18, display:'flex', alignItems:'center' }}>
        <input
          value={search}
          placeholder="Buscar por nombre o descripción"
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' ? fetchGrupos() : null}
          style={{ padding: 7, width: 260, marginRight: 6 }}
        />
        <button onClick={fetchGrupos}>Buscar</button>
        <button onClick={()=>setFormOpen(v=>!v)} style={{marginLeft:'auto', background:'#3477bb',color:'#fff',padding:'8px 15px',borderRadius:7}}>
          {formOpen? 'Cerrar':'Crear grupo'}
        </button>
      </div>
      {formOpen && (
        <form onSubmit={handleCrearGrupo} style={{ border:'1px solid #bbd', padding:14, borderRadius:9, marginBottom:18, background:'#f9fbfd' }}>
          <h4>Nuevo grupo</h4>
          <div>Nombre: <input name="NomGrupo" required value={formData.NomGrupo} onChange={handleInputChange} /></div>
          <div>Descripción: <input name="DescGrupo" value={formData.DescGrupo} onChange={handleInputChange} /></div>
          <div>Tipo: <select name="PrivGrupo" value={formData.PrivGrupo} onChange={handleInputChange}><option value="Publico">Público</option><option value="Privado">Privado</option></select></div>
          <div>Reglas: <textarea name="ReglasGrupo" value={formData.ReglasGrupo} onChange={handleInputChange} /></div>
          <div>Imagen (opcional): <input name="ImagenGrupo" type="file" accept="image/*" onChange={handleInputChange} /></div>
          <button type="submit" style={{marginTop:8}}>Crear</button>
        </form>)
      }
      {msg && <div style={{ color: msg.includes('cread')? '#2b5' : '#c33', marginBottom: 12 }}>{msg}</div>}
      {loading ? <div>Cargando...</div> : (
        <div style={{ width:'100%', border:'1px solid #dde', borderRadius:8, background:'#fff', padding:12 }}>
          {grupos.length === 0 ? <div style={{ color:'#888' }}>No hay grupos encontrados.</div> : (
            grupos.map(g => (
              <div key={g.idGrupo} style={{ display:'flex', alignItems:'center', borderBottom:'1px solid #f1f1f1', padding:'13px 0' }}>
                <Link to={`/grupos/${g.idGrupo}`} style={{ fontWeight:600, fontSize:16, color:'#124'}}> {g.NomGrupo} </Link>
                <span style={{ marginLeft:18, color:'#777', flex:1 }}>{g.DescGrupo}</span>
                {g.miembros_count !== undefined && <span style={{ fontSize:13, marginRight:10, color:'#999' }}>{g.miembros_count} miembros</span>}
                {g.PrivGrupo === 'Privado' ? <span style={{ fontSize:13, color:'#a67', marginRight:5 }}>[Privado]</span> : <span style={{ fontSize:13, color:'#5a8', marginRight:5 }}>[Público]</span>}
                {(g.estado === 'miembro' || g.estado==='aceptado') && <span style={{ color:'#1a4', marginLeft:8 }}>Ya eres miembro</span>}
                {g.estado === 'pendiente' && <span style={{ color:'#8a7', marginLeft:10 }}>Solicitud pendiente</span>}
                {(!g.estado) && <button onClick={() => handleUnirse(g)} style={{ marginLeft:6 }}>Unirse</button>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default GruposExplorar;
