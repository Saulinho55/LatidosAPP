import React from 'react';
import { useLatidos } from '../context/LatidosContext';
import { formatLatidosAsMoney } from '../i18n';

const Header = ({ latidos = 0 }) => {
  const { currency = 'EUR', tr } = useLatidos() || {};
  const valorMonetario = formatLatidosAsMoney(latidos || 0, currency);

  return (
    <div style={{
      backgroundColor: 'var(--color-header-bg)',
      color: 'var(--color-header-text)',
      padding: '1.8rem 1.8rem 2rem',
      borderRadius: '1.5rem',
      margin: '1rem 1rem 0.75rem',
      textAlign: 'left',
      border: '1px solid var(--color-border)'
    }}>
      <p style={{
        fontSize: '0.95rem',
        fontWeight: '400',
        marginBottom: '0.4rem',
        opacity: 0.65,
        fontFamily: 'var(--font-main)',
        letterSpacing: '0.01em'
      }}>
        {tr?.misLatidos || 'Mis Latidos'}
      </p>
      <div style={{
        fontSize: '5.5rem',
        fontWeight: '600',
        lineHeight: '1',
        marginBottom: '0.3rem',
        fontFamily: 'var(--font-display)',
        letterSpacing: '-0.02em',
        color: 'var(--color-header-text)'
      }}>
        {(latidos || 0).toLocaleString('es-ES')}
      </div>
      {/* Equivalencia en euros */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.4rem',
        marginBottom: '0.4rem'
      }}>
        <span style={{
          fontSize: '1.4rem',
          fontFamily: 'var(--font-display)',
          fontWeight: '600',
          opacity: 0.75,
          color: 'var(--color-header-text)'
        }}>
          = {valorMonetario}
        </span>
      </div>
      <p style={{
        fontSize: '0.88rem',
        opacity: 0.5,
        fontFamily: 'var(--font-main)',
        fontWeight: '300'
      }}>
        {tr?.latidosBono || '100 Latidos = 1 € de bono'}
      </p>
    </div>
  );
};

export default Header;