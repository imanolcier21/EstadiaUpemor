// frontend/src/components/layout/NavBar.js
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './NavBar.css';

function NotificacionesBell() {
  const [notis, setNotis] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotis = () => {
    setLoading(true);
    fetch('/api/notificaciones/mis/', { credentials: 'include' })
      .then(res => res.json())
      .then(n => setNotis(Array.isArray(n) ? n : []))
      .catch(() => setNotis([]))
      .finally(() => setLoading(false));
  };

  // Poll every 60 seconds
  useEffect(() => {
    fetchNotis(); // Initial fetch
    const interval = setInterval(fetchNotis, 60000);
    return () => clearInterval(interval);
  }, []);

  // Also fetch when opening the dropdown to be sure
  useEffect(() => {
    if (open) fetchNotis();
  }, [open]);

  const unreadCount = notis.length;

  return (
    <div className="notifications-container">
      <span className="bell-icon"
        onClick={() => setOpen(v => !v)}
        title="Notificaciones"
      >
        🔔
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </span>
      {open && (
        <>
          <div className="notifications-overlay" onClick={() => setOpen(false)} />
          <div className="notifications-dropdown">
            <div className="dropdown-header">Notificaciones recientes</div>
            <div className="dropdown-content">
              {loading && <div className="p-2 text-muted">Cargando...</div>}
              {!loading && notis.length === 0 && <div className="p-2 text-muted">¡Sin notificaciones aún!</div>}
              {notis.map(n => (
                <div key={n.id} className="notification-item">
                  <b className="text-dark">{n.tipo || 'Sin tipo'}</b>: {n.mensaje || 'Sin contenido'}
                  <div className="text-xs text-muted">{n.fecha ? new Date(n.fecha).toLocaleString() : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NavBar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Cierra el menú al cambiar de ruta
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const { userType, username } = user;
  const isAdmin = (userType === 'Admin' || userType === 'SuperUser');

  const links = [
    { path: isAdmin ? '/dashboard/admin' : '/dashboard/estudiante', label: 'Inicio' },
    { path: '/inbox', label: 'Mensajes' },
    { path: '/grupos', label: 'Grupos' },
    { path: '/eventos', label: 'Eventos' },
    { path: '/grupos/mis', label: 'Mis Grupos' },
    { path: '/perfil/mio', label: 'Mi Perfil' },
    { path: '/usuarios/explorar', label: 'Explorar' },
    { path: '/chatbot', label: 'Ayuda IA' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">UpeApp</div>

        <button
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>

        <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
          {links.map(link => (
            <Link key={link.path} to={link.path} className="nav-link">
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/eventos/crear" className="nav-link">Crear evento</Link>
          )}
          {isAdmin && (
            <Link to="/admin/alertas-ia" className="nav-link warning-link">
              Alertas IA
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/backup" className="nav-link info-link">
              Respaldo BD
            </Link>
          )}

          {/* User Info inside menu on mobile, outside on desktop */}
          <div className="mobile-user-info">
            <span className="user-greeting">{username}</span>
            <button onClick={logout} className="logout-button-mobile">Salir</button>
          </div>
        </div>

        <div className="navbar-user-info-desktop">
          <NotificacionesBell />
          <span className="user-greeting">{username}</span>
          <button onClick={logout} className="logout-button">Salir</button>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;