import React from 'react';

const NFCConnection = () => {
  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      padding: '1.4rem 1.5rem',
      borderRadius: '1.5rem',
      margin: '0.75rem 1rem',
      boxShadow: 'var(--shadow-card)',
      border: '1px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.2rem' }}>
        {/* NFC icon circle */}
        <div style={{
          backgroundColor: 'var(--color-card-alt)',
          width: '3rem', height: '3rem',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          border: '1px solid var(--color-border)'
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-accent)" strokeWidth="2.2" strokeLinecap="round">
            <path d="M8.5 8.5a5 5 0 0 0 0 7"/>
            <path d="M5.5 5.5a9 9 0 0 0 0 13"/>
            <circle cx="11.5" cy="12" r="1.5" fill="var(--color-accent)" stroke="none"/>
          </svg>
        </div>
        <div>
          <h3 style={{
            color: 'var(--color-text)',
            fontSize: '1rem', fontWeight: '600',
            fontFamily: 'var(--font-main)', marginBottom: '0.3rem'
          }}>
            Conectar pulsera
          </h3>
          <p style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.85rem', lineHeight: '1.5',
            fontFamily: 'var(--font-main)'
          }}>
            Vincula tu pulsera por NFC para registrar tus pasos automáticamente.
          </p>
        </div>
      </div>

      <button
        style={{
          backgroundColor: 'var(--color-card-alt)',
          color: 'var(--color-text)',
          padding: '0.85rem', borderRadius: '2.5rem',
          width: '100%', fontSize: '0.95rem', fontWeight: '600',
          fontFamily: 'var(--font-main)',
          border: '1px solid var(--color-border)',
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        Conectar pulsera
      </button>
    </div>
  );
};

export default NFCConnection;