import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function EventoCrearEditar({ editar }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    TituloEvent: '', DescEvent: '', FechEvent: '', Duracion: '', LugarEvent: '', Modalidad: 'fisica', Estado: 'vigente'
  });
  const [msg, setMsg] = useState('');
  useEffect(()=>{
    if(editar && id) cargar();
    // eslint-disable-next-line
  },[editar,id]);
  async function cargar() {
    try{
      const res = await fetch(`/api/eventos/${id}/`, { credentials:'include' });
      const data = await res.json();
      setForm({ ...data, FechEvent: data.FechEvent ? data.FechEvent.substring(0,16) : '' });
    }catch{ setMsg('Error al cargar evento'); }
  }
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');
    // Convierte duración a formato "HH:MM:SS" si necesario
    let durForm = form.Duracion;
    if(durForm && !durForm.includes(':')) durForm += ':00';
    // Corrige la fecha para guardar EXACTAMENTE la hora MX
    let fechaLocal = form.FechEvent; // yyyy-MM-ddTHH:mm
    if (fechaLocal) {
      const match = fechaLocal.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})/);
      if (match) {
        // Usa hora MX: crea Date en UTC de esa hora local para México, suma el desfase
        const [_, y, m, d, hh, mm] = match;
        // Construye Date como si fuera MX local, pero compensa el offset
        const dt = new Date(Date.UTC(y, m-1, d, hh, mm));
        // Desde UTC resta el offset actual de MX respecto a UTC
        const mxOffsetHora = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City', hour12:false, hour:'2-digit' });
        const nowRealHora = new Date().getUTCHours();
        let mxOffset = nowRealHora - (+mxOffsetHora); // diferencia horas UTC - MX actual (ej. -6)
        dt.setUTCHours(dt.getUTCHours() + mxOffset);
        fechaLocal = dt.toISOString().slice(0,16);
      }
    }
    const body = { ...form, FechEvent: fechaLocal, Duracion: durForm };
    try{
      const url = editar ? `/api/eventos/${id}/` : '/api/eventos/';
      const method = editar ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        credentials:'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if(res.ok){
        setMsg('Guardado.');
        navigate('/eventos');
      }else{
        const data = await res.json();
        setMsg(data.error || JSON.stringify(data));
      }
    }catch{ setMsg('Error de red'); }
  }
  return (
    <div style={{ maxWidth:540, margin:'auto', padding:'25px 0' }}>
      <h2>{editar?'Editar Evento':'Crear Evento'}</h2>
      <form onSubmit={handleSubmit}>
        <div>Título: <input name="TituloEvent" required value={form.TituloEvent} onChange={handleChange}/></div>
        <div>Descripción: <textarea name="DescEvent" value={form.DescEvent} onChange={handleChange}/></div>
        <div>Fecha/hora: <input type="datetime-local" name="FechEvent" required value={form.FechEvent} onChange={handleChange}/></div>
        <div>Duración: <input name="Duracion" type="text" placeholder="hh:mm:ss" value={form.Duracion} onChange={handleChange}/></div>
        <div>Lugar: <input name="LugarEvent" value={form.LugarEvent} onChange={handleChange}/></div>
        <div>Modalidad:
          <select name="Modalidad" value={form.Modalidad} onChange={handleChange}>
            <option value="fisica">Física</option>
            <option value="virtual">Virtual</option>
          </select>
        </div>
        <button type="submit" style={{marginTop:11}}>{editar?'Guardar cambios':'Crear evento'}</button>
        {msg && <span style={{color:'#d44',marginLeft:15}}>{msg}</span>}
      </form>
    </div>
  );
}
export default EventoCrearEditar;
