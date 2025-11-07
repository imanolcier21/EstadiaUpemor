// frontend/src/components/NavBar.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Usa el contexto para datos de usuario
import './NavBar.css'; 

function NotificacionesBell() {
  const [notis, setNotis] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/notificaciones/mis/', { credentials: 'include' })
      .then(res => res.json())
      .then(n => setNotis(Array.isArray(n) ? n : []))
      .finally(()=>setLoading(false));
  }, [open]);
  const unreadCount = notis.length;// Si quieres, filtra por leídos en el futuro
  return (
    <div style={{position:'relative', marginRight:16, display:'inline-block'}}>
      <span style={{cursor:'pointer', fontSize: 22, position:'relative'}} title="Notificaciones"
        onClick={()=>setOpen(v => !v)}
        onMouseEnter={()=>setOpen(true)}
        onMouseLeave={()=>setTimeout(()=>setOpen(false), 1100)}
      >
        🔔{unreadCount > 0 && <span style={{position:'absolute', top:4, right:4, background:'crimson', color:'#fff', borderRadius:'50%', fontSize:12, minWidth:19, padding:'0 5px', lineHeight:'18px', fontWeight:600}}>{unreadCount}</span>}
      </span>
      {open && (
        <div style={{position:'absolute',top:28,right:0,background:'#fff',border:'1px solid #bbb',boxShadow:'0 2px 12px #2222',borderRadius:9, minWidth:318, zIndex: 80,padding:8, color:'#222'}} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
          <strong style={{marginLeft:9, fontSize:14, color:'#222'}}>Notificaciones recientes</strong>
          <div style={{maxHeight:260, overflowY:'auto', fontSize:14, marginTop:6}}>
          {loading && <div style={{color:'#888'}}>Cargando...</div>}
          {!loading && notis.length === 0 && <div style={{color:'#666',padding:9}}>¡Sin notificaciones aún!</div>}
          {notis.map(n => (
            <div key={n.id} style={{borderBottom:'1px solid #f0f0f0',padding:'8px 0', margin:'5px 7px', color:'#222', lineHeight:'1.5'}}>
              <b style={{color:'#333'}}>{n.tipo || 'Sin tipo'}</b>: {n.mensaje || 'Sin contenido'}
              <div style={{color:'#7a7a7a',fontSize:11}}>{n.fecha ? new Date(n.fecha).toLocaleString() : ''}</div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NavBar() {
    const { user, logout, isAuthenticated } = useAuth();

    // No renderiza la barra si no está autenticado
    if (!isAuthenticated || !user) {
        return null; 
    }

    const { userType, username } = user;
    const isAdmin = (userType === 'Admin' || userType === 'SuperUser');

    // 1. Definición de hipervínculos dinámicos
    const links = [
        { path: isAdmin ? '/dashboard/admin' : '/dashboard/estudiante', label: 'Inicio' },
        { path: '/inbox', label: 'Mensajes 💬' },
        { path: '/grupos', label: 'Grupos' },
        { path: '/eventos', label: 'Eventos' },
        { path: '/grupos/mis', label: 'Tus grupos' },
        { path: '/perfil/mio', label: 'Mi perfil' },
        { path: '/usuarios/explorar', label: 'Explorar usuarios' },
        { path: '/chatbot', label: 'Chat de Ayuda 🤖' }, // <-- Nueva entrada
    ];
    
    return (
        <nav className="navbar">
            <div className="navbar-brand">UpeApp</div>
            <div className="navbar-links">
                {links.map(link => (
                    <Link key={link.path} to={link.path} className="nav-link">
                        {link.label}
                    </Link>
                ))}
                {isAdmin && (
                    <Link to="/eventos/crear" className="nav-link">Crear evento</Link>
                )}
                {isAdmin && (
                  <Link to="/admin/alertas-ia" className="nav-link" style={{color: '#e25462', fontWeight: 'bold'}}>
                      Alertas IA ⚠️
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin/backup" className="nav-link" style={{color:'#216db2',fontWeight:'bold'}}>
                    <span role="img" aria-label="respaldo">💾</span> Respaldo BD
                  </Link>
                )}
            </div>
            <div className="navbar-user-info">
                <NotificacionesBell />
                {/* 2. Mostrar el usuario y su rol */}
                <span>Bienvenido, {username} ({userType})</span>
                {/* 3. Botón para cerrar la sesión (usa la función logout del contexto) */}
                <button onClick={logout} className="logout-button">Cerrar Sesión</button>
            </div>
        </nav>
    );
}

export default NavBar;