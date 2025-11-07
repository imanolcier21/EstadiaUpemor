import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function MisGrupos() {
  const [grupos, setGrupos] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchMisGrupos(); }, []);

  async function fetchMisGrupos() {
    setLoading(true); setMsg('');
    try {
      const res = await fetch('/api/grupos/mis/', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar tus grupos');
      const data = await res.json();
      setGrupos(data.results || data);
    } catch {
      setMsg('Error de red'); setGrupos([]);
    } finally { setLoading(false); }
  }

  async function handleSalir(grupo) {
    if (!window.confirm(`¿Seguro que deseas salir del grupo "${grupo.NomGrupo}"?`)) return;
    setMsg('');
    try {
      const res = await fetch(`/api/grupos/${grupo.idGrupo}/salir/`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.status || 'Saliste del grupo');
        fetchMisGrupos();
      } else { setMsg(data.error || 'Error'); }
    } catch { setMsg('Error de red'); }
  }

  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: 30 }}>
      <h2>Mis Grupos</h2>
      {msg && <div style={{ color: '#c33', marginBottom: 10 }}>{msg}</div>}
      {loading ? <div>Cargando...</div> : (
        <div style={{ width:'100%', border:'1px solid #dde', borderRadius:8, background:'#fff', padding:12 }}>
          {grupos.length === 0 ? <div style={{ color:'#888' }}>Aún no eres miembro de ningún grupo.</div> : (
            grupos.map(g => (
              <div key={g.idGrupo} style={{ display:'flex', alignItems:'center', borderBottom:'1px solid #f1f1f1', padding:'13px 0' }}>
                <Link to={`/grupos/${g.idGrupo}`} style={{ fontWeight:600, fontSize:16, color:'#124'}}> {g.NomGrupo} </Link>
                {g.PrivGrupo === 'Privado' ? <span style={{ fontSize:13, color:'#a67', marginLeft:7 }}>[Privado]</span> : <span style={{ fontSize:13, color:'#5a8', marginLeft:7 }}>[Público]</span>}
                {g.creador_nombre === localStorage.username && <span style={{ color:'#275', marginLeft:8 }}>[Creador]</span>}
                <button onClick={() => handleSalir(g)} style={{ marginLeft:'auto' }}>Salir</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default MisGrupos;
