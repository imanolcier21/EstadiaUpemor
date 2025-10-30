import React from 'react';
import PostCreateForm from './PostCreateForm';
import PostFeed from './PostFeed';

const AdminPostManagement = () => {
  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: 32 }}>
      <h2>Gestión de Publicaciones</h2>
      <p>Como administrador puedes ver, buscar, editar o eliminar cualquier publicación de los usuarios.</p>
      <PostCreateForm />
      <hr />
      <PostFeed />
    </div>
  );
};

export default AdminPostManagement;
