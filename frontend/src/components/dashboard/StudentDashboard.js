// frontend/src/components/StudentDashboard.js
import React from 'react';
import PostCreateForm from '../posts/PostCreateForm';
import PostFeed from '../posts/PostFeed';

const StudentDashboard = () => {
  return (
    <div className="feed-container">
      <h2>Bienvenido al Muro</h2>
      <PostCreateForm />
      <hr className="my-4" />
      <PostFeed />
    </div>
  );
};

export default StudentDashboard;