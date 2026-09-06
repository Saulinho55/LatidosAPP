import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLatidos } from '../../context/LatidosContext';

const ComercioValidar = () => {
  const { validarBono, user } = useLatidos();
  const [searchParams] = useSearchParams();
  
  const [codigo, setCodigo] = useState('');
  const [importe, setImporte] = useState('');
  const [status, setStatus] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setCodigo(codeParam.trim().toUpperCase());
    }
  }, [searchParams]);

  const handleValidar = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (!codigo || !importe) return;
    
    setIsValidating(true);
    try {
      const cleanCode = codigo.trim().toUpperCase();
      const result = await validarBono(cleanCode, importe);
      if (result.success) {
        const tx = result.data || {};
        setStatus({
          type: 'success',
          msg: '¡Bono validado y canjeado con éxito!',
          detail: {
            code: cleanCode,
            descuento: tx.descuento || 'Bono aplicado',
            importe: parseFloat(importe).toFixed(2),
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        });
        setCodigo('');
        setImporte('');
      } else {
        setStatus({ type: 'error', msg: result.error || 'Código inválido o no pertenece a tu comercio.' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'Error de conexión al validar el código.' });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-header-bg)', marginBottom: '0.5rem', fontWeight: '600' }}>
        Validar código del vecino
      </h2>
      <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.85rem', color: '#6b4f53', marginBottom: '1.5rem' }}>
        Introduce el código que te muestra el cliente en su pantalla (o pulsa en el código de prueba) y escribe el importe de la compra.
      </p>

      {/* Demo test button */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.78rem', color: '#888', fontWeight: '600' }}>Prueba rápida:</span>
        <button
          type="button"
          onClick={() => { setCodigo('LAT-2024'); setImporte('15.00'); }}
          style={{
            backgroundColor: '#F5E6E8',
            color: 'var(--color-header-bg)',
            border: '1px dashed #E8C8CB',
            padding: '0.3rem 0.7rem',
            borderRadius: '1rem',
            fontSize: '0.78rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          🎟️ Usar LAT-2024 (15.00 €)
        </button>
      </div>

      <form onSubmit={handleValidar} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-main)', fontSize: '0.85rem', color: 'var(--color-header-bg)', fontWeight: '700', marginBottom: '0.4rem' }}>
            Código del cliente (LAT-XXXX) *
          </label>
          <input
            type="text"
            placeholder="Ej: LAT-4821"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            style={{
              width: '100%',
              padding: '0.9rem 1rem',
              borderRadius: '0.8rem',
              border: '1.5px solid #E8C8CB',
              backgroundColor: '#FCECEE',
              fontFamily: 'var(--font-display)',
              fontSize: '1.2rem',
              color: 'var(--color-header-bg)',
              outline: 'none',
              letterSpacing: '0.05em'
            }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-main)', fontSize: '0.85rem', color: 'var(--color-header-bg)', fontWeight: '700', marginBottom: '0.4rem' }}>
            Importe de la compra (€) *
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            style={{
              width: '100%',
              padding: '0.9rem 1rem',
              borderRadius: '0.8rem',
              border: '1.5px solid #E8C8CB',
              backgroundColor: '#FCECEE',
              fontFamily: 'var(--font-main)',
              fontSize: '1.1rem',
              color: 'var(--color-header-bg)',
              outline: 'none'
            }}
            required
          />
        </div>

        {status && (
          <div style={{
            padding: '1.2rem',
            borderRadius: '1rem',
            backgroundColor: status.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1.5px solid ${status.type === 'success' ? '#10B981' : '#EF4444'}`,
            color: status.type === 'success' ? '#065F46' : '#991B1B',
            fontFamily: 'var(--font-main)',
            fontSize: '0.9rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '1rem', marginBottom: status.detail ? '0.5rem' : 0 }}>
              <span>{status.type === 'success' ? '🎉' : '⚠️'}</span>
              <span>{status.msg}</span>
            </div>
            {status.detail && (
              <div style={{ fontSize: '0.82rem', opacity: 0.9, lineHeight: 1.5, borderTop: '1px dashed rgba(16,185,129,0.3)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <p style={{ margin: 0 }}><strong>Código:</strong> {status.detail.code}</p>
                <p style={{ margin: 0 }}><strong>Bono:</strong> {status.detail.descuento}</p>
                <p style={{ margin: 0 }}><strong>Total compra:</strong> {status.detail.importe} €</p>
                <p style={{ margin: 0 }}><strong>Hora:</strong> {status.detail.fecha}</p>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isValidating}
          style={{
            backgroundColor: 'var(--color-header-bg)',
            color: '#fff',
            border: 'none',
            padding: '1rem',
            borderRadius: '2rem',
            fontFamily: 'var(--font-main)',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: isValidating ? 'not-allowed' : 'pointer',
            opacity: isValidating ? 0.7 : 1,
            marginTop: '0.5rem',
            boxShadow: '0 4px 12px rgba(78,3,15,0.25)'
          }}
        >
          {isValidating ? 'Validando...' : '✓ Validar y Registrar Venta'}
        </button>
      </form>
    </div>
  );
};

export default ComercioValidar;
