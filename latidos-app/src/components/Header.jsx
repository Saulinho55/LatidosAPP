import React from 'react';
import { useLatidos } from '../context/LatidosContext';

const Header = ({ latidos = 0 }) => {
  const { tr } = useLatidos() || {};

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
        fontFamily: 'var(--font-display)',
        letterSpacing: '-0.02em',
        color: 'var(--color-header-text)'
      }}>
        {(latidos || 0).toLocaleString('es-ES')}
      </div>
    </div>
  );
};

export default Header;