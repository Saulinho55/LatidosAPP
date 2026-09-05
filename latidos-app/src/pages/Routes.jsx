import React from 'react';

const RoutesPage = () => {
  return (
    <div style={{ 
      padding: '3rem 2rem', 
      textAlign: 'center',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>️</div>
      <h2 style={{ color: 'var(--color-secondary)', marginBottom: '1rem', fontSize: '2rem' }}>
        Mis Rutas
      </h2>
      <p style={{ color: 'var(--color-detail)', fontSize: '1.1rem' }}>
        Próximamente...
      </p>
    </div>
  );
};

export default RoutesPage;