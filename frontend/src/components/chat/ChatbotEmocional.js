import React, { useState, useRef, useEffect } from 'react';

function ChatbotEmocional() {
  const [history, setHistory] = useState([]); // {rol: 'user'|'bot', text: string}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(()=>{ if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; },[history,loading]);

  async function handleSend(e) {
    e.preventDefault();
    const mensaje = input.trim();
    if (!mensaje) return;
    setHistory(h => [...h, { rol: 'user', text: mensaje }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chatbot/', {
        method:'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje }),
      });
      const data = await res.json();
      if (res.ok && data.respuesta) {
        setHistory(h => [...h, { rol: 'bot', text: data.respuesta }]);
      } else {
        let msg = data && (typeof data === 'object') ? (data.error || JSON.stringify(data)) : 'Error al consultar chatbot.';
        // Busca saturación Gemini
        if (msg.includes('overloaded') || msg.includes('UNAVAILABLE') || msg.includes('saturado')) {
          msg = 'El chatbot está temporalmente saturado. Intenta de nuevo más tarde.';
        }
        setHistory(h => [...h, { rol: 'bot', text: msg }]);
      }
    } catch {
      setHistory(h => [...h, { rol: 'bot', text: '(No se pudo contactar al chatbot 😕)' }]);
    } finally { setLoading(false); }
  }
  return (
    <div style={{maxWidth:420, margin:'32px auto', background:'#fcfcfd', borderRadius:9,padding:16, border:'1px solid #ccd'}}>
      <h2 style={{textAlign:'center',color:'#116ba9'}}>Ayuda Emocional — Chatbot</h2>
      <div style={{height:340,overflowY:'auto',background:'#f8f8fa',border:'1px solid #dde',marginBottom:12,borderRadius:9,padding:9}} ref={chatRef}>
        {history.length === 0 && <div style={{color:'#999',textAlign:'center',marginTop:30}}>¡Hola! Puedes escribirme sobre cómo te sientes o pedir una orientación corta emocional.</div>}
        {history.map((m,i) => (
          <div key={i} style={{display:'flex',justifyContent:m.rol==='user'?'flex-end':'flex-start',marginBottom:6}}>
            {m.rol==='bot' && <span style={{fontSize:22,marginRight:7}}>🤖</span>}
            <span style={{background:m.rol==='user'?'#c1e6fa':'#eee',color:'#234',padding:'8px 14px',borderRadius:14,maxWidth:300,whiteSpace:'pre-wrap',fontSize:15,boxShadow:m.rol==='user'?'#8fd2f533 0px 2px 6px':'none'}}>{m.text}</span>
            {m.rol==='user' && <span style={{marginLeft:7,fontSize:24}}>🧑‍🎓</span>}
          </div>
        ))}
        {loading && <div style={{color:'#a7a', fontStyle:'italic',margin:'7px 0'}}>Pensando respuesta...</div>}
      </div>
      <form onSubmit={handleSend} style={{display:'flex',gap:7}}>
        <input value={input} disabled={loading} onChange={e=>setInput(e.target.value)} placeholder="¿Cómo te sientes? (Ej: triste, ansioso...)" style={{flex:1,padding:8,borderRadius:9,border:'1px solid #aac',fontSize:16}}/>
        <button type="submit" disabled={loading || !input.trim()} style={{background:'#209786',color:'#fff',padding:'0 13px',borderRadius:9}}>Enviar</button>
      </form>
    </div>
  );
}
export default ChatbotEmocional;
