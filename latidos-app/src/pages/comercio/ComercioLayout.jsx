import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useLatidos } from '../../context/LatidosContext';

const ComercioLayout = () => {
  const { user, logout } = useLatidos();
  const navigate = useNavigate();
  const location = useLocation();

  if (user?.role !== 'comercio') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-main)' }}>
        <p>No tienes permiso para ver esta página.</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '1rem', padding: '0.8rem', borderRadius: '1rem', backgroundColor: 'var(--color-accent)', color: 'white', border: 'none' }}>
          Volver al Inicio
        </button>
      </div>
    );
  }

  const tabs = [
    { path: '/comercio', label: 'Hoy' },
    { path: '/comercio/validar', label: 'Validar bono' },
    { path: '/comercio/bonos', label: 'Mis bonos' },
    { path: '/comercio/informe', label: 'Informe' }
  ];

  return (
    <div style={{ backgroundColor: '#FDFBF7', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={{
        padding: '1.5rem 1.5rem 1.2rem',
        backgroundColor: '#F5E6E8', // Light pink background
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
          {user?.name || 'Comercio'}
        </h1>
        <button 
          onClick={() => navigate('/')}
          style={{ 
            backgroundColor: 'var(--color-header-bg)', 
            color: '#fff', 
            border: 'none', 
            padding: '0.35rem 0.8rem', 
            borderRadius: '1.5rem', 
            fontFamily: 'var(--font-main)', 
            fontWeight: '700', 
            fontSize: '0.7rem',
            cursor: 'pointer',
            letterSpacing: '0.05em'
          }}>
          LATIDOS
        </button>
      </header>

      {/* Content */}
      <div style={{ flex: 1, backgroundColor: '#FDFBF7', padding: '2rem 1.5rem 6rem', overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default ComercioLayout;
