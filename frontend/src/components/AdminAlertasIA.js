import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function AdminAlertasIA() {
  const { user } = useAuth();
  const [alertas, setAlertas] = useState([]);
  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ tipo: '', label: '', usuario: '', score_min: '', score_max: '' });
  const [mostrarTodo, setMostrarTodo] = useState(false);

  function fetchAlertas(params = {}) {
    setLoading(true);
    const url = new URL('/api/alertas_ia/', window.location.origin);
    url.searchParams.set('page', params.page || page);
    if (filtros.tipo) url.searchParams.set('tipo', filtros.tipo);
    if (filtros.label) url.searchParams.set('label', filtros.label);
    if (filtros.usuario) url.searchParams.set('idUser', filtros.usuario);
    if (filtros.score_min) url.searchParams.set('score_min', filtros.score_min);
    if (filtros.score_max) url.searchParams.set('score_max', filtros.score_max);
    if (mostrarTodo) url.searchParams.set('mostrar_todo', '1');

    fetch(url, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setAlertas(data.results || []);
        setMaxPage(Math.ceil((data.count || 1) / 30));
        setLoading(false);
      });
  }

  useEffect(() => { fetchAlertas({ page: 1 }); }, [filtros, mostrarTodo]);

  if (!user || (user.userType !== 'Admin' && !user.isSuperuser)) {
    return <div style={{color:'crimson',textAlign:'center',marginTop:60}}>Acceso solo para administradores</div>;
  }

  const inputStyle = { margin: 4, padding: 3, borderRadius: 5, border: '1px solid #bcc' };

  return (
    <div style={{ maxWidth: 960, margin: '30px auto', background: '#fff', borderRadius: 12, border: '1px solid #ccc', padding: 24, boxShadow: '#abc3 0px 2px 20px' }}>
      <h2 style={{ textAlign: 'center', color: '#157acc' }}>Panel de Alertas IA — Moderación emocional</h2>
      <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap:12}}>
        <label style={{fontSize:15, color:'#444', userSelect: 'none'}}>
          <input type="checkbox" checked={mostrarTodo} onChange={e => setMostrarTodo(e.target.checked)} style={{marginRight:6}}/>
          Ver todos los análisis IA (incluye no-alertas)
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 14, justifyContent: 'space-between', gap: 10 }}>
        <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))} style={inputStyle}>
          <option value="">Todos los tipos</option>
          <option value="post">Post</option>
          <option value="comentario">Comentario</option>
          <option value="mensaje">Mensaje Directo</option>
          <option value="chatbot">Chatbot</option>
        </select>
        <input placeholder="Usuario (ID)" style={inputStyle} value={filtros.usuario}
               onChange={e => setFiltros(f => ({ ...f, usuario: e.target.value }))} />
        <input placeholder="Alerta/label (ej: suicidio, ansiedad)" style={inputStyle} value={filtros.label}
               onChange={e => setFiltros(f => ({ ...f, label: e.target.value }))} />
        <input placeholder="Score min" type="number" style={inputStyle} value={filtros.score_min}
               onChange={e => setFiltros(f => ({ ...f, score_min: e.target.value }))} />
        <input placeholder="Score max" type="number" style={inputStyle} value={filtros.score_max}
               onChange={e => setFiltros(f => ({ ...f, score_max: e.target.value }))} />
        <button onClick={() => fetchAlertas({ page: 1 })} style={{ ...inputStyle, background: '#157acc', color: '#fff' }}>Buscar</button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Página: </b>
        <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); fetchAlertas({ page: page - 1 }); }}>&lt;</button>
        <span style={{ margin: '0 10px' }}>{page} / {maxPage}</span>
        <button disabled={page >= maxPage} onClick={() => { setPage(p => p + 1); fetchAlertas({ page: page + 1 }); }}>&gt;</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#e6f2fa' }}>
              <th>Tipo</th>
              <th>Usuario</th>
              <th>Texto</th>
              <th>Label</th>
              <th>Score</th>
              <th>Fecha</th>
              <th>Alerta</th>
              <th>Extras</th>
            </tr>
          </thead>
          <tbody>
            {alertas.length === 0 && !loading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888' }}>Sin registros IA con ese filtro.</td></tr>
            )}
            {alertas.map((a, i) =>
              <tr key={i} style={{ borderBottom: '1px solid #eee', background: a.extra && a.extra.alerta ? '#ffe9da' : '#fff' }}>
                <td>{a.tipo}</td>
                <td>{a.usuario}</td>
                <td style={{ maxWidth: 340, fontSize: 15, whiteSpace: 'pre-wrap' }}>{a.texto}</td>
                <td><b>{a.label}</b></td>
                <td>{a.score}</td>
                <td>{a.fecha.split('T')[0]} {a.fecha.split('T')[1]?.slice(0,5)}</td>
                <td style={{fontWeight:600, color:a.extra&&a.extra.alerta?'crimson':'#888'}}>{a.extra && a.extra.alerta ? 'Alerta ⚠️' : 'No'}</td>
                <td>
                  {a.extra && typeof a.extra === 'object' &&
                    Object.entries(a.extra).filter(([k])=>k!=="alerta").map(([k, v]) => <span key={k}><b>{k}:</b> {String(v)}<br /></span>)
                  }
                </td>
              </tr>
            )}
            {loading && (
              <tr><td colSpan={8} style={{ color: '#9cc', textAlign: 'center' }}>Cargando datos...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default AdminAlertasIA;