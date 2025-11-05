import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import NavBar from './NavBar';

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

function getOtherUserFull(mensaje, currentUser, usuarios) {
  if (Number(mensaje.sendUser) === Number(currentUser?.idUser)) {
    const user = usuarios.find(u => Number(u.idUser) === Number(mensaje.receiveUser));
    return user ? { idUser: user.idUser, name: user.UserName } : { idUser: mensaje.receiveUser, name: 'Usuario #' + mensaje.receiveUser };
  } else {
    const user = usuarios.find(u => Number(u.idUser) === Number(mensaje.sendUser));
    return user ? { idUser: user.idUser, name: user.UserName } : { idUser: mensaje.sendUser, name: 'Usuario #' + mensaje.sendUser };
  }
}

const Inbox = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chat, setChat] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgError, setMsgError] = useState(null);
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    if (!user) return;
    async function init() {
      const usrs = await fetchUsuarios();
      const msgs = await fetchInbox(usrs);
      rebuildConvs(msgs, usrs);
    }
    init();
    // eslint-disable-next-line
  }, [user]);

  useEffect(() => {
    if (!user) return;
    rebuildConvs(messages, usuarios);
    // eslint-disable-next-line
  }, [messages, usuarios]);

  // VISUALIZA EL CHAT SIEMPRE USANDO NUMBER EN IDs (debug + forzado)
  useEffect(() => {
    if (!selectedUser || !user) {
      setChat([]);
      return;
    }
    const chatLog = messages
      .filter(msg => {
        // Debug: log de IDs
        const match =
          (Number(msg.sendUser) === Number(user.idUser) && Number(msg.receiveUser) === Number(selectedUser.idUser)) ||
          (Number(msg.receiveUser) === Number(user.idUser) && Number(msg.sendUser) === Number(selectedUser.idUser));
        if (!match) return false;
        return true;
      })
      .sort((a, b) => new Date(a.FechMensaje) - new Date(b.FechMensaje));
    // Debug extra
    if (process.env.NODE_ENV !== 'production') {
      console.log('user.idUser', user.idUser, '- selected', selectedUser.idUser);
      console.log('Mensajes de la conversación:', chatLog);
      if (messages.length > 0 && chatLog.length === 0) {
        console.warn('Filtro vacío: verifica los valores sendUser/receiveUser de los mensajes traídos ->', messages);
      }
    }
    setChat(chatLog);
    setTimeout(() => {
      const el = document.getElementById('chat-window');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }, [messages, selectedUser, user]);

  async function fetchUsuarios() {
    try {
      const res = await fetch('/api/usuarios/', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const data = await res.json();
      setUsuarios(data);
      return data;
    } catch (e) { setUsuarios([]); return []; }
  }

  async function fetchInbox(_usuarios = null) {
    setLoading(true);
    setMsgError(null);
    try {
      const res = await fetch('/api/mensajes/', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar mensajes');
      const data = await res.json();
      setMessages(data);
      return data;
    } catch (err) {
      setMsgError(err.message);
      setMessages([]);
      return [];
    } finally {
      setLoading(false);
    }
  }

  function rebuildConvs(msgs, usrs) {
    if (!Array.isArray(msgs) || !Array.isArray(usrs) || !user) return;
    const convs = {};
    msgs.forEach(msg => {
      const other = getOtherUserFull(msg, user, usrs);
      if (!convs[other.idUser]) convs[other.idUser] = { ...other, unread: 0, lastMsg: msg.FechMensaje };
      if (!msg.Leido && Number(msg.receiveUser) === Number(user.idUser)) convs[other.idUser].unread++;
      if (new Date(msg.FechMensaje) > new Date(convs[other.idUser].lastMsg)) convs[other.idUser].lastMsg = msg.FechMensaje;
    });
    setConversations(Object.values(convs).sort((a, b) => new Date(b.lastMsg) - new Date(a.lastMsg)));
  }

  function openChat(otherUser) {
    setSelectedUser(otherUser);
    const chatLog = messages.filter(msg =>
      (Number(msg.sendUser) === Number(user.idUser) && Number(msg.receiveUser) === Number(otherUser.idUser)) ||
      (Number(msg.receiveUser) === Number(user.idUser) && Number(msg.sendUser) === Number(otherUser.idUser))
    ).sort((a, b) => new Date(a.FechMensaje) - new Date(b.FechMensaje));
    setChat(chatLog);
    setTimeout(() => {
      const el = document.getElementById('chat-window');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  async function handleSendMsg(e) {
    e.preventDefault();
    if (!newMsg.trim() || !selectedUser) return;
    setLoading(true);
    setMsgError(null);
    const csrftoken = getCookie('csrftoken');
    try {
      const res = await fetch('/api/mensajes/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ Mensaje: newMsg, receiveUser: selectedUser.idUser })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.error || 'Error al mandar mensaje');
      }
      setNewMsg('');
      await fetchInbox();
      openChat(selectedUser);
    } catch (err) {
      setMsgError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />
      <div style={{ display: 'flex', height: '75vh', maxWidth: 900, border: '1px solid #ccc', borderRadius: 8, margin: '40px auto', overflow: 'hidden' }}>
        {/* Lista de conversaciones + busqueda/nueva charla */}
        <div style={{ minWidth: 210, background: '#f4f5fa', padding: 8, borderRight: '1px solid #ddd', overflowY: 'auto' }}>
          <h3 style={{ fontSize: 17, marginBottom: 13 }}>Mensajes</h3>
          <div style={{ marginBottom: 11 }}>
            <label style={{ fontWeight: 'bold', fontSize: 14 }}>Iniciar mensaje:</label>
            <select
              value={searchUser}
              onChange={e => {
                setSearchUser(e.target.value);
                if (e.target.value) {
                  const u = usuarios.find(x => String(x.idUser) === e.target.value);
                  if (u) openChat({ idUser: u.idUser, name: u.UserName });
                }
              }}
              style={{ width: '96%', marginTop: 4, padding: 4 }}>
              <option value="">-- Elegir usuario --</option>
              {usuarios
                .filter(u => Number(u.idUser) !== Number(user?.idUser))
                .map(u => (
                  <option key={u.idUser} value={u.idUser}>{u.UserName}</option>
                ))}
            </select>
          </div>
          {conversations.length === 0 && <div style={{ color: '#888', fontSize: 14 }}>Sin conversaciones previas</div>}
          {conversations.map(conv => (
            <div key={conv.idUser} style={{
              padding: '7px 10px', borderRadius: 6, background: selectedUser?.idUser === conv.idUser ? '#e8eefd' : '#fff', marginBottom: 6, cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}
              onClick={()=>openChat(conv)}
            >
              <b style={{ fontSize: 15 }}>{conv.name}</b>
              {conv.unread > 0 && <span style={{ background: 'crimson', color: '#fff', borderRadius: '60%', fontSize: 12, minWidth: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}>{conv.unread}</span>}
            </div>
          ))}
        </div>
        {/* Ventana de chat (lo demás igual) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minWidth: 0 }}>
          {!selectedUser ? (
            <div style={{ margin: 'auto', color: '#888', fontSize: 17 }}>Selecciona una conversación o busca usuarios</div>
          ) : (
            <>
              <div style={{ padding: 12, background: '#f5f7fa', borderBottom: '1px solid #ddd' }}>
                <b style={{ fontSize: 15 }}>{selectedUser.name}</b>
              </div>
              <div id="chat-window" style={{ flex: 1, padding: 12, overflowY: 'auto', background: '#f9fafd', fontSize: 15, minHeight: 0 }}>
                {chat.length === 0 && <div style={{ color: '#aaa', fontSize:15 }}>No hay mensajes para mostrar.<br/>Conversación entre IDs: {user?.idUser} y {selectedUser?.idUser}</div>}
                {chat.map(msg => (
                  <div key={msg.idMensajeDirecto} style={{
                    marginBottom: 8,
                    textAlign: Number(msg.sendUser) === Number(user.idUser) ? 'right' : 'left'
                  }}>
                    <div style={{
                      display: 'inline-block',
                      background: Number(msg.sendUser) === Number(user.idUser) ? '#d5e7fa' : '#efefef',
                      color: '#333',
                      borderRadius: 7,
                      padding: '6px 11px',
                      minWidth: 35
                    }}>{msg.Mensaje}</div>
                    <div style={{ color: '#999', fontSize: 12 }}>{new Date(msg.FechMensaje).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMsg} style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid #ddd', background: '#fcfcfe' }}>
                <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} placeholder="Escribe un mensaje..." style={{ flex: 1, padding: 8 }} disabled={loading}/>
                <button type="submit" disabled={loading || !newMsg.trim() || !selectedUser}>Enviar</button>
              </form>
              {msgError && <div style={{ color: 'red', paddingLeft: 14 }}>{msgError}</div>}
            </>
          )}
        </div>
      </div>
    </>
  );
};
export default Inbox;
