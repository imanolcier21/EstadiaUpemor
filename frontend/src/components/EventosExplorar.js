import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function formateaFecha(fecha) {
  // SIEMPRE horario Ciudad de México
  if (!fecha) return '';
  const f = new Date(fecha);
  return f.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' });
}
function EventosExplorar() {
  const [eventos, setEventos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function fetchEventos() {
    setLoading(true); setMsg('');
    try {
      const url = '/api/eventos/?ordering=FechEvent&search=' + encodeURIComponent(search);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Error conexión eventos');
      const data = await res.json();
      setEventos(data.results || data);
    } catch {
      setMsg('Error de red'); setEventos([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchEventos(); }, []);

  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: '28px 14px' }}>
      <h2>Próximos eventos</h2>
      <div style={{marginBottom:14,display:'flex',alignItems:'center'}}>
        <input value={search} placeholder="Buscar evento, lugar o descripción"
               onChange={e => setSearch(e.target.value)}
               onKeyDown={e=>e.key==='Enter'?fetchEventos():null}
               style={{padding:7,width:260,marginRight:6}}/>
        <button onClick={fetchEventos}>Buscar</button>
      </div>
      {msg && <div style={{color:'#c33',marginBottom:7}}>{msg}</div>}
      {loading ? <div>Cargando...</div> : (
        eventos.length === 0 ? <div style={{color:'#999'}}>No hay eventos próximos.</div> : (
          <div style={{background:'#fff',border:'1px solid #dde',borderRadius:8}}>
            {eventos.map(e => (
              <div key={e.idEvento} style={{display:'flex',alignItems:'center',padding:'13px 0 13px 4px',borderBottom:'1px solid #eee'}}>
                <Link to={`/eventos/${e.idEvento}`} style={{fontWeight:600,fontSize:16,color:'#197'}}>{e.TituloEvent}</Link>
                <span style={{marginLeft:18,color:'#333'}}><b>{formateaFecha(e.FechEvent)}</b></span>
                <span style={{marginLeft:15, color:e.Estado==='vigente'?'#197b29':'#d44'}}>[{e.Estado}]</span>
                <span style={{marginLeft:12,color:'#888',fontSize:13}}>{e.asistentes_count} asist.</span>
                <span style={{marginLeft:'auto',color:'#888',fontSize:13}}>{e.LugarEvent}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default EventosExplorar;
