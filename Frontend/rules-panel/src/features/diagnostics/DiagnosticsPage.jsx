import { useState, useEffect } from 'react';
import { api, getApiBase } from '../../services/api';

export default function DiagnosticsPage() {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [backendUrl, setBackendUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    setBackendStatus('checking');
    setBackendUrl(getApiBase());

    try {
      console.log('🔍 Intentando conectar con:', getApiBase());
      const response = await api.get('/health');
      console.log('✅ Respuesta del backend:', response.data);
      setBackendStatus('connected');
      setErrorMessage('');
    } catch (error) {
      console.error('❌ Error conectando con backend:', error);
      setBackendStatus('error');
      setErrorMessage(error.message || 'Error desconocido');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔧 Diagnóstico de Conexión</h1>

      <div style={{
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#f0f0f0',
        borderRadius: '5px'
      }}>
        <h3>Información del Sistema</h3>
        <p><strong>Frontend URL:</strong> {window.location.href}</p>
        <p><strong>Backend URL:</strong> {backendUrl}</p>
        <p><strong>Hostname:</strong> {window.location.hostname}</p>
        <p><strong>Protocol:</strong> {window.location.protocol}</p>
      </div>

      <div style={{
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: backendStatus === 'connected' ? '#d4edda' :
                         backendStatus === 'checking' ? '#fff3cd' : '#f8d7da',
        borderRadius: '5px'
      }}>
        <h3>Estado del Backend</h3>
        <p>
          <strong>Status:</strong>{' '}
          {backendStatus === 'connected' && '✅ Conectado'}
          {backendStatus === 'checking' && '⏳ Verificando...'}
          {backendStatus === 'error' && '❌ Error de conexión'}
        </p>
        {errorMessage && (
          <p><strong>Error:</strong> {errorMessage}</p>
        )}
      </div>

      <button
        onClick={checkBackend}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        🔄 Reintentar Conexión
      </button>

      <div style={{ marginTop: '20px' }}>
        <h3>Instrucciones</h3>
        <ol>
          <li>Verifica que el backend esté corriendo en {backendUrl}</li>
          <li>Abre la consola del navegador (F12) para ver logs detallados</li>
          <li>Si ves errores CORS, verifica la configuración del backend</li>
          <li>Si ves ERR_CONNECTION_REFUSED, el backend no está accesible</li>
        </ol>
      </div>
    </div>
  );
}
