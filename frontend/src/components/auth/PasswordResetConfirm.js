import React, { useState, useEffect } from 'react';

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    uid: params.get('uid') || '',
    token: params.get('token') || ''
  }
}

const PasswordResetConfirm = () => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [{ uid, token }, setQuery] = useState(getQueryParams());

  useEffect(() => {
    setQuery(getQueryParams());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch('/api/password_reset_confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ uid, token, new_password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || '¡Tu contraseña fue restablecida! Ahora puedes iniciar sesión.');
        setNewPassword('');
      } else {
        setError(data.error || 'El enlace es inválido o la contraseña no cumple los requisitos.');
      }
    } catch {
      setError('Error de red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '60px auto', background: '#fff', borderRadius: 7, padding: 25, boxShadow: '0 0 12px rgba(0,0,0,0.07)'}}>
      <h2 style={{ textAlign: 'center' }}>Nueva contraseña</h2>
      <form onSubmit={handleSubmit}>
        <label style={{ fontWeight: 'bold' }} htmlFor="new-password">Nueva contraseña:</label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
          minLength={6}
          style={{ width: '100%', padding: 8, margin: '12px 0', borderRadius: 4, border: '1px solid #bbb' }}
          placeholder="Mín. 6 caracteres"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newPassword} style={{ width: '100%', marginTop: 10, background: '#088', color: 'white', border: 'none', borderRadius: 5, padding: 10, fontWeight: 'bold' }}>
          {loading ? 'Guardando...' : 'Restablecer contraseña'}
        </button>
      </form>
      {success && <div style={{ color: 'green', marginTop: 14 }}>{success}</div>}
      {error && <div style={{ color: 'red', marginTop: 14 }}>{error}</div>}
    </div>
  );
};
export default PasswordResetConfirm;
