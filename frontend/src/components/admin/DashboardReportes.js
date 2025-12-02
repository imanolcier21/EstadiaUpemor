import jsPDF from 'jspdf';
import 'jspdf-autotable'; // CAMBIO: Solo se importa para registrar el plugin
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bar, Pie, Line } from 'react-chartjs-2';
import 'chart.js/auto';

// SE ELIMINÓ la línea 'autoTable(jsPDF);' que causaba el error

function DashboardReportes() {
  const { user } = useAuth();
  const [tab, setTab] = useState('actividad');
  // Actividad
  const [actividadDiaria, setActividadDiaria] = useState([]);
  const [actividadTipo, setActividadTipo] = useState({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Sentimiento
  const [sentDistrib, setSentDistrib] = useState({});
  const [sentEvol, setSentEvol] = useState([]);
  const [sentFecha1, setSentFecha1] = useState('');
  const [sentFecha2, setSentFecha2] = useState('');
  const [sentLoading, setSentLoading] = useState(false);
  const [sentError, setSentError] = useState('');
  // Interacciones Chatbot
  const [cbFecha1, setCbFecha1] = useState('');
  const [cbFecha2, setCbFecha2] = useState('');
  const [cbData, setCbData] = useState(null);
  const [cbLoading, setCbLoading] = useState(false);
  const [cbError, setCbError] = useState('');
  // Recursos Apoyo
  const [raTipo, setRaTipo] = useState('');
  const [raCat, setRaCat] = useState('');
  const [raFecha1, setRaFecha1] = useState('');
  const [raFecha2, setRaFecha2] = useState('');
  const [raData, setRaData] = useState(null);
  const [raLoading, setRaLoading] = useState(false);
  const [raError, setRaError] = useState('');
  // Grupos activos
  const [gaTipo, setGaTipo] = useState('');
  const [gaF1, setGaF1] = useState('');
  const [gaF2, setGaF2] = useState('');
  const [gaData, setGaData] = useState(null);
  const [gaLoading, setGaLoading] = useState(false);
  const [gaError, setGaError] = useState('');
  // Eventos asistencia
  const [evF1, setEvF1] = useState('');
  const [evF2, setEvF2] = useState('');
  const [evTipo, setEvTipo] = useState('');
  const [evEstado, setEvEstado] = useState('');
  const [evMin, setEvMin] = useState('');
  const [evData, setEvData] = useState(null);
  const [evLoading, setEvLoading] = useState(false);
  const [evError, setEvError] = useState('');
  // Fechas default para todos los tabs
  useEffect(() => {
    const today = new Date();
    const prior = new Date();
    prior.setDate(today.getDate() - 14);
    setDateTo(today.toISOString().slice(0, 10));
    setDateFrom(prior.toISOString().slice(0, 10));
    setSentFecha2(today.toISOString().slice(0, 10));
    setSentFecha1(prior.toISOString().slice(0, 10));
    setCbFecha2(today.toISOString().slice(0, 10));
    setCbFecha1(prior.toISOString().slice(0, 10));
    setRaFecha2(today.toISOString().slice(0, 10));
    setRaFecha1(prior.toISOString().slice(0, 10));
    setGaF2(today.toISOString().slice(0, 10));
    setGaF1(prior.toISOString().slice(0, 10));
    setEvF2(today.toISOString().slice(0, 10));
    setEvF1(prior.toISOString().slice(0, 10));
  }, []);

  // Actividad usuarios
  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    setLoading(true); setError('');
    fetch(`/api/reportes/actividad_usuarios/?date_from=${dateFrom}&date_to=${dateTo}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setActividadDiaria(data.actividad_diaria || []);
        setActividadTipo(data.actividad_tipo_usuario || {});
        setLoading(false);
      }).catch(e => { setError('Error cargando datos'); setLoading(false); });
  }, [dateFrom, dateTo]);

  // Sentimiento publicaciones
  useEffect(() => {
    if (!sentFecha1 || !sentFecha2) return;
    setSentLoading(true); setSentError('');
    fetch(`/api/reportes/sentimiento_publicaciones/?date_from=${sentFecha1}&date_to=${sentFecha2}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setSentDistrib(data.sentimiento_distribucion || {});
        setSentEvol(data.evolucion || []);
        setSentLoading(false);
      }).catch(e => { setSentError('Error cargando sentimiento'); setSentLoading(false); });
  }, [sentFecha1, sentFecha2]);

  // Fetch datos chatbot
  useEffect(() => {
    if (!cbFecha1 || !cbFecha2) return;
    if (tab !== 'chatbot') return;
    setCbLoading(true); setCbError('');
    fetch(`/api/reportes/interacciones_chatbot/?date_from=${cbFecha1}&date_to=${cbFecha2}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setCbData(data); setCbLoading(false); })
      .catch(e => { setCbError('Error cargando interacciones'); setCbLoading(false); });
  }, [cbFecha1, cbFecha2, tab]);

  // Recursos Apoyo
  useEffect(() => {
    if (!raFecha1 || !raFecha2) return;
    if (tab !== 'recursos') return;
    setRaLoading(true); setRaError('');
    let url = `/api/reportes/recursos_apoyo/?date_from=${raFecha1}&date_to=${raFecha2}`;
    if (raTipo) url += `&tipo=${raTipo}`;
    if (raCat) url += `&categoria=${raCat}`;
    fetch(url, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setRaData(data); setRaLoading(false); })
      .catch(e => { setRaError('Error cargando recursos'); setRaLoading(false); });
  }, [raFecha1, raFecha2, raTipo, raCat, tab]);

  // Grupos activos
  useEffect(() => {
    if (!gaF1 || !gaF2) return;
    if (tab !== 'grupos') return;
    setGaLoading(true); setGaError('');
    let url = `/api/reportes/grupos_activos/?date_from=${gaF1}&date_to=${gaF2}`;
    if (gaTipo) url += `&tipo=${gaTipo}`;
    fetch(url, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setGaData(data); setGaLoading(false); })
      .catch(e => { setGaError('Error cargando grupos'); setGaLoading(false); });
  }, [gaF1, gaF2, gaTipo, tab]);

  // Eventos asistencia
  useEffect(() => {
    if (!evF1 || !evF2) return;
    if (tab !== 'eventos') return;
    setEvLoading(true); setEvError('');
    let url = `/api/reportes/eventos_mayor_asistencia/?date_from=${evF1}&date_to=${evF2}`;
    if (evTipo) url += `&tipo=${evTipo}`;
    if (evEstado) url += `&estado=${evEstado}`;
    if (evMin) url += `&min_asist=${evMin}`;
    fetch(url, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setEvData(data); setEvLoading(false); })
      .catch(e => { setEvError('Error cargando eventos'); setEvLoading(false); });
  }, [evF1, evF2, evTipo, evEstado, evMin, tab]);

  // Tendencias carrera
  const [tcCarreras, setTcCarreras] = useState([]);
  const [tcC, setTcC] = useState('');
  const [tcF1, setTcF1] = useState('');
  const [tcF2, setTcF2] = useState('');
  const [tcTipo, setTcTipo] = useState('actividad');
  const [tcData, setTcData] = useState(null);
  const [tcLoading, setTcLoading] = useState(false);
  const [tcError, setTcError] = useState('');
  useEffect(() => { // fetch carreras solo una vez
    fetch('/api/carreras/').then(r => r.json()).then(data => setTcCarreras(data)).catch(() => { });
    const today = new Date();
    const prior = new Date(); prior.setDate(today.getDate() - 14);
    setTcF2(today.toISOString().slice(0, 10));
    setTcF1(prior.toISOString().slice(0, 10));
  }, []);
  useEffect(() => {
    if (!tcF1 || !tcF2) return;
    if (tab !== 'tendencias') return;
    setTcLoading(true); setTcError('');
    let url = `/api/reportes/tendencias_carrera/?date_from=${tcF1}&date_to=${tcF2}`;
    if (tcC) url += `&idCarrera=${tcC}`;
    if (tcTipo) url += `&tipoMetrica=${tcTipo}`;
    fetch(url, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setTcData(data); setTcLoading(false); })
      .catch(e => { setTcError('Error cargando tendencias'); setTcLoading(false); });
  }, [tcF1, tcF2, tcC, tcTipo, tab]);

  // Notificaciones
  const [notTipo, setNotTipo] = useState('');
  const [notEnt, setNotEnt] = useState('');
  const [notUser, setNotUser] = useState('');
  const [notF1, setNotF1] = useState('');
  const [notF2, setNotF2] = useState('');
  const [notData, setNotData] = useState(null);
  const [notLoading, setNotLoading] = useState(false);
  const [notError, setNotError] = useState('');
  useEffect(() => {
    const today = new Date();
    const prior = new Date(); prior.setDate(today.getDate() - 14);
    setNotF2(today.toISOString().slice(0, 10));
    setNotF1(prior.toISOString().slice(0, 10));
  }, []);
  useEffect(() => {
    if (!notF1 || !notF2) return;
    if (tab !== 'notificaciones') return;
    setNotLoading(true); setNotError('');
    let url = `/api/reportes/notificaciones/?date_from=${notF1}&date_to=${notF2}`;
    if (notTipo) url += `&tipo=${notTipo}`;
    if (notEnt) url += `&type_entrega=${notEnt}`;
    if (notUser) url += `&idUser=${notUser}`;
    fetch(url, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setNotData(data); setNotLoading(false); })
      .catch(e => { setNotError('Error cargando notificaciones'); setNotLoading(false); });
  }, [notF1, notF2, notTipo, notEnt, notUser, tab]);

  // Exportar PDF Actividad
  function exportActividadPDF() {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleString('es-MX');
    doc.setFontSize(16);
    doc.setTextColor('#157acc');
    doc.text('Reporte de Actividad de Usuarios', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor('#222');
    doc.text(`Filtros: Del ${dateFrom} al ${dateTo}`, 14, 25);
    doc.text(`Generado: ${fecha}`, 14, 31);
    // Tabla 1: actividad diaria
    doc.setFontSize(12);
    doc.text('Actividad diaria (posts + comentarios)', 14, 42);
    doc.autoTable({
      head: [['Fecha', 'Posts', 'Comentarios', 'Total']],
      body: actividadDiaria.map(r => [r.fecha, r.posts, r.comentarios, r.total]),
      startY: 45, theme: 'grid', headStyles: { fillColor: '#b8daff' }, styles: { fontSize: 9 }
    });
    // Tabla 2: actividad por tipo
    let body = Object.entries(actividadTipo).map(([tipo, tot]) => [tipo, tot]);
    doc.text('Actividad por tipo de usuario', 14, doc.lastAutoTable.finalY + 12);
    doc.autoTable({
      head: [['Tipo de usuario', 'Acciones']],
      body,
      startY: doc.lastAutoTable.finalY + 15, theme: 'grid', headStyles: { fillColor: '#ffd18c' }, styles: { fontSize: 9 }
    });
    doc.save('reporte_actividad_usuarios.pdf');
  }

  // Exportar Excel Actividad
  function exportActividadExcel() {
    const ws1 = XLSX.utils.json_to_sheet(actividadDiaria.map(r => ({ Fecha: r.fecha, Posts: r.posts, Comentarios: r.comentarios, Total: r.total })));
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Tipo de usuario', 'Acciones'], ...Object.entries(actividadTipo)
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Actividad diaria');
    XLSX.utils.book_append_sheet(wb, ws2, 'Por tipo de usuario');
    const fecha = new Date().toISOString().replace(/[:\-]/g, '_').slice(0, 16);
    const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `actividad_usuarios_${fecha}.xlsx`);
  }

  // Exportar PDF Sentimiento
  function exportSentimientoPDF() {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleString('es-MX');
    doc.setFontSize(16);
    doc.setTextColor('#2e86c1');
    doc.text('Reporte de Sentimiento General de Publicaciones', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor('#222');
    doc.text(`Filtros: Del ${sentFecha1} al ${sentFecha2}`, 14, 25);
    doc.text(`Generado: ${fecha}`, 14, 31);
    // Tabla 1: Distribución de sentimientos
    doc.setFontSize(12);
    doc.text('Distribución de sentimientos', 14, 42);
    doc.autoTable({
      head: [['Sentimiento', 'Cantidad']],
      body: Object.entries(sentDistrib).map(([s, tot]) => [s, tot]),
      startY: 45, theme:'grid', headStyles:{fillColor:'#b8e8fc'}, styles:{fontSize:9}
    });
    // Tabla 2: Evolución del promedio
    doc.text('Evolución del sentimiento (promedio)', 14, doc.lastAutoTable.finalY+12);
    doc.autoTable({
      head: [['Fecha', 'Score promedio']],
      body: sentEvol.map(e => [e.fecha, (e.score_promedio ?? '').toString().slice(0,6)]),
      startY: doc.lastAutoTable.finalY+15, theme:'grid', headStyles:{fillColor:'#d2d7e9'}, styles:{fontSize:9}
    });
    doc.save('reporte_sentimiento_publicaciones.pdf');
  }
  // Exportar Excel Sentimiento
  function exportSentimientoExcel() {
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['Sentimiento', 'Cantidad'], ...Object.entries(sentDistrib)
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Fecha', 'Score promedio'], ...sentEvol.map(e => [e.fecha, e.score_promedio ?? ''])
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Distribución');
    XLSX.utils.book_append_sheet(wb, ws2, 'Evolución');
    const fecha = new Date().toISOString().replace(/[:\-]/g,'_').slice(0,16);
    const wbout = XLSX.write(wb, { type:'array', bookType:'xlsx' });
    saveAs(new Blob([wbout],{type:'application/octet-stream'}), `sentimiento_publicaciones_${fecha}.xlsx`);
  }

  // Exportar Excel Interacciones Chatbot
  function exportChatbotExcel() {
    if (!cbData) return;
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['Fecha', 'Total Interacciones'],
      ...cbData.interacciones_diarias.map(d => [d.fecha, d.total])
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Tópico/Tema', 'Consultas'],
      ...cbData.top_topics.map(t => [t.topic, t.total])
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Interacciones x día');
    XLSX.utils.book_append_sheet(wb, ws2, 'Tópicos más consultados');
    const fecha = new Date().toISOString().replace(/[:\-]/g,'_').slice(0,16);
    const wbout = XLSX.write(wb, { type:'array', bookType:'xlsx' });
    saveAs(new Blob([wbout],{type:'application/octet-stream'}), `interacciones_chatbot_${fecha}.xlsx`);
  }

  // Exportar PDF Recursos de Apoyo
  function exportRecursosPDF() {
    if (!raData) return;
    const doc = new jsPDF();
    const fecha = new Date().toLocaleString('es-MX');
    doc.setFontSize(15);
    doc.setTextColor('#358b52');
    doc.text('Reporte de Uso de Recursos de Apoyo', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor('#222');
    doc.text(`Generado: ${fecha}`, 14, 24);
    doc.text(`Filtros: Tipo: ${raTipo||'Todos'} / Categoría: ${raCat||'Todas'} / Fechas: ${raFecha1} a ${raFecha2}`, 14, 30);
    // Top recursos
    doc.setFontSize(12);
    doc.text('Top recursos más consultados', 14, 42);
    doc.autoTable({
      head: [['Título', 'Tipo', 'Categoría', 'Vistas', 'Descargas']],
      body: raData.top_recursos.map(r => [r.titulo, r.tipo, r.categoria, r.contador_vistas, r.contador_descargas]),
      startY: 46, theme:'grid', headStyles:{fillColor:'#b7e6c7'}, styles:{fontSize:9}
    });
    doc.save('reporte_recursos_apoyo.pdf');
  }

  // Exportar PDF y Excel Eventos con Mayor Asistencia
  function exportEventosPDF() {
    if (!evData) return;
    const doc = new jsPDF();
    const fecha = new Date().toLocaleString('es-MX');
    doc.setFontSize(15);
    doc.setTextColor('#e48949');
    doc.text('Reporte de Eventos con Mayor Asistencia', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor('#222');
    doc.text(`Generado: ${fecha}`, 14, 24);
    doc.text(`Filtros: Tipo: ${evTipo||'Todos'} / Estado: ${evEstado||'Todos'} / Fechas: ${evF1} a ${evF2}`, 14, 30);
    doc.text(`Mínimo asistentes: ${evMin||'0'}`, 14, 36);
    doc.text('Top eventos por asistencia', 14, 46);
    doc.autoTable({
      head: [['Título', 'Tipo', 'Estado', 'Fecha', 'Asistentes']],
      body: evData.top_eventos.map(e=>[e.TituloEvent,e.Modalidad,e.Estado,e.Fecha?.split('T')[0],e.asistentes]),
      startY: 50, theme:'grid', headStyles:{fillColor:'#fcd5ae'}, styles:{fontSize:9}
    });
    doc.save('reporte_eventos_asistencia.pdf');
  }
  function exportEventosExcel() {
    if (!evData) return;
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['Título','Tipo','Estado','Fecha','Asistentes'],
      ...evData.top_eventos.map(e=>[e.TituloEvent,e.Modalidad,e.Estado,e.Fecha?.split('T')[0],e.asistentes])
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Fecha', 'Total asistentes/día'], ...evData.tendencia.map(t=>[t.fecha, t.total_asistentes_dia])
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Top eventos');
    XLSX.utils.book_append_sheet(wb, ws2, 'Tendencia asistencia');
    const fecha = new Date().toISOString().replace(/[:\-]/g,'_').slice(0,16);
    const wbout = XLSX.write(wb, { type:'array', bookType:'xlsx' });
    saveAs(new Blob([wbout],{type:'application/octet-stream'}), `eventos_asistencia_${fecha}.xlsx`);
  }

  // Exportar Excel Tendencias por Carrera
  function exportTendenciasExcel() {
    if (!tcData) return;
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['Carrera','Total Posts','Total Comentarios','Sentimiento promedio','Usuarios'],
      ...tcData.resumen.map(r=>[r.NomCarrera,r.total_posts,r.total_comentarios,r.sentimiento_avg,r.usuarios])
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Fecha','Carrera','Posts','Comentarios','Sentimiento prom.'],
      ...tcData.evolucion.map(e=>[e.fecha,e.NomCarrera,e.posts,e.comentarios,e.sent_avg])
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen carreras');
    XLSX.utils.book_append_sheet(wb, ws2, 'Evolución');
    const fecha = new Date().toISOString().replace(/[:\-]/g,'_').slice(0,16);
    const wbout = XLSX.write(wb, { type:'array', bookType:'xlsx' });
    saveAs(new Blob([wbout],{type:'application/octet-stream'}), `tendencias_carrera_${fecha}.xlsx`);
  }

  if (!user || (user.userType !== 'Admin' && !user.isSuperuser)) {
    return <div style={{ color: 'crimson', textAlign: 'center', padding: 40 }}>Acceso solo para administradores</div>;
  }

  // Datos para gráficas - actividad
  const labels = actividadDiaria.map(a => a.fecha);
  const barData = {
    labels,
    datasets: [
      { label: 'Publicaciones', data: actividadDiaria.map(a => a.posts), backgroundColor: '#5ac2fa' },
      { label: 'Comentarios', data: actividadDiaria.map(a => a.comentarios), backgroundColor: '#aecfff' }
    ]
  };
  const pieData = {
    labels: Object.keys(actividadTipo),
    datasets: [
      { data: Object.values(actividadTipo), backgroundColor: ['#5ac2fa', '#ffc090', '#d3566a'] }
    ]
  };
  // Datos para gráficas - sentimiento
  const sentLabels = Object.keys(sentDistrib);
  const sentPie = {
    labels: sentLabels,
    datasets: [
      { data: Object.values(sentDistrib), backgroundColor: ['#5ac2fa', '#ffa18e', '#ddd', '#70e079', '#beb5f6', '#bff9fb'] }
    ]
  };
  const sentEvoLabels = sentEvol.map(e => e.fecha);
  const sentEvoData = {
    labels: sentEvoLabels,
    datasets: [
      { label: 'Score promedio', data: sentEvol.map(e => e.score_promedio), fill: false, borderColor: '#27bbaf', backgroundColor: '#68e9b8' }
    ]
  };

  return (
    <div style={{ maxWidth: 1200, margin: '25px auto', background: '#fff', borderRadius: 12, padding: 24, boxShadow: '#bbe3 0px 2px 18px' }}>
      <h2 style={{ textAlign: 'center', color: '#157acc' }}>Dashboard de Reportes</h2>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 18 }}>
        <button className={tab === 'actividad' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('actividad')}>Actividad usuarios</button>
        <button className={tab === 'sentimiento' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('sentimiento')}>Sentimiento publicaciones</button>
        <button className={tab === 'chatbot' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('chatbot')}>Interacciones chatbot</button>
        <button className={tab === 'recursos' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('recursos')}>Recursos de Apoyo</button>
        <button className={tab === 'grupos' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('grupos')}>Grupos más Activos</button>
        <button className={tab === 'eventos' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('eventos')}>Eventos con Mayor Asistencia</button>
        <button className={tab === 'tendencias' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('tendencias')}>Tendencias por Carrera</button>
        <button className={tab === 'notificaciones' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('notificaciones')}>Notificaciones Enviadas</button>
      </div>
      {tab === 'actividad' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '16px 0' }}>
            <label>Fecha inicio <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></label>
            <label>Fecha fin <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'end', gap: 8, marginBottom: 8 }}>
            <button onClick={exportActividadPDF} className="primary-button">Exportar PDF</button>
            <button onClick={exportActividadExcel} className="primary-button">Exportar Excel</button>
          </div>
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 0 320px', minWidth: 320 }}>
              <h4>Actividad diaria (posts y comentarios)</h4>
              <Bar data={barData} height={210} />
            </div>
            <div style={{ flex: '0 0 320px', minWidth: 260, maxWidth: 400 }}>
              <h4>Actividad por tipo de usuario</h4>
              <Pie data={pieData} height={210} />
            </div>
          </div>
          {loading && <div style={{ color: '#888', textAlign: 'center', margin: 20 }}>Cargando datos...</div>}
          {error && <div style={{ color: 'crimson', margin: 16 }}>{error}</div>}
        </>
      )}
      {tab === 'sentimiento' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '16px 0' }}>
            <label>Fecha inicio <input type="date" value={sentFecha1} onChange={e => setSentFecha1(e.target.value)} /></label>
            <label>Fecha fin <input type="date" value={sentFecha2} onChange={e => setSentFecha2(e.target.value)} /></label>
          </div>
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 340px', minWidth: 240, maxWidth: 480 }}>
              <h4>Distribución de sentimientos</h4>
              <Pie data={sentPie} height={210} />
            </div>
            <div style={{ flex: '1 0 360px', minWidth: 280 }}>
              <h4>Evolución del sentimiento promedio</h4>
              <Line data={sentEvoData} height={220} />
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'end',gap:8,marginBottom:8}}>
            <button onClick={exportSentimientoPDF} className="primary-button">Exportar PDF</button>
            <button onClick={exportSentimientoExcel} className="primary-button">Exportar Excel</button>
          </div>
          {sentLoading && <div style={{ color: '#888', textAlign: 'center', margin: 20 }}>Cargando datos...</div>}
          {sentError && <div style={{ color: 'crimson', margin: 16 }}>{sentError}</div>}
        </>
      )}
      {tab === 'chatbot' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '16px 0' }}>
            <label>Fecha inicio <input type="date" value={cbFecha1} onChange={e => setCbFecha1(e.target.value)} /></label>
            <label>Fecha fin <input type="date" value={cbFecha2} onChange={e => setCbFecha2(e.target.value)} /></label>
          </div>
          {cbLoading && <div style={{ color: '#888', textAlign: 'center' }}>Cargando datos...</div>}
          {cbError && <div style={{ color: 'crimson' }}>{cbError}</div>}
          {cbData && (
            <div style={{ margin: '18px 0' }}>
              <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ minWidth: 200 }}>
                  <h4>Estadísticas generales</h4>
                  <ul style={{ fontSize: 16 }}>
                    <li>Total interacciones: <b>{cbData.total_interacciones}</b></li>
                    <li>Usuarios únicos: <b>{cbData.usuarios_unicos}</b></li>
                    <li>Sentimiento promedio: <b>{cbData.sentimiento_promedio?.toFixed(3) || 'N/A'}</b></li>
                  </ul>
                </div>
                <div style={{ flex: '1 1 400px', minWidth: 320, maxWidth: 460 }}>
                  <h4>Interacciones diarias</h4>
                  <Bar data={{ labels: cbData.interacciones_diarias.map(e => e.fecha), datasets: [{ label: 'Interacciones', data: cbData.interacciones_diarias.map(e => e.total), backgroundColor: '#7cc5fa' }] }} height={170} />
                </div>
                <div style={{ flex: '1 1 320px', minWidth: 260, maxWidth: 400 }}>
                  <h4>Tópicos/temas más consultados</h4>
                  <Pie data={{ labels: cbData.top_topics.map(t => t.topic), datasets: [{ data: cbData.top_topics.map(t => t.total), backgroundColor: ['#8cdcff', '#58bdce', '#f392cf', '#ccbcfc', '#fccabc', '#97eae1', '#e8da92'] }] }} height={170} />
                </div>
              </div>
            </div>
          )}
          <div style={{display:'flex',justifyContent:'end',gap:8,marginBottom:8}}>
            <button onClick={exportChatbotExcel} className="primary-button">Exportar Excel</button>
          </div>
        </>
      )}
      {tab === 'recursos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '16px 0', flexWrap: 'wrap' }}>
            <label>Fecha inicio <input type="date" value={raFecha1} onChange={e => setRaFecha1(e.target.value)} /></label>
            <label>Fecha fin <input type="date" value={raFecha2} onChange={e => setRaFecha2(e.target.value)} /></label>
            <input type="text" value={raTipo} onChange={e => setRaTipo(e.target.value)} placeholder="Tipo (articulo, video...)" style={{ padding: 4 }} />
            <input type="text" value={raCat} onChange={e => setRaCat(e.target.value)} placeholder="Categoría o Etiqueta" style={{ padding: 4 }} />
          </div>
          {raLoading && <div style={{ color: '#888', textAlign: 'center' }}>Cargando datos...</div>}
          {raError && <div style={{ color: 'crimson' }}>{raError}</div>}
          {raData && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 36, justifyContent: 'center', alignItems: 'flex-start' }}>
              <div>
                <h4>Top recursos más consultados</h4>
                <table style={{ minWidth: 320, maxWidth: 420, fontSize: 13 }}>
                  <thead><tr><th>Título</th><th>Tipo</th><th>Categoría</th><th>Vistas</th><th>Descargas</th></tr></thead>
                  <tbody>
                    {raData.top_recursos.length === 0 && <tr><td colSpan={5} style={{ color: '#9bb' }}>Sin recursos</td></tr>}
                    {raData.top_recursos.map(r =>
                      <tr key={r.idRecurso}><td>{r.titulo}</td><td>{r.tipo}</td><td>{r.categoria}</td><td>{r.contador_vistas}</td><td>{r.contador_descargas}</td></tr>)}
                  </tbody>
                </table>
              </div>
              <div>
                <h4>Vistas por día</h4>
                <Bar data={{ labels: raData.vistas_por_dia.map(v => v.fecha), datasets: [{ label: 'Vistas', data: raData.vistas_por_dia.map(v => v.total), backgroundColor: '#aec2fd' }] }} height={170} />
              </div>
              <div>
                <h4>Descargas por día</h4>
                <Bar data={{ labels: raData.descargas_por_dia.map(v => v.fecha), datasets: [{ label: 'Descargas', data: raData.descargas_por_dia.map(v => v.total), backgroundColor: '#ffd9a8' }] }} height={170} />
              </div>
              <div>
                <h4>Por Tipo de Recurso</h4>
                <Pie data={{ labels: Object.keys(raData.distribucion_tipo), datasets: [{ data: Object.values(raData.distribucion_tipo), backgroundColor: ['#83b5f7', '#f9d486', '#b7e6c7', '#e18ad2', '#9be8ef'] }] }} height={150} />
              </div>
              <div>
                <h4>Por Categoría/Etiqueta</h4>
                <Pie data={{ labels: Object.keys(raData.distribucion_categoria), datasets: [{ data: Object.values(raData.distribucion_categoria), backgroundColor: ['#f7ae93', '#f8ec75', '#b7e6c7', '#b385ea', '#bdf0fa'] }] }} height={150} />
              </div>
            </div>
          )}
          <div style={{display:'flex',justifyContent:'end',gap:8,marginBottom:8}}>
            <button onClick={exportRecursosPDF} className="primary-button">Exportar PDF</button>
          </div>
        </>
      )}
      {tab === 'grupos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '16px 0', flexWrap: 'wrap' }}>
            <label>Fecha inicio <input type="date" value={gaF1} onChange={e => setGaF1(e.target.value)} /></label>
            <label>Fecha fin <input type="date" value={gaF2} onChange={e => setGaF2(e.target.value)} /></label>
            <select value={gaTipo} onChange={e => setGaTipo(e.target.value)} style={{ padding: 4 }}>
              <option value=''>Tipo</option>
              <option value='Publico'>Público</option>
              <option value='Privado'>Privado</option>
            </select>
          </div>
          {gaLoading && <div style={{ color: '#888', textAlign: 'center' }}>Cargando datos...</div>}
          {gaError && <div style={{ color: 'crimson' }}>{gaError}</div>}
          {gaData && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 36, justifyContent: 'center', alignItems: 'flex-start' }}>
              <div>
                <h4>Top grupos con más actividad</h4>
                <table style={{ minWidth: 320, maxWidth: 420, fontSize: 13 }}>
                  <thead><tr><th>Nombre</th><th>Tipo</th><th>Miembros</th><th>Posts</th><th>Comentarios</th></tr></thead>
                  <tbody>
                    {gaData.top_grupos.length === 0 && <tr><td colSpan={5} style={{ color: '#9bb' }}>Sin grupos</td></tr>}
                    {gaData.top_grupos.map(g =>
                      <tr key={g.idGrupo}><td>{g.NomGrupo}</td><td>{g.PrivGrupo}</td><td>{g.miembros}</td><td>{g.total_posts}</td><td>{g.total_comentarios}</td></tr>)}
                  </tbody>
                </table>
              </div>
              <div>
                <h4>Barras de actividad diaria (TOP grupos)</h4>
                <Bar data={{ labels: [...new Set(gaData.actividad_diaria.map(d => d.fecha))], datasets: gaData.top_grupos.map((g, idx) => ({ label: g.NomGrupo, data: gaData.actividad_diaria.filter(d => d.grupo === g.NomGrupo).map(d => d.total_posts + d.total_comentarios), backgroundColor: ['#9ccff4', '#faca99', '#f8e6b2', '#b1e59b', '#dab2fa', '#fad5cf', '#ebfa8f', '#9be8ef'][idx % 8] })) }} height={180} />
              </div>
              <div>
                <h4>Distribución por tipo de grupo</h4>
                <Pie data={{ labels: Object.keys(gaData.distribucion_tipo), datasets: [{ data: Object.values(gaData.distribucion_tipo), backgroundColor: ['#83b5f7', '#f9d486'] }] }} height={160} />
              </div>
            </div>
          )}
        </>
      )}
      {tab === 'eventos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '16px 0', flexWrap: 'wrap' }}>
            <label>Fecha inicio <input type="date" value={evF1} onChange={e => setEvF1(e.target.value)} /></label>
            <label>Fecha fin <input type="date" value={evF2} onChange={e => setEvF2(e.target.value)} /></label>
            <select value={evTipo} onChange={e => setEvTipo(e.target.value)} style={{ padding: 4 }}>
              <option value=''>Tipo</option>
              <option value='fisica'>Física</option>
              <option value='virtual'>Virtual</option>
            </select>
            <select value={evEstado} onChange={e => setEvEstado(e.target.value)} style={{ padding: 4 }}>
              <option value=''>Estado</option>
              <option value='vigente'>Vigente</option>
              <option value='cancelado'>Cancelado</option>
            </select>
            <input type="number" value={evMin} min={0} placeholder="Min. asistentes" onChange={e => setEvMin(e.target.value)} style={{ width: 90 }} />
          </div>
          {evLoading && <div style={{ color: '#888', textAlign: 'center' }}>Cargando datos...</div>}
          {evError && <div style={{ color: 'crimson' }}>{evError}</div>}
          {evData && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 38, justifyContent: 'center', alignItems: 'flex-start' }}>
              <div>
                <h4>Top eventos con mayor asistencia</h4>
                <table style={{ minWidth: 340, maxWidth: 540, fontSize: 13 }}>
                  <thead><tr><th>Título</th><th>Tipo</th><th>Estado</th><th>Fecha</th><th>Asistentes</th></tr></thead>
                  <tbody>
                    {evData.top_eventos.length === 0 && <tr><td colSpan={5} style={{ color: '#9bb' }}>Sin eventos</td></tr>}
                    {evData.top_eventos.map(e =>
                      <tr key={e.idEvento}><td>{e.TituloEvent}</td><td>{e.Modalidad}</td><td>{e.Estado}</td><td>{e.Fecha?.split('T')[0]}</td><td>{e.asistentes}</td></tr>)}
                  </tbody>
                </table>
              </div>
              <div>
                <h4>Barras: Top eventos por asistentes</h4>
                <Bar data={{ labels: evData.barras_eventos.map(b => b.titulo), datasets: [{ label: 'Asistentes', data: evData.barras_eventos.map(b => b.asistentes), backgroundColor: '#94d2ff' }] }} height={170} />
              </div>
              <div>
                <h4>Línea: Tendencia de asistencia</h4>
                <Line data={{ labels: evData.tendencia.map(t => t.fecha), datasets: [{ label: 'Asistencias/día', data: evData.tendencia.map(t => t.total_asistentes_dia), backgroundColor: '#ffd9a7', borderColor: '#ffb74d' }] }} height={170} />
              </div>
              <div>
                <h4>Por tipo de evento</h4>
                <Pie data={{ labels: Object.keys(evData.distribucion_tipo), datasets: [{ data: Object.values(evData.distribucion_tipo), backgroundColor: ['#89ddb9', '#f8ec75'] }] }} height={140} />
              </div>
              <div>
                <h4>Por estado</h4>
                <Pie data={{ labels: Object.keys(evData.distribucion_estado), datasets: [{ data: Object.values(evData.distribucion_estado), backgroundColor: ['#91caf8', '#fea2ad'] }] }} height={140} />
              </div>
            </div>
          )}
          <div style={{display:'flex',justifyContent:'end',gap:8,marginBottom:8}}>
            <button onClick={exportEventosPDF} className="primary-button">Exportar PDF</button>
            <button onClick={exportEventosExcel} className="primary-button">Exportar Excel</button>
          </div>
        </>
      )}
      {tab === 'tendencias' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '16px 0', flexWrap: 'wrap' }}>
            <label>Fecha inicio <input type="date" value={tcF1} onChange={e => setTcF1(e.target.value)} /></label>
            <label>Fecha fin <input type="date" value={tcF2} onChange={e => setTcF2(e.target.value)} /></label>
            <select value={tcC} onChange={e => setTcC(e.target.value)} style={{ padding: 4 }}><option value=''>Todas Carreras</option>{tcCarreras.map(c => <option key={c.idCarrera} value={c.idCarrera}>{c.NomCarrera}</option>)}</select>
            <select value={tcTipo} onChange={e => setTcTipo(e.target.value)} style={{ padding: 4 }}>
              <option value='actividad'>Actividad</option>
              <option value='sentimiento'>Sentimiento</option>
            </select>
          </div>
          {tcLoading && <div style={{ color: '#888', textAlign: 'center' }}>Cargando datos...</div>}
          {tcError && <div style={{ color: 'crimson' }}>{tcError}</div>}
          {tcData && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 38, justifyContent: 'center', alignItems: 'flex-start' }}>
              <div>
                <h4>Métricas clave por carrera</h4>
                <Bar data={{
                  labels: tcData.resumen.map(r => r.NomCarrera),
                  datasets: [
                    { label: 'Posts', data: tcData.resumen.map(r => r.total_posts), backgroundColor: '#58bff6' },
                    { label: 'Comentarios', data: tcData.resumen.map(r => r.total_comentarios), backgroundColor: '#ffd580' },
                    { label: 'Sentimiento promedio', data: tcData.resumen.map(r => r.sentimiento_avg), backgroundColor: '#e18080', type: 'line', yAxisID: 'y1' }]
                  ,
                }} options={{ scales: { y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Sent. promedio' }, min: -1, max: 1 } } }} height={180} />
              </div>
              <div>
                <h4>Evolución (acumulada/día) por carrera</h4>
                <Line data={{
                  labels: [...new Set(tcData.evolucion.map(e => e.fecha))],
                  datasets: tcCarreras.filter(c => !tcC || c.idCarrera == tcC).map((c, idx) => ({
                    label: c.NomCarrera,
                    data: tcData.evolucion.filter(e => e.idCarrera === c.idCarrera).map(e => tcTipo === 'actividad' ? (e.posts + e.comentarios) : (e.sent_avg)),
                    borderColor: ['#5ac2fa', '#ffb3ba', '#ffe6a7', '#bbf6c5', '#8de7fa', '#dacdf2', '#e6f7a3', '#bff9fa'][idx % 8],
                    fill: true,
                    backgroundColor: 'rgba(85,162,250,0.07)'
                  }))
                }} height={180} />
              </div>
            </div>
          )}
          <div style={{display:'flex',justifyContent:'end',gap:8,marginBottom:8}}>
            <button onClick={exportTendenciasExcel} className="primary-button">Exportar Excel</button>
          </div>
        </>
      )}
      {tab === 'notificaciones' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '16px 0', flexWrap: 'wrap' }}>
            <label>Fecha inicio <input type="date" value={notF1} onChange={e => setNotF1(e.target.value)} /></label>
            <label>Fecha fin <input type="date" value={notF2} onChange={e => setNotF2(e.target.value)} /></label>
            <input type="text" value={notTipo} onChange={e => setNotTipo(e.target.value)} placeholder="Tipo (ALERTA IA, Publicación...)" style={{ padding: 4 }} />
            <select value={notEnt} onChange={e => setNotEnt(e.target.value)} style={{ padding: 4 }}><option value=''>Entrega</option><option value='web'>Web</option><option value='mail'>Email</option></select>
            <input type="text" value={notUser} onChange={e => setNotUser(e.target.value)} placeholder="ID usuario" style={{ padding: 4, width: 95 }} />
          </div>
          {notLoading && <div style={{ color: '#888', textAlign: 'center' }}>Cargando datos...</div>}
          {notError && <div style={{ color: 'crimson' }}>{notError}</div>}
          {notData && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 38, justifyContent: 'center', alignItems: 'flex-start' }}>
              <div>
                <h4>Resumen por tipo de notificación</h4>
                <table style={{ minWidth: 320, maxWidth: 440, fontSize: 13 }}>
                  <thead><tr><th>Tipo</th><th>Enviadas</th></tr></thead>
                  <tbody>
                    {Object.keys(notData.total_por_tipo).length === 0 && <tr><td colSpan={2} style={{ color: '#9bb' }}>Sin datos</td></tr>}
                    {Object.entries(notData.total_por_tipo).map(([tipo, tot]) => <tr key={tipo}><td>{tipo}</td><td>{tot}</td></tr>)}
                  </tbody>
                </table>
              </div>
              <div>
                <h4>Barras: Total por tipo</h4>
                <Bar data={{ labels: Object.keys(notData.total_por_tipo), datasets: [{ label: 'Enviadas', data: Object.values(notData.total_por_tipo), backgroundColor: '#fcc987' }] }} height={170} />
              </div>
              <div>
                <h4>Línea: Notificaciones enviadas por día</h4>
                <Line data={{ labels: notData.curva_por_dia.map(t => t.fecha), datasets: [{ label: 'Enviadas/día', data: notData.curva_por_dia.map(t => t.total), backgroundColor: '#d9b5f9', borderColor: '#ae44fa' }] }} height={170} />
              </div>
              <div>
                <h4>Pastel: Por tipo de entrega</h4>
                <Pie data={{ labels: Object.keys(notData.distribucion_entrega), datasets: [{ data: Object.values(notData.distribucion_entrega), backgroundColor: ['#9ccff4', '#ffb3ba'] }] }} height={140} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export default DashboardReportes;

// CSS De ejemplo para tabs:
// .tab-btn {padding:10px 18px; background:#eee; border:none; border-radius:5px 5px 0 0; margin-right:2px; cursor:pointer; font-weight:bold;}
// .tab-btn.active {background:#157acc; color:#fff;}