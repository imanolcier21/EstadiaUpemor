import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

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

const PostFeed = ({ refreshFlag }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedRefresh, setFeedRefresh] = useState(0);
  const [deleteError, setDeleteError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  // Edición
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/posts/${search ? '?search=' + encodeURIComponent(search) : ''}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Error al cargar publicaciones');
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [refreshFlag, feedRefresh, search]);

  const handleDelete = async (idPost) => {
    if (!window.confirm('¿Deseas eliminar esta publicación?')) return;
    setDeleteError(null);
    const csrftoken = getCookie('csrftoken');
    try {
      const res = await fetch(`/api/posts/${idPost}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrftoken
        }
      });
      if (res.status === 204) {
        setFeedRefresh(f => f + 1);
      } else {
        const data = await res.json();
        setDeleteError(data.detail || data.error || 'Error al eliminar publicación');
      }
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  const soyDuenioDePost = (post) => {
    if (!user) return false;
    if (user.isSuperuser || user.userType === 'Admin') return true;
    return post.autor === user.username;
  };

  const handleEditClick = (post) => {
    setEditId(post.idPost);
    setEditText(post.TextPost);
    setEditFile(null);
    setEditPreview(null);
    setEditError(null);
  };

  const handleEditFileChange = (e) => {
    const f = e.target.files[0];
    setEditFile(f);
    if (f) {
      if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
        setEditPreview(URL.createObjectURL(f));
      } else {
        setEditPreview(null);
      }
    } else {
      setEditPreview(null);
    }
  };

  const handleEditSubmit = async (e, post) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    const formData = new FormData();
    formData.append('TextPost', editText);
    if (editFile) formData.append('MediaPost', editFile);
    const csrftoken = getCookie('csrftoken');
    try {
      const res = await fetch(`/api/posts/${post.idPost}/`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrftoken
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.error || 'Error al editar publicación');
      }
      setEditId(null);
      setFeedRefresh(f => f + 1);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Debounce la búsqueda para no sobrecargar la API
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(
      setTimeout(() => {
        setFeedRefresh(f => f + 1);
      }, 300)
    );
  };

  return (
    <div className="post-feed">
      <h3>Feed de publicaciones</h3>
      <input
        type="text"
        value={search}
        onChange={handleSearchChange}
        placeholder="Buscar por texto, autor o #hashtag"
        style={{ width: '100%', marginBottom: 14, padding: 6 }}
      />
      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {deleteError && <div style={{ color: 'red' }}>{deleteError}</div>}
      {!loading && posts.length === 0 && <div>No hay publicaciones todavía.</div>}
      {posts.map(post => (
        <div key={post.idPost} className="post-card" style={{ border: '1px solid #ccc', borderRadius: 7, padding: 10, marginBottom: 20 }}>
          <div style={{ color: '#555', fontSize: 13 }}>
            <b>{post.autor}</b> &middot; {new Date(post.FechCreacPost).toLocaleString()}
          </div>
          {editId === post.idPost ? (
            <form onSubmit={e => handleEditSubmit(e, post)} style={{ margin: '10px 0' }}>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={3}
                required
                style={{ width: '100%' }}
                disabled={editLoading}
              />
              <input type="file" accept="image/*,video/*" onChange={handleEditFileChange} disabled={editLoading} />
              {editPreview && (editFile.type.startsWith('image/') ? (
                <img src={editPreview} style={{ maxWidth: '200px', display: 'block', margin: '6px 0' }} alt="preview" />
              ) : (
                <video src={editPreview} controls style={{ maxWidth: '200px', display: 'block', margin: '6px 0' }} />
              ))}
              <div style={{ marginTop: 5, display: 'flex', gap: 8 }}>
                <button type="submit" disabled={editLoading}>{editLoading ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={()=>setEditId(null)} disabled={editLoading}>Cancelar</button>
              </div>
              {editError && <div style={{ color: 'red' }}>{editError}</div>}
            </form>
          ) : (
            <>
                <div style={{ margin: '10px 0' }}>{post.TextPost}</div>
                {post.media_url && (
                  post.media_url.match(/\.(mp4|webm)$/i)
                    ? <video src={post.media_url} controls style={{ maxWidth: '230px', margin: '10px 0' }} />
                    : <img src={post.media_url} alt="Media" style={{ maxWidth: '230px', margin: '10px 0' }} />
                )}
              {soyDuenioDePost(post) && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button style={{ color: 'white', background: 'cornflowerblue', border: 'none', borderRadius: 3, padding: '5px 12px' }} onClick={() => handleEditClick(post)}>Editar</button>
                  <button style={{ color: 'white', background: 'red', border: 'none', borderRadius: 3, padding: '5px 12px' }} onClick={() => handleDelete(post.idPost)}>Eliminar</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default PostFeed;
