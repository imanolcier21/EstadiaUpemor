// frontend/src/components/StudentDashboard.js
import React from 'react';
import PostCreateForm from './PostCreateForm';
import PostFeed from './PostFeed';

const StudentDashboard = () => {
  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 24 }}>
      <h2>Bienvenido al Muro</h2>
      <PostCreateForm />
      <hr />
      <PostFeed />
    </div>
  );
};

export default StudentDashboard;