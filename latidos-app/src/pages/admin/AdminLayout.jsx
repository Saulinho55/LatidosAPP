import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useLatidos } from '../../context/LatidosContext';

const AdminLayout = () => {
  const { user } = useLatidos();
  const navigate = useNavigate();
  const location = useLocation();

  if (user?.role !== 'admin') {
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
    { path: '/admin', label: '📊 Dashboard' },
    { path: '/admin/users', label: '👥 Usuarios' },
    { path: '/admin/comercios', label: '🏪 Comercios' }
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        padding: '1.2rem 1.5rem',
        backgroundColor: 'var(--color-card)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button onClick={() => navigate('/perfil')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-text)' }}>
            ←
          </button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-text)' }}>
            Panel Admin
          </h1>
        </div>
      </header>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '1rem 1.5rem',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        borderBottom: '1px solid var(--color-border)'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '2rem',
              border: 'none',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-main)',
              fontWeight: '600',
              fontSize: '0.85rem',
              backgroundColor: location.pathname === tab.path ? 'var(--color-header-bg)' : 'var(--color-card-alt)',
              color: location.pathname === tab.path ? 'var(--color-header-text)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', paddingBottom: '2rem' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
