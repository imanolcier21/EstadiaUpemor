import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function GrupoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [grupo, setGrupo] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [msg, setMsg] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ NomGrupo:'', DescGrupo:'', PrivGrupo:'Publico', ReglasGrupo:'', ImagenGrupo:null });

  useEffect(() => {
    fetchGrupo();
    fetchMiembros();
    fetchPendientes();
  // eslint-disable-next-line
  }, [id]);

  useEffect(()=>{
    if(grupo && user) {
      // Eres admin si eres el creador del grupo o admin plataforma
      setIsAdmin(grupo.idUser === user.idUser || user.userType === 'Admin' || user.isSuperuser);
    }
  }, [grupo, user]);

  async function fetchGrupo() {
    try {
      const res = await fetch(`/api/grupos/${id}/`, { credentials: 'include' });
      const data = await res.json();
      setGrupo(data);
      setEditForm({
        NomGrupo: data.NomGrupo || '',
        DescGrupo: data.DescGrupo || '',
        PrivGrupo: data.PrivGrupo || 'Publico',
        ReglasGrupo: data.ReglasGrupo || '',
        ImagenGrupo: null
      });
    } catch {}
  }
  async function fetchMiembros() {
    try {
      const res = await fetch(`/api/grupos/${id}/miembros/`, { credentials: 'include' });
      const data = await res.json();
      setMiembros(data.results || data);
    } catch {}
  }
  async function fetchPendientes() {
    try {
      const res = await fetch(`/api/grupos/${id}/pendientes/`, { credentials: 'include' });
      if (res.status === 403) { setPendientes([]); return; }
      const data = await res.json();
      setPendientes(data);
    } catch { setPendientes([]); }
  }
  async function handleUnirse() {
    setMsg('');
    try {
      const res = await fetch(`/api/grupos/${id}/unirse/`, { method:'POST', credentials:'include', headers:{'Content-Type': 'application/json'} });
      const data = await res.json();
      if (res.ok) setMsg(data.status||'Solicitud enviada');
      else setMsg(data.error||'Error');
      fetchGrupo();
    } catch { setMsg('Error de red'); }
  }
  async function handleSalir() {
    if (!window.confirm('¿Seguro que deseas salir de este grupo?')) return;
    setMsg('');
    try {
      const res = await fetch(`/api/grupos/${id}/salir/`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'} });
      const data = await res.json();
      if (res.ok) setMsg(data.status||'Saliste del grupo');
      else setMsg(data.error||'Error');
      fetchGrupo(); fetchMiembros();
    } catch { setMsg('Error de red'); }
  }
  async function handleAceptar(userId) {
    await fetch(`/api/grupos/${id}/aceptar_miembro/`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({idUser:userId}) });
    fetchMiembros(); fetchPendientes();
  }
  async function handleRechazar(userId) {
    await fetch(`/api/grupos/${id}/rechazar_miembro/`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({idUser:userId}) });
    fetchPendientes();
  }
  async function handleExpulsar(userId) {
    if (!window.confirm('¿Seguro de expulsar a este miembro?')) return;
    await fetch(`/api/grupos/${id}/expulsar/`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({idUser:userId}) });
    fetchMiembros();
  }
  async function handleEditSubmit(e) {
    e.preventDefault();
    const form = new FormData();
    Object.entries(editForm).forEach(([k,v]) => {
      if (k === 'ImagenGrupo' && !v) return;
      form.append(k, v);
    });
    setMsg('');
    try {
      const res = await fetch(`/api/grupos/${id}/`, { method:'PATCH', credentials:'include', body:form });
      const data = await res.json();
      if (res.ok) {
        setMsg('Guardado.');
        setEditOpen(false);
        fetchGrupo();
      } else {
        setMsg(data.error||JSON.stringify(data));
      }
    } catch { setMsg('Error al guardar'); }
  }
  function handleEditChange(e) {
    const { name, value, files, type } = e.target;
    setEditForm(f => ({ ...f, [name]: type === 'file' ? files[0] : value }));
  }
  async function handleEliminarGrupo() {
    if (!window.confirm('¿Seguro que deseas ELIMINAR este grupo? Esta acción es IRREVERSIBLE.')) return;
    setMsg('');
    try {
      const res = await fetch(`/api/grupos/${id}/`, { method:'DELETE', credentials:'include' });
      if (res.ok) {
        navigate('/grupos');
      } else {
        setMsg('No se pudo eliminar');
      }
    } catch { setMsg('Error al eliminar grupo'); }
  }
  if (!grupo) return <div>Cargando grupo...</div>;
  return (
    <div style={{ maxWidth:800, margin:'auto', padding:32 }}>
      <h2>{grupo.NomGrupo} {grupo.PrivGrupo === 'Privado' ? <span style={{fontSize:15, color:'#a67'}}>[Privado]</span> : <span style={{fontSize:15, color:'#5a8'}}>[Público]</span>}</h2>
      {grupo.ImagenGrupo && grupo.imagen_url &&
        <img src={grupo.imagen_url} alt="Imagen Grupo" style={{ width: 100, borderRadius: 8, marginBottom: 7 }} />}
      <div>{grupo.DescGrupo}</div>
      <div style={{marginTop:5, fontSize:14}}><b>Reglas:</b> {grupo.ReglasGrupo || 'Sin información.'}</div>
      <div style={{marginTop:5, fontSize:14}}><b>Creador:</b> {grupo.creador_nombre}</div>
      <div style={{marginTop:5, fontSize:14}}><b>Miembros:</b> {grupo.miembros_count}</div>
      {msg && <div style={{margin:10, color:msg==='Guardado.'?'#197b29':'#b23'}}>{msg}</div>}
      {(grupo.estado === 'miembro' || grupo.estado === 'aceptado') && <button onClick={handleSalir}>Salir del grupo</button>}
      {grupo.estado === 'pendiente' && <span style={{color:'#aa8',marginLeft:11}}>Solicitud pendiente</span>}
      {(!grupo.estado) && <button onClick={handleUnirse}>Unirse</button>}
      {isAdmin && (
        <div style={{marginTop:30}}>
          <button onClick={()=>setEditOpen(o=>!o)} style={{background:'#197b29', color:'#fff', padding:'10px 24px', borderRadius:9, fontSize:18, fontWeight:600, marginBottom:16,border:'none',boxShadow:'0 2px 8px #cdde'}}>
            {editOpen ? 'Cerrar edición de administración':'Editar grupo / Administrar'}
          </button>
          {editOpen && (
            <div style={{background:'#fcfcfc',border:'3px solid #197b29',borderRadius:12,padding:21,maxWidth:530,margin:'25px auto'}}>
              <form onSubmit={handleEditSubmit} >
                <div><b>Nombre:</b> <input required name="NomGrupo" value={editForm.NomGrupo} onChange={handleEditChange} /></div>
                <div><b>Descripción:</b> <input name="DescGrupo" value={editForm.DescGrupo} onChange={handleEditChange} /></div>
                <div><b>Tipo:</b> <select name="PrivGrupo" value={editForm.PrivGrupo} onChange={handleEditChange}><option value="Publico">Público</option><option value="Privado">Privado</option></select></div>
                <div><b>Reglas:</b> <textarea name="ReglasGrupo" value={editForm.ReglasGrupo} onChange={handleEditChange}/></div>
                <div><b>Imagen nuevo (opcional):</b> <input type="file" name="ImagenGrupo" accept="image/*" onChange={handleEditChange}/></div>
                <div style={{marginTop:9}}>
                  <button type="submit" style={{marginRight:12, background:'#197b29', color:'#fff'}}>Guardar cambios</button>
                  <button type="button" style={{marginLeft:5,color:'#fff',background:'#a82222'}} onClick={handleEliminarGrupo}>Eliminar grupo</button>
                </div>
              </form>
              <hr style={{margin:'18px 0'}}/>
              <h4>Miembros actuales</h4>
              <div style={{display:'flex', flexWrap:'wrap', gap:5}}>
                {miembros.map(m => (
                  <span key={m.idUser} style={{ background:'#e6efed',margin:'3px 9px 2px 0',padding:'6px 15px',borderRadius:13,fontSize:16 }}>
                    {m.user_nombre} {m.Rol==='Admin' && <b style={{color:'#379',marginLeft:8}}>[Admin]</b>}
                    {isAdmin && m.user_nombre!==localStorage.username &&
                      <button onClick={()=>handleExpulsar(m.idUser)} style={{ marginLeft:14, color:'#e43', background:'none', border:'none',fontWeight:'bold',cursor:'pointer' }} title="Expulsar">Expulsar</button>}
                  </span>
                ))}
              </div>
              <hr style={{margin:'18px 0'}}/>
              <h4>Solicitudes pendientes</h4>
              {pendientes.length === 0 && <div style={{color:'#bbb',margin:'8px 0 16px'}}>Sin solicitudes nuevas</div>}
              {pendientes.map(p => (
                <div key={p.idUser} style={{margin:'10px 0',padding:7,background:'#ffe',borderRadius:8}}>
                  <span style={{fontWeight:600,marginRight:13}}>{p.user_nombre}</span>
                  <button onClick={()=>handleAceptar(p.idUser)} style={{marginRight:8,background:'#29a13a',color:'#fff',padding:'1px 8px',borderRadius:6}}>Aceptar</button>
                  <button onClick={()=>handleRechazar(p.idUser)} style={{color:'#fff',background:'#a33',padding:'1px 10px',borderRadius:7}}>Rechazar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GrupoDetalle;
