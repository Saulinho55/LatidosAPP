import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLatidos } from '../../context/LatidosContext';

const ComercioValidar = () => {
  const { validarBono } = useLatidos();
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
            descuento: typeof tx.descuento === 'number' ? `${tx.descuento} € dto.` : (tx.descuento || 'Bono aplicado'),
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
    <div style={{ maxWidth: '460px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'var(--color-card)',
        borderRadius: '1.5rem',
        padding: '1.5rem',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)'
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-text)', marginBottom: '0.4rem', fontWeight: '700' }}>
          Validar código del vecino
        </h2>
        <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.2rem' }}>
          Introduce el código que te muestra el cliente en su pantalla y escribe el importe total de la compra.
        </p>

        {/* Demo test button */}
        <div style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Prueba rápida:</span>
          <button
            type="button"
            onClick={() => { setCodigo('LAT-2024'); setImporte('15.00'); }}
            style={{
              backgroundColor: 'var(--color-card-alt)',
              color: 'var(--color-text)',
              border: '1px dashed var(--color-border)',
              padding: '0.35rem 0.75rem',
              borderRadius: '1rem',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            🎟️ LAT-2024 (15.00 €)
          </button>
        </div>

        <form onSubmit={handleValidar} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-main)', fontSize: '0.82rem', color: 'var(--color-text)', fontWeight: '700', marginBottom: '0.4rem' }}>
              Código del cliente (LAT-XXXX) *
            </label>
            <input
              type="text"
              placeholder="Ej: LAT-4821"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '0.9rem',
                border: '1.5px solid var(--color-border)',
                backgroundColor: 'var(--color-input-bg)',
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                color: 'var(--color-text)',
                outline: 'none',
                letterSpacing: '0.05em'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-main)', fontSize: '0.82rem', color: 'var(--color-text)', fontWeight: '700', marginBottom: '0.4rem' }}>
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
                padding: '0.85rem 1rem',
                borderRadius: '0.9rem',
                border: '1.5px solid var(--color-border)',
                backgroundColor: 'var(--color-input-bg)',
                fontFamily: 'var(--font-main)',
                fontSize: '1.1rem',
                color: 'var(--color-text)',
                outline: 'none'
              }}
              required
            />
          </div>

          {status && (
            <div style={{
              padding: '1.1rem',
              borderRadius: '1rem',
              backgroundColor: status.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1.5px solid ${status.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: status.type === 'success' ? '#059669' : '#dc2626',
              fontFamily: 'var(--font-main)',
              fontSize: '0.88rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', fontSize: '0.95rem', marginBottom: status.detail ? '0.4rem' : 0 }}>
                <span>{status.type === 'success' ? '🎉' : '⚠️'}</span>
                <span>{status.msg}</span>
              </div>
              {status.detail && (
                <div style={{ fontSize: '0.82rem', opacity: 0.95, lineHeight: 1.5, borderTop: '1px dashed rgba(16,185,129,0.3)', paddingTop: '0.5rem', marginTop: '0.4rem', color: 'var(--color-text)' }}>
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
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              padding: '0.95rem',
              borderRadius: '2rem',
              fontFamily: 'var(--font-main)',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: isValidating ? 'not-allowed' : 'pointer',
              opacity: isValidating ? 0.7 : 1,
              marginTop: '0.4rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            {isValidating ? 'Validando...' : '✓ Validar y Registrar Venta'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ComercioValidar;
