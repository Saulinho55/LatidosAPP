import React, { useState } from 'react';
import { useLatidos } from '../../context/LatidosContext';

const ComercioValidar = () => {
  const { validarBono } = useLatidos();
  
  const [codigo, setCodigo] = useState('');
  const [importe, setImporte] = useState('');
  const [status, setStatus] = useState(null);

  const handleValidar = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (!codigo || !importe) return;
    
    const result = await validarBono(codigo.toUpperCase(), importe);
    if (result.success) {
      setStatus({ type: 'success', msg: '¡Bono validado con éxito!' });
      setCodigo('');
      setImporte('');
    } else {
      setStatus({ type: 'error', msg: result.error || 'Código inválido o no pertenece a tu comercio.' });
    }
  };

  return (
    <div style={{ maxWidth: '400px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-header-bg)', marginBottom: '0.5rem', fontWeight: '600' }}>
        Validar código del vecino
      </h2>
      <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.85rem', color: '#6b4f53', marginBottom: '2rem' }}>
        Escribe el código que te muestra el cliente (prueba con LAT-2024) o acerca la pulsera al lector.
      </p>

      <form onSubmit={handleValidar} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-main)', fontSize: '0.85rem', color: 'var(--color-header-bg)', fontWeight: '600', marginBottom: '0.5rem' }}>
            LAT-XXXX
          </label>
          <input
            type="text"
            placeholder="LAT-XXXX"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '0.8rem',
              border: '1px solid #E8C8CB',
              backgroundColor: '#FCECEE',
              fontFamily: 'var(--font-display)',
              fontSize: '1.2rem',
              color: 'var(--color-header-bg)',
              outline: 'none'
            }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-main)', fontSize: '0.85rem', color: 'var(--color-header-bg)', fontWeight: '600', marginBottom: '0.5rem' }}>
            Importe de la compra (€)
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '0.8rem',
              border: '1px solid #E8C8CB',
              backgroundColor: '#FCECEE',
              fontFamily: 'var(--font-main)',
              fontSize: '1rem',
              color: 'var(--color-header-bg)',
              outline: 'none'
            }}
            required
          />
        </div>

        {status && (
          <div style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: status.type === 'success' ? '#E8F5E9' : '#FFEBEE',
            color: status.type === 'success' ? '#2E7D32' : '#C62828',
            fontFamily: 'var(--font-main)',
            fontSize: '0.85rem'
          }}>
            {status.msg}
          </div>
        )}

        <button
          type="submit"
          style={{
            backgroundColor: 'var(--color-header-bg)',
            color: '#fff',
            border: 'none',
            padding: '1rem',
            borderRadius: '2rem',
            fontFamily: 'var(--font-main)',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Validar
        </button>
      </form>
    </div>
  );
};

export default ComercioValidar;
