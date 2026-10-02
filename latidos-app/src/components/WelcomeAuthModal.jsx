import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLatidos } from '../context/LatidosContext';
import latidosIcon from '../assets/latidos_icon.png';

const WelcomeAuthModal = () => {
  const { isAuthenticated, loading } = useLatidos();
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Only show if user is NOT authenticated and hasn't chosen "Ahora no" during this visit
    if (!loading && !isAuthenticated) {
      const dismissed = sessionStorage.getItem('latidos_guest_dismissed');
      if (!dismissed) {
        // Slight delay so the splash screen transition completes first
        const timer = setTimeout(() => {
          setShow(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    } else if (isAuthenticated) {
      setShow(false);
    }
  }, [loading, isAuthenticated]);

  if (!show || isAuthenticated) return null;

  const handleRegister = () => {
    setShow(false);
    navigate('/login', { state: { register: true } });
  };

  const handleLogin = () => {
    setShow(false);
    navigate('/login');
  };

  const handleNotNow = () => {
    sessionStorage.setItem('latidos_guest_dismissed', 'true');
    setShow(false);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99998,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.2rem',
      animation: 'fadeInWelcome 0.3s ease-out'
    }}>
      <div style={{
        backgroundColor: 'var(--color-card, #ffffff)',
        borderRadius: '2rem',
        padding: '2.2rem 1.8rem 1.8rem',
        maxWidth: '390px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        border: '1px solid var(--color-border, rgba(0,0,0,0.1))',
        animation: 'slideUpWelcome 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Logo */}
        <div style={{
          width: '74px',
          height: '74px',
          margin: '0 auto 1.2rem',
          borderRadius: '1.5rem',
          backgroundColor: 'rgba(212, 96, 122, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 20px rgba(212, 96, 122, 0.2)'
        }}>
          <img
            src={latidosIcon}
            alt="Latidos Logo"
            style={{ width: '48px', height: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* Title & subtitle */}
        <h2 style={{
          fontFamily: 'var(--font-display, sans-serif)',
          fontSize: '1.65rem',
          fontWeight: '800',
          color: 'var(--color-text, #111)',
          margin: '0 0 0.5rem',
          letterSpacing: '-0.02em'
        }}>
          ¡Bienvenido a Latidos!
        </h2>

        <p style={{
          fontFamily: 'var(--font-main, sans-serif)',
          fontSize: '0.9rem',
          color: 'var(--color-text-muted, #666)',
          lineHeight: '1.5',
          margin: '0 0 1.8rem'
        }}>
          Camina por Telde, convierte tus pasos en <strong>Latidos</strong> y canjéalos por descuentos en comercios locales.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* Primary: Crear cuenta */}
          <button
            onClick={handleRegister}
            style={{
              backgroundColor: 'var(--color-accent, #d4607a)',
              color: 'white',
              border: 'none',
              borderRadius: '2rem',
              padding: '0.95rem 1.2rem',
              fontSize: '1rem',
              fontWeight: '700',
              fontFamily: 'var(--font-main, sans-serif)',
              cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(212, 96, 122, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'transform 0.15s ease'
            }}
          >
            ✨ Crear cuenta gratis
          </button>

          {/* Secondary: Iniciar sesión */}
          <button
            onClick={handleLogin}
            style={{
              backgroundColor: 'var(--color-card-alt, rgba(0,0,0,0.04))',
              color: 'var(--color-text, #222)',
              border: '1.5px solid var(--color-border, rgba(0,0,0,0.12))',
              borderRadius: '2rem',
              padding: '0.85rem 1.2rem',
              fontSize: '0.95rem',
              fontWeight: '700',
              fontFamily: 'var(--font-main, sans-serif)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'background-color 0.15s ease'
            }}
          >
            🔑 Ya tengo una cuenta
          </button>

          {/* Tertiary: Ahora no */}
          <button
            onClick={handleNotNow}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--color-text-muted, #888)',
              border: 'none',
              padding: '0.7rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              fontFamily: 'var(--font-main, sans-serif)',
              cursor: 'pointer',
              textDecoration: 'underline',
              marginTop: '0.3rem'
            }}
          >
            Ahora no (explorar como invitado)
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInWelcome {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpWelcome {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default WelcomeAuthModal;
