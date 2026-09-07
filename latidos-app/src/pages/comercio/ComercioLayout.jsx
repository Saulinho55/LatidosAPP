import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useLatidos } from '../../context/LatidosContext';

const ComercioLayout = () => {
  const { user, loading, theme, toggleTheme } = useLatidos();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', fontFamily: 'var(--font-main)', color: 'var(--color-text)' }}>
        <p>Cargando panel de comercio...</p>
      </div>
    );
  }

  const isAllowed = user?.role === 'comercio' || user?.role === 'admin' || user?.role === 'superadmin';

  if (!isAllowed) {
    return (
      <div style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        fontFamily: 'var(--font-main)',
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'var(--color-card)',
          borderRadius: '1.5rem',
          padding: '2rem',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--color-border)',
          maxWidth: '380px'
        }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.8rem' }}>🔒</span>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', margin: '0 0 0.5rem' }}>
            Acceso a Comercios
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Esta sección está reservada para comercios colaboradores de LATIDOS.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '0.8rem 1.5rem',
                borderRadius: '1rem',
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '700'
              }}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '0.7rem 1.5rem',
                borderRadius: '1rem',
                backgroundColor: 'var(--color-card-alt)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { path: '/comercio', label: 'Hoy', icon: '📊' },
    { path: '/comercio/productos', label: 'Productos & Servicios', icon: '🛍️' },
    { path: '/comercio/validar', label: 'Validar bono', icon: '🎟️' },
    { path: '/comercio/bonos', label: 'Mis bonos', icon: '🎁' },
    { path: '/comercio/horario', label: 'Horarios & Avisos', icon: '🕒' },
    { path: '/comercio/informe', label: 'Informe', icon: '📈' }
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={{
        padding: '1rem 1.2rem',
        backgroundColor: 'var(--color-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button 
            onClick={() => navigate('/perfil')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.3rem', 
              cursor: 'pointer', 
              color: 'var(--color-text)',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Volver a Perfil"
          >
            ←
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', fontWeight: '700', fontFamily: 'var(--font-main)' }}>
                Panel de Comercio
              </span>
              {(user?.role === 'admin' || user?.role === 'superadmin') && (
                <span style={{ fontSize: '0.62rem', backgroundColor: 'var(--color-accent)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: '700' }}>
                  Modo Admin
                </span>
              )}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text)', margin: 0, lineHeight: 1.1 }}>
              {user?.name || 'Mi Comercio'}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            style={{
              background: 'var(--color-card-alt)',
              border: '1px solid var(--color-border)',
              borderRadius: '2rem',
              padding: '0.4rem 0.75rem',
              cursor: 'pointer',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-main)',
              fontWeight: '600'
            }}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          <button 
            onClick={() => navigate('/')}
            style={{ 
              backgroundColor: 'var(--color-accent)', 
              color: '#fff', 
              border: 'none', 
              padding: '0.45rem 0.85rem', 
              borderRadius: '1.5rem', 
              fontFamily: 'var(--font-main)', 
              fontWeight: '700', 
              fontSize: '0.72rem',
              cursor: 'pointer',
              letterSpacing: '0.04em'
            }}>
            App →
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--color-card)',
        borderBottom: '1px solid var(--color-border)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        position: 'sticky',
        top: '61px',
        zIndex: 90
      }}>
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '2rem',
                border: isActive ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-main)',
                fontWeight: isActive ? '700' : '600',
                fontSize: '0.82rem',
                backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-card-alt)',
                color: isActive ? '#fff' : 'var(--color-text)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '1.2rem 1rem 6.5rem', overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default ComercioLayout;
