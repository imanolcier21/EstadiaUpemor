// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './components/auth/AuthPage';
import StudentDashboard from './components/dashboard/StudentDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUserManagement from './components/admin/AdminUserManagement';
import './App.css';
import StudentOnboarding from './components/dashboard/StudentOnboarding';
import AdminCareerManagement from './components/admin/AdminCareerManagement';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './components/layout/AdminLayout';
import PostCreateForm from './components/posts/PostCreateForm';
import PostFeed from './components/posts/PostFeed';
import AdminPostManagement from './components/admin/AdminPostManagement';
import Inbox from './components/chat/Inbox';
import PasswordResetRequest from './components/auth/PasswordResetRequest';
import PasswordResetConfirm from './components/auth/PasswordResetConfirm';
import MiPerfil from './components/profile/MiPerfil';
import PerfilUsuario from './components/profile/PerfilUsuario';
import ExplorarUsuarios from './components/profile/ExplorarUsuarios';
import GruposExplorar from './components/groups/GruposExplorar';
import MisGrupos from './components/groups/MisGrupos';
import GrupoDetalle from './components/groups/GrupoDetalle';
import EventosExplorar from './components/events/EventosExplorar';
import EventoDetalle from './components/events/EventoDetalle';
import EventoCrearEditar from './components/events/EventoCrearEditar';
import ChatbotEmocional from './components/chat/ChatbotEmocional';
import AdminAlertasIA from './components/admin/AdminAlertasIA';
import DashboardReportes from './components/admin/DashboardReportes';
import AdminBackup from './components/admin/AdminBackup';

function FeedPage() {
  // Refresca el feed tras crear post nuevo
  const [refreshFlag, setRefreshFlag] = React.useState(0);
  return (
    <div style={{ maxWidth: 540, margin: 'auto', padding: 24 }}>
      <PostCreateForm onCreated={() => setRefreshFlag(f => f + 1)} />
      <hr />
      <PostFeed refreshFlag={refreshFlag} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* RUTA PÚBLICA / LOGIN */}
          <Route path="/" element={<AuthPage />} />
          <Route path="/password-reset" element={<PasswordResetRequest />} />
          <Route path="/password-reset/confirm" element={<PasswordResetConfirm />} />
          <Route path="/onboarding/estudiante" element={<StudentOnboarding />} />
          {/* FEED DE PUBLICACIONES (pruebas rápidas) */}
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/inbox" element={<Inbox />} />
          {/* RUTA CENTRALIZADA: Un solo Layout que maneja TODO el contenido después del login */}
          <Route element={<AdminLayout />}>
            {/* 1. Dashboard Principal (Ruta: /dashboard/admin) */}
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            {/* 2. CRUDs de Gestión (Rutas: /admin/users, /admin/carreras) */}
            <Route path="/admin/users" element={<AdminUserManagement />} />
            <Route path="/admin/carreras" element={<AdminCareerManagement />} />
            {/* 3. Dashboard Estudiante */}
            <Route path="/dashboard/estudiante" element={<StudentDashboard />} />
            {/* 4. Gestión avanzada de publicaciones (Admin) */}
            <Route path="/admin/posts" element={<AdminPostManagement />} />
            <Route path="/grupos" element={<GruposExplorar />} />
            <Route path="/grupos/mis" element={<MisGrupos />} />
            <Route path="/grupos/:id" element={<GrupoDetalle />} />
            <Route path="/perfil/mio" element={<MiPerfil />} />
            <Route path="/usuarios/explorar" element={<ExplorarUsuarios />} />
            <Route path="/perfil/:username" element={<PerfilUsuario />} />
            <Route path="/eventos" element={<EventosExplorar />} />
            <Route path="/eventos/crear" element={<EventoCrearEditar />} />
            <Route path="/eventos/:id" element={<EventoDetalle />} />
            <Route path="/eventos/:id/editar" element={<EventoCrearEditar editar={true} />} />
            <Route path="/chatbot" element={<ChatbotEmocional />} />
            <Route path="/admin/alertas-ia" element={<AdminAlertasIA />} />
            <Route path="/admin/reportes" element={<DashboardReportes />} />
            <Route path="/admin/backup" element={<AdminBackup />} />
          </Route>
          <Route path="*" element={<AuthPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;