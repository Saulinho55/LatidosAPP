import React from 'react';
import { useLatidos } from '../context/LatidosContext';

const StepsCard = ({ pasos, objetivo = 10000, isTracking, isSupported, onStart, onStop }) => {
  const { tr } = useLatidos();
  const progreso = Math.min((pasos / objetivo) * 100, 100);

  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      padding: '1.4rem 1.5rem',
      borderRadius: '1.5rem',
      margin: '0.75rem 1rem',
      boxShadow: 'var(--shadow-card)',
      border: '1px solid var(--color-border)'
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '0.8rem'
      }}>
        <h3 style={{
          color: 'var(--color-text)',
          fontSize: '1rem', fontWeight: '500',
          fontFamily: 'var(--font-main)', letterSpacing: '0.01em',
          opacity: 0.8
        }}>
          {tr?.pasosHoy || 'Pasos de hoy'}
        </h3>
        <span style={{
          fontSize: '2.4rem', fontWeight: '600',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-display)', letterSpacing: '-0.01em'
        }}>
          {pasos.toLocaleString('es-ES')}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        backgroundColor: 'var(--color-card-alt)',
        height: '6px', borderRadius: '3px',
        overflow: 'hidden', marginBottom: '0.5rem'
      }}>
        <div style={{
          backgroundColor: 'var(--color-accent)',
          height: '100%', width: `${progreso}%`,
          borderRadius: '3px', transition: 'width 0.5s ease'
        }} />
      </div>

      <p style={{
        color: 'var(--color-text-muted)',
        marginBottom: '1.2rem', fontSize: '0.82rem',
        fontFamily: 'var(--font-main)'
      }}>
        {tr?.objetivo || 'Objetivo'}: {pasos.toLocaleString('es-ES')} / {objetivo.toLocaleString('es-ES')}
      </p>

      {isTracking && (
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: '0.5rem', marginBottom: '0.9rem'
        }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            backgroundColor: '#4ade80', display: 'inline-block',
            animation: 'pulse 1.5s infinite'
          }} />
          <span style={{
            fontSize: '0.78rem', color: '#4ade80',
            fontFamily: 'var(--font-main)', fontWeight: '600'
          }}>
            {tr?.iniciar || 'Contando pasos...'}
          </span>
        </div>
      )}

      {!isSupported ? (
        <p style={{
          textAlign: 'center', color: 'var(--color-text-muted)',
          fontSize: '0.85rem', fontFamily: 'var(--font-main)'
        }}>
          Tu dispositivo no soporta el sensor de movimiento.
        </p>
      ) : (
        <button
          onClick={isTracking ? onStop : onStart}
          style={{
            backgroundColor: isTracking ? '#4ade80' : 'var(--color-accent)',
            color: isTracking ? '#0a0a0f' : 'white',
            padding: '0.85rem', borderRadius: '2.5rem', width: '100%',
            fontSize: '0.95rem', fontWeight: '700',
            fontFamily: 'var(--font-main)', letterSpacing: '0.01em',
            transition: 'opacity 0.2s, background-color 0.3s',
            border: 'none', cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          {isTracking ? `⏹ ${tr?.detener || 'Detener'}` : `▶ ${tr?.iniciar || 'Iniciar'}`}
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
};

export default StepsCard;