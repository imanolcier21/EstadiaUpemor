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

const CommentSection = ({ idPost }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  // Fetch comentarios al montar/comentar
  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line
  }, [idPost]);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/comentarios/?idPost=${idPost}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar comentarios');
      const data = await res.json();
      setComments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async e => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    const csrftoken = getCookie('csrftoken');
    try {
      const res = await fetch('/api/comentarios/', {
        method: 'POST',
        body: JSON.stringify({ TextComentario: text, idPost }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.error || 'Error al comentar');
      }
      setText('');
      fetchComments();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const soyAutor = (comentario) => {
    if (!user) return false;
    if (user.isSuperuser || user.userType === 'Admin') return true;
    return comentario.autor === user.username;
  };

  // Editar
  const handleEdit = (comentario) => {
    setEditId(comentario.idComentario);
    setEditText(comentario.TextComentario);
    setEditError(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    const csrftoken = getCookie('csrftoken');
    try {
      const res = await fetch(`/api/comentarios/${editId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ TextComentario: editText }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.error || 'Error al editar comentario');
      }
      setEditId(null);
      setEditText('');
      fetchComments();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Eliminar
  const handleDelete = async (idComentario) => {
    if (!window.confirm('¿Eliminar este comentario?')) return;
    const csrftoken = getCookie('csrftoken');
    try {
      const res = await fetch(`/api/comentarios/${idComentario}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrftoken
        }
      });
      if (res.status === 204) {
        fetchComments();
      } else {
        throw new Error('Error al eliminar comentario');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid #ddd', paddingTop: 8 }}>
      <b style={{ fontSize: 15 }}>Comentarios</b>
      {loading && <div>Cargando comentarios...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {/* Formulario para nuevo comentario */}
      <form onSubmit={handleAdd} style={{ marginBottom: 8, display: 'flex', gap: 6 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribe un comentario..."
          disabled={adding || !user}
          required
          style={{ flex: 1, padding: 5 }}
        />
        <button type="submit" disabled={adding || !user}>Comentar</button>
      </form>
      {/* Lista de comentarios */}
      {comments.length === 0 && !loading && <div style={{ color: '#777', fontSize: 13 }}>Sé el primero en comentar.</div>}
      {comments.map(comentario => (
        <div key={comentario.idComentario} style={{ marginBottom: 10, borderBottom: '1px solid #eee', paddingBottom: 6 }}>
          <div style={{ fontSize: 14, color: '#444' }}>
            <b>{comentario.autor}</b> · {new Date(comentario.FechCreacComen).toLocaleString()}
          </div>
          {editId === comentario.idComentario ? (
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <input value={editText} onChange={e => setEditText(e.target.value)} required disabled={editLoading} style={{ flex: 1 }} />
              <button type="submit" disabled={editLoading}>Guardar</button>
              <button type="button" onClick={()=>setEditId(null)} disabled={editLoading}>Cancelar</button>
              {editError && <div style={{ color: 'red', marginLeft: 6 }}>{editError}</div>}
            </form>
          ) : (
            <div style={{ fontSize: 15 }}>{comentario.TextComentario}</div>
          )}
          {soyAutor(comentario) && editId !== comentario.idComentario && (
            <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
              <button onClick={()=>handleEdit(comentario)} style={{ background: '#468ef3', color: 'white', border: 'none', borderRadius: 3, padding: '2px 7px', fontSize: 13 }}>Editar</button>
              <button onClick={()=>handleDelete(comentario.idComentario)} style={{ background: 'red', color: 'white', border: 'none', borderRadius: 3, padding: '2px 7px', fontSize: 13 }}>Eliminar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CommentSection;
