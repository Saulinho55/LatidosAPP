import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useLatidos } from '../../context/LatidosContext';

const ComercioLayout = () => {
  const { user, loading, logout } = useLatidos();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-main)', color: 'var(--color-text)' }}>
        <p>Cargando panel de comercio...</p>
      </div>
    );
  }

  if (user?.role !== 'comercio' && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-main)' }}>
        <p>No tienes permiso para ver esta página.</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '1rem', padding: '0.8rem', borderRadius: '1rem', backgroundColor: 'var(--color-accent)', color: 'white', border: 'none', cursor: 'pointer' }}>
          Volver al Inicio
        </button>
      </div>
    );
  }

  const tabs = [
    { path: '/comercio', label: 'Hoy', icon: '📊' },
    { path: '/comercio/validar', label: 'Validar bono', icon: '🎟️' },
    { path: '/comercio/bonos', label: 'Mis bonos', icon: '🎁' },
    { path: '/comercio/horario', label: 'Horarios & Avisos', icon: '🕒' },
    { path: '/comercio/informe', label: 'Informe', icon: '📈' }
  ];

  return (
    <div style={{ backgroundColor: '#FDFBF7', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={{
        padding: '1.2rem 1.5rem',
        backgroundColor: '#F5E6E8', // Light pink background
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #E8C8CB'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button 
            onClick={() => navigate('/perfil')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.2rem', 
              cursor: 'pointer', 
              color: 'var(--color-header-bg, #4E030F)',
              padding: '0.2rem' 
            }}
            title="Volver a Perfil"
          >
            ←
          </button>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: '700', fontFamily: 'var(--font-main)' }}>
              Panel de Comercio
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: '700', color: 'var(--color-header-bg, #4E030F)', margin: 0, lineHeight: 1.1 }}>
              {user?.name || 'Comercio'}
            </h1>
          </div>
        </div>

        <button 
          onClick={() => navigate('/')}
          style={{ 
            backgroundColor: 'var(--color-header-bg)', 
            color: '#fff', 
            border: 'none', 
            padding: '0.4rem 0.9rem', 
            borderRadius: '1.5rem', 
            fontFamily: 'var(--font-main)', 
            fontWeight: '700', 
            fontSize: '0.72rem',
            cursor: 'pointer',
            letterSpacing: '0.05em'
          }}>
          LATIDOS APP →
        </button>
      </header>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '0.8rem 1.2rem',
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                padding: '0.6rem 1.1rem',
                borderRadius: '2rem',
                border: isActive ? '1.5px solid var(--color-header-bg, #4E030F)' : '1px solid #eed',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-main)',
                fontWeight: isActive ? '700' : '600',
                fontSize: '0.85rem',
                backgroundColor: isActive ? 'var(--color-header-bg, #4E030F)' : '#FAFAFA',
                color: isActive ? '#fff' : '#6b4f53',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: isActive ? '0 2px 8px rgba(78,3,15,0.2)' : 'none'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, backgroundColor: '#FDFBF7', padding: '1.5rem 1.2rem 6rem', overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default ComercioLayout;
