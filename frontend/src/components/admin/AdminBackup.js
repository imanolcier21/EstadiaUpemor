import React, { useState } from 'react';
function AdminBackup() {
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);

  function handleExport() {
    setMsg(''); setError(''); setLoadingExport(true);
    fetch('/api/backup/export/', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('No se pudo generar respaldo.');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'respaldo_estadia.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setMsg('¡Respaldo generado y descargado con éxito!');
        setLoadingExport(false);
      })
      .catch(e => { setError('Error al generar respaldo: ' + (e.message||'')); setLoadingExport(false); });
  }

  function handleImport(e) {
    setFile(e.target.files[0]);
    setMsg(''); setError('');
  }

  function doImport() {
    if (!file) { setError('Selecciona un archivo json de respaldo.'); return; }
    if (!window.confirm('¿Estás seguro de que deseas restaurar la base? Esto SOBREESCRIBIRÁ TODO.')) return;
    setLoadingImport(true); setMsg(''); setError('');
    const form = new FormData();
    form.append('file', file);
    fetch('/api/backup/import/', { method: 'POST', body: form, credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.ok) setMsg('Restauración completa.');
        else setError(data.error || 'Fallo en restauración.');
        setLoadingImport(false);
      }).catch(e => { setError('Error: '+(e.message||'')); setLoadingImport(false); });
  }

  return (
    <div style={{maxWidth:560,margin:'50px auto',background:'#fefefe',padding:32,borderRadius:16,border:'1px solid #eee',boxShadow:'#bcc7 0px 2px 14px'}}>
      <h2 style={{textAlign:'center',color:'#157acc'}}>Respaldo y restauración de la base de datos</h2>
      <div style={{marginBottom:40}}>
        <h4>Generar copia de respaldo</h4>
        <button onClick={handleExport} disabled={loadingExport} style={{padding:'10px 18px',fontWeight:'bold',borderRadius:8,background:'#1d62b1',color:'#fff'}}>Descargar respaldo (.json)</button>
        <br /><small style={{color:'#888'}}>Se obtendrá un respaldo completo de la base. Solo visible para administradores.</small>
      </div>
      <div>
        <h4>Restaurar base de datos</h4>
        <input type="file" accept=".json" onChange={handleImport} disabled={loadingImport} />
        <button onClick={doImport} disabled={loadingImport || !file} style={{marginLeft:12,padding:'10px 17px',fontWeight:'bold',borderRadius:8,background:'#ae222f',color:'#fff'}}>Restaurar</button>
        <br /><small style={{color:'#b03b3c'}}>¡Esta acción sobrescribirá todo! Solo archivos del propio sistema y para administradores.</small>
      </div>
      {msg && <div style={{color:'#259c59',margin:'20px 0',fontWeight:500}}>{msg}</div>}
      {error && <div style={{color:'crimson',margin:'20px 0',fontWeight:500}}>{error}</div>}
    </div>
  );
}
export default AdminBackup;
