import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLatidos } from '../context/LatidosContext';

const Icons = {
  latidos: ({ active }) => (
    <div style={{
      width: '38px', height: '38px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'filter 0.3s ease'
    }}>
      <svg
        width="22" height="22" viewBox="0 0 24 24"
        fill={active ? 'var(--color-accent)' : 'none'}
        stroke={active ? 'var(--color-accent)' : 'var(--color-nav-text)'}
        strokeWidth="1.8"
        style={{
          filter: active
            ? 'drop-shadow(0 0 6px var(--color-accent)) drop-shadow(0 0 14px var(--color-accent))'
            : 'none',
          transition: 'filter 0.3s ease, fill 0.3s ease, stroke 0.3s ease'
        }}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </div>
  ),
  rutas: ({ active }) => (
    <div style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--color-secondary)' : 'var(--color-nav-text)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18M12 3l9 9-9 9"/>
      </svg>
    </div>
  ),
  actividad: ({ active }) => (
    <div style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--color-accent)' : 'var(--color-nav-text)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    </div>
  ),
  cartera: ({ active }) => (
    <div style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--color-secondary)' : 'var(--color-nav-text)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="3"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <circle cx="12" cy="14" r="2" fill={active ? 'var(--color-secondary)' : 'none'}/>
      </svg>
    </div>
  ),
  comercios: ({ active }) => (
    <div style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--color-secondary)' : 'var(--color-nav-text)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l1-5h16l1 5"/>
        <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/>
        <rect x="5" y="14" width="4" height="5" rx="1"/>
        <rect x="10" y="14" width="9" height="5" rx="1"/>
      </svg>
    </div>
  ),
  validar: ({ active }) => (
    <div style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--color-secondary)' : 'var(--color-nav-text)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>
        <path d="M3 10h18"/>
        <path d="M7 14h.01"/>
        <path d="M11 14h.01"/>
        <path d="M15 14h.01"/>
      </svg>
    </div>
  ),
  bonos: ({ active }) => (
    <div style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--color-secondary)' : 'var(--color-nav-text)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/>
        <path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.7-3.11c-1 .8-2.5 1.5-4 1.5"/>
      </svg>
    </div>
  ),
  informe: ({ active }) => (
    <div style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--color-secondary)' : 'var(--color-nav-text)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="m19 9-5 5-4-4-3 3"/>
      </svg>
    </div>
  ),
  perfil: ({ active }) => (
    <div style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--color-secondary)' : 'var(--color-nav-text)'}
        strokeWidth="1.8" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
  ),
  admin: ({ active }) => (
    <div style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--color-secondary)' : 'var(--color-nav-text)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </div>
  ),
  horario: ({ active }) => (
    <div style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--color-secondary)' : 'var(--color-nav-text)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    </div>
  ),
  productos: ({ active }) => (
    <div style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--color-accent)' : 'var(--color-nav-text)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
        <path d="M3 6h18"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    </div>
  )
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, tr } = useLatidos();

  let items = [
    { path: '/',           label: tr?.navLatidos || 'Latidos',    icon: 'latidos'   },
    { path: '/actividad',  label: tr?.navActividad || 'Actividad',icon: 'actividad' },
    { path: '/rutas',      label: tr?.navRutas || 'Rutas',        icon: 'rutas'     },
    { path: '/cartera',    label: tr?.navCartera || 'Cartera',    icon: 'cartera'   },
    { path: '/comercios',  label: tr?.navComercios || 'Comercios',icon: 'comercios' },
    { path: '/perfil',     label: tr?.navPerfil || 'Perfil',      icon: 'perfil'    },
  ];

  if (user?.role === 'admin' || user?.role === 'superadmin') {
    // Remove 'rutas', 'cartera' and 'actividad' for admins
    items = items.filter(item => item.path !== '/rutas' && item.path !== '/cartera' && item.path !== '/actividad');
    // Add 'Admin' tab
    items.push({ path: '/admin', label: user?.role === 'superadmin' ? 'SuperAdmin' : (tr?.navAdmin || 'Admin'), icon: 'admin' });
  } else if (user?.role === 'comercio') {
    items = [
      { path: '/comercio',          label: tr?.navHoy || 'Hoy',           icon: 'comercios' },
      { path: '/comercio/productos',label: 'Productos',                   icon: 'productos' },
      { path: '/comercio/validar',  label: tr?.navValidar || 'Validar',   icon: 'validar'   },
      { path: '/comercio/bonos',    label: tr?.navBonos || 'Bonos',       icon: 'bonos'     },
      { path: '/comercio/horario',  label: 'Horarios',                    icon: 'horario'   },
      { path: '/comercio/informe',  label: tr?.navInforme || 'Informe',   icon: 'informe'   },
      { path: '/perfil',            label: tr?.navPerfil || 'Perfil',     icon: 'perfil'    },
    ];
  }

  return (
    <nav style={{
      position: 'fixed',
      bottom: '0.8rem',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 2rem)',
      maxWidth: '460px',
      backgroundColor: 'var(--color-nav)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '0.4rem 0.3rem 0.3rem',
      borderRadius: '2rem',
      boxShadow: 'var(--shadow-nav)',
    }}>
      {items.map(item => {
        const isActive = location.pathname === item.path;
        const IconComponent = Icons[item.icon];
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              backgroundColor: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.1rem',
              padding: '0.15rem 0.4rem',
              borderRadius: '1rem',
              transition: 'all 0.25s ease',
              minWidth: '54px'
            }}
          >
            <IconComponent active={isActive} />
            <span style={{
              fontSize: '0.62rem',
              fontWeight: isActive ? '700' : '400',
              color: isActive ? 'var(--color-accent)' : 'var(--color-nav-text)',
              fontFamily: 'var(--font-main)',
              transition: 'color 0.25s ease',
              whiteSpace: 'nowrap'
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;