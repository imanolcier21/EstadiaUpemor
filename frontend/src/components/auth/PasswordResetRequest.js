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

const PasswordResetRequest = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const csrftoken = getCookie('csrftoken');
      const res = await fetch('/api/password_reset/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken
        },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || '¡Si tu correo está registrado, te enviamos un enlace para restablecer la contraseña!');
        setEmail('');
      } else {
        setError(data.error || 'Hubo un problema al enviar el correo.');
      }
    } catch {
      setError('Error de red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '60px auto', background: '#fff', borderRadius: 7, padding: 25, boxShadow: '0 0 12px rgba(0,0,0,0.07)' }}>
      <h2 style={{ textAlign: 'center' }}>Recuperar contraseña</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="reset-email" style={{ fontWeight: 'bold' }}>
          Correo electrónico:
        </label>
        <input
          id="reset-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 8, margin: '12px 0', borderRadius: 4, border: '1px solid #bbb' }}
          placeholder="correo@upeapp.edu.mx"
          disabled={loading}
        />
        <button type="submit" style={{ width: '100%', marginTop: 10, background: '#088', color: 'white', border: 'none', borderRadius: 5, padding: 10, fontWeight: 'bold' }} disabled={loading || !email}>
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>
      {success && <div style={{ color: 'green', marginTop: 14 }}>{success}</div>}
      {error && <div style={{ color: 'red', marginTop: 14 }}>{error}</div>}
    </div>
  );
};
export default PasswordResetRequest;
