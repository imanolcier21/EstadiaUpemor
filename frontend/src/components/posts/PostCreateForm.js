import React, { useState } from 'react';

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const PostCreateForm = ({ onCreated }) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleFileChange = e => {
    const selected = e.target.files[0];
    setFile(selected);
    if (selected) {
      if (selected.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(selected));
      } else if (selected.type.startsWith('video/')) {
        setPreview(URL.createObjectURL(selected));
      } else {
        setPreview(null);
      }
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('TextPost', text);
    if (file) formData.append('MediaPost', file);
    const csrftoken = getCookie('csrftoken');

    try {
      const res = await fetch('/api/posts/', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrftoken
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.error || 'Error al crear la publicación');
      }
      setText('');
      setFile(null);
      setPreview(null);
      setSuccess('¡Publicación creada exitosamente!');
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="post-create-form" onSubmit={handleSubmit} encType="multipart/form-data">
      <h3>Crear publicación</h3>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="¿En qué piensas?" rows={4} disabled={loading} required />
      <input
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        disabled={loading}
      />
      {preview && (
        preview && file && file.type.startsWith('image/') ? (
          <img src={preview} alt="preview" style={{ maxWidth: '200px', display: 'block', margin: '10px 0' }} />
        ) : (
          <video src={preview} controls style={{ maxWidth: '200px', display: 'block', margin: '10px 0' }} />
        )
      )}
      <button type="submit" disabled={loading}>
        {loading ? 'Publicando...' : 'Publicar'}
      </button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>{success}</div>}
    </form>
  );
};

export default PostCreateForm;
