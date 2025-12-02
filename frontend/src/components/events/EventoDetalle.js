import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function formateaFecha(fecha) {
  // SIEMPRE horario Ciudad de México
  if (!fecha) return '';
  const f = new Date(fecha);
  return f.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' });
}
function EventoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [evento, setEvento] = useState(null);
  const [asistentes, setAsistentes] = useState([]);
  const [msg, setMsg] = useState('');
  const [inscrito, setInscrito] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(()=>{ fetchEvento(); fetchAsistentes(); },[id]);

  useEffect(()=>{
    if (evento && user) {
      setEsAdmin(user.idUser === evento.creador || user.userType === 'Admin' || user.isSuperuser);
    }
  },[evento,user]);

  async function fetchEvento() {
    try {
      const res = await fetch(`/api/eventos/${id}/`, { credentials: 'include' });
      const data = await res.json();
      setEvento(data);
      // Si la API devolviera info de inscripción, aquí se puede comprobar
    } catch { setEvento(null); }
  }
  async function fetchAsistentes() {
    try {
      const res = await fetch(`/api/eventos/${id}/asistentes/`, { credentials: 'include' });
      const data = await res.json();
      setAsistentes(data);
      // ¿Está inscrito el usuario?
      if (user && Array.isArray(data))
        setInscrito(data.some(a => a.idUser === user.idUser));
    } catch { setAsistentes([]); }
  }
  async function handleInscribir() {
    setMsg('');
    try {
      const res = await fetch(`/api/eventos/${id}/inscribir/`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'} });
      const data = await res.json();
      if(res.ok){ setMsg('Inscripción exitosa'); fetchAsistentes(); }
      else setMsg(data.error||'Error');
    } catch{ setMsg('Error al inscribirse');}
  }
  async function handleDesinscribir() {
    setMsg('');
    try {
      const res = await fetch(`/api/eventos/${id}/desinscribir/`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'} });
      const data = await res.json();
      if(res.ok){ setMsg('Inscripción cancelada'); fetchAsistentes(); }
      else setMsg(data.error||'Error');
    } catch{ setMsg('Error al cancelar');}
  }
  async function handleEliminar() {
    if (!window.confirm('¿Seguro que deseas ELIMINAR este evento? Esta acción es irreversible.')) { return; }
    setMsg('');
    try {
      const res = await fetch(`/api/eventos/${id}/`, { method:'DELETE', credentials:'include' });
      if(res.ok) navigate('/eventos');
      else setMsg('No se pudo eliminar.');
    } catch { setMsg('Error de red al eliminar.'); }
  }
  function irEditar() { navigate(`/eventos/${id}/editar`); }
  if (!evento) return <div>Cargando evento...</div>;
  return (
    <div style={{ maxWidth:600, margin:'auto', padding: '34px 0' }}>
      <h2>{evento.TituloEvent}</h2>
      <div><b>Descripción:</b> {evento.DescEvent}</div>
      <div><b>Fecha/hora:</b> {formateaFecha(evento.FechEvent)}</div>
      <div><b>Duración:</b> {evento.Duracion? evento.Duracion: 'No indicada'}</div>
      <div><b>Lugar:</b> {evento.LugarEvent}</div>
      <div><b>Modalidad:</b> {evento.Modalidad ? evento.Modalidad : 'No indicado'}</div>
      <div><b>Estado:</b> <span style={{color:evento.Estado==='vigente'?'#197b29':'#d44'}}>{evento.Estado}</span></div>
      <div><b>Creador:</b> {evento.creador_nombre}</div>
      {msg && <div style={{color:'#c33',margin:'12px 0'}}>{msg}</div>}
      {user && !esAdmin && evento.Estado==='vigente' && (
        <>
          {inscrito ? (
            <button onClick={handleDesinscribir}>Cancelar inscripción</button>
          ) : (
            <button onClick={handleInscribir}>Inscribirse</button>
          )}
        </>
      )}
      <hr style={{margin:'18px 0'}}/>
      <h4>Asistentes inscritos</h4>
      <div style={{fontSize:14,color:'#168',margin:'6px 0'}}>
        {asistentes.length === 0 && <span style={{color:'#aaa'}}>Sin inscripciones aún.</span>}
        {asistentes.map(a => <span key={a.idUser} style={{marginRight:13}}>{a.user_nombre}</span>)}
      </div>
      {esAdmin && (
        <div style={{marginTop:20}}>
          <button style={{marginRight:12}} onClick={irEditar}>Editar evento</button>
          <button style={{background:'#d02222',color:'#fff',marginLeft:8}} onClick={handleEliminar}>Eliminar evento</button>
        </div>
      )}
    </div>
  );
}
export default EventoDetalle;
