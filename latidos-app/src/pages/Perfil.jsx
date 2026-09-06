import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLatidos } from '../context/LatidosContext';

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatDate = (date) => {
  if (!date) return new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  return d.toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

const formatTime = (date) => {
  if (!date) return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: '€ Euro', flag: '🇪🇺' },
  { value: 'USD', label: '$ Dólar', flag: '🇺🇸' },
  { value: 'GBP', label: '£ Libra', flag: '🇬🇧' },
];

const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
];

// ── Section Header ─────────────────────────────────────────────────────────────
const SectionHeader = ({ children }) => (
  <p style={{
    fontFamily: 'var(--font-main)',
    fontSize: '0.68rem',
    fontWeight: '700',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--color-detail)',
    padding: '0 1.2rem',
    marginBottom: '0.5rem',
    marginTop: '1.4rem'
  }}>
    {children}
  </p>
);

// ── Theme Toggle ───────────────────────────────────────────────────────────────
const ThemeToggle = ({ theme, onToggle }) => {
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onToggle}
      style={{
        position: 'relative',
        width: '50px',
        height: '28px',
        borderRadius: '14px',
        backgroundColor: isDark ? 'var(--color-accent)' : '#e0e0e0',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        flexShrink: 0
      }}
    >
      <span style={{
        position: 'absolute',
        top: '3px',
        left: isDark ? '25px' : '3px',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        backgroundColor: 'white',
        transition: 'left 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
      }}>
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  );
};

// ── Select Row ─────────────────────────────────────────────────────────────────
const PreferenceRow = ({ label, icon, children }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.85rem 1.2rem',
    borderBottom: '1px solid var(--color-border)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <span style={{
        fontFamily: 'var(--font-main)',
        fontSize: '0.9rem',
        color: 'var(--color-text)'
      }}>{label}</span>
    </div>
    {children}
  </div>
);

// ── Main Page ──────────────────────────────────────────────────────────────────
const Perfil = () => {
  const {
    latidos, transactions,
    theme, toggleTheme,
    language, setLanguage,
    currency, setCurrency,
    isAuthenticated, logout, user,
    dailyGoal, updateDailyGoal,
    tr
  } = useLatidos();
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const totalCanjeado = transactions.reduce((acc, t) => acc + (t.latidos_usados || t.latidosUsados || 0), 0);

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem', color: 'var(--color-text)' }}>{tr?.cuenta || 'Debes iniciar sesión'}</h2>
        <p style={{ fontFamily: 'var(--font-main)', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Inicia sesión para ver tu perfil, preferencias e historial.</p>
        <button onClick={() => navigate('/login')} style={{ backgroundColor: 'var(--color-accent)', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '2rem', fontFamily: 'var(--font-main)', fontWeight: '600', border: 'none', cursor: 'pointer' }}>Ir a Iniciar Sesión</button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '6rem', paddingTop: '0.5rem' }}>

      {/* ── Profile Header ── */}
      <div style={{
        backgroundColor: 'var(--color-header-bg)',
        margin: '1rem 1rem 0',
        borderRadius: '1.5rem',
        padding: '1.8rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.1rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', right: '-20px', top: '-20px',
          width: '120px', height: '120px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-border)'
        }} />
        <div style={{
          position: 'absolute', right: '20px', bottom: '-30px',
          width: '80px', height: '80px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-border)'
        }} />

        {/* Avatar */}
        <div style={{
          width: '60px', height: '60px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-card-alt)',
          border: '2px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="var(--color-header-text)" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="7" r="4" stroke="var(--color-header-text)" strokeWidth="2"/>
          </svg>
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
            <p style={{
              fontFamily: 'var(--font-main)',
              fontSize: '0.8rem',
              color: 'var(--color-header-text)',
              opacity: 0.7
            }}>{user?.email || 'usuario@latidos.app'}</p>
            {user?.role === 'superadmin' && (
              <span style={{ fontSize: '0.68rem', backgroundColor: '#eab308', color: '#000', fontWeight: '800', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>
                👑 SuperAdmin
              </span>
            )}
            {user?.role === 'admin' && (
              <span style={{ fontSize: '0.68rem', backgroundColor: 'var(--color-accent)', color: '#fff', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>
                ⚡ Admin
              </span>
            )}
            {user?.role === 'comercio' && (
              <span style={{ fontSize: '0.68rem', backgroundColor: '#10b981', color: '#fff', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>
                🏪 Comercio
              </span>
            )}
          </div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: '600',
            color: 'var(--color-header-text)',
            lineHeight: '1.1'
          }}>{user?.name || 'Usuario'}</p>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.4rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              backgroundColor: 'var(--color-card-alt)',
              borderRadius: '1rem',
              padding: '0.2rem 0.6rem',
              border: '1px solid var(--color-border)'
            }}>
              <span style={{ fontSize: '0.85rem' }}>❤</span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: 'var(--color-header-text)'
              }}>{(latidos || 0).toLocaleString('es-ES')}</span>
              <span style={{
                fontFamily: 'var(--font-main)',
                fontSize: '0.72rem',
                color: 'var(--color-header-text)',
                opacity: 0.7
              }}>{tr?.navLatidos || 'Latidos'}</span>
            </div>

            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <button
                onClick={() => navigate('/admin')}
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '1rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  fontFamily: 'var(--font-main)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Panel Admin →
              </button>
            )}

            {user?.role === 'comercio' && (
              <button
                onClick={() => navigate('/comercio')}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '1rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  fontFamily: 'var(--font-main)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Panel Comercio →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{
        display: 'flex',
        gap: '0.6rem',
        margin: '0.75rem 1rem 0'
      }}>
        {[
          { label: tr?.historialCanjes || 'Canjes realizados', value: transactions.length, icon: '🎟' },
          { label: tr?.totalCanjeado || 'Latidos canjeados', value: totalCanjeado.toLocaleString('es-ES'), icon: '❤' },
        ].map((stat, i) => (
          <div key={i} style={{
            flex: 1,
            backgroundColor: 'var(--color-card)',
            borderRadius: '1.2rem',
            padding: '1rem',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '1.4rem' }}>{stat.icon}</span>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: '600',
              color: 'var(--color-text)',
              lineHeight: '1.1',
              marginTop: '0.3rem'
            }}>{stat.value}</p>
            <p style={{
              fontFamily: 'var(--font-main)',
              fontSize: '0.72rem',
              color: 'var(--color-text-muted)',
              marginTop: '0.15rem'
            }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Activity Settings ── */}
      <SectionHeader>{tr?.navActividad || 'Actividad'}</SectionHeader>
      <div style={{
        backgroundColor: 'var(--color-card)',
        borderRadius: '1.3rem',
        margin: '0 1rem',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden'
      }}>
        <PreferenceRow label={`${tr?.objetivoDiario || 'Objetivo Diario'}: ${dailyGoal.toLocaleString('es-ES')} ${tr?.pasosUnit || 'pasos'}`} icon="🎯">
          <input 
            type="range" 
            min="1000" 
            max="20000" 
            step="500" 
            value={dailyGoal} 
            onChange={(e) => updateDailyGoal(parseInt(e.target.value, 10))}
            style={{ width: '120px', accentColor: 'var(--color-accent)' }}
          />
        </PreferenceRow>
      </div>

      {/* ── Preferences ── */}
      <SectionHeader>{tr?.ajustes || 'Preferencias'}</SectionHeader>
      <div style={{
        backgroundColor: 'var(--color-card)',
        borderRadius: '1.3rem',
        margin: '0 1rem',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden'
      }}>
        {/* Theme */}
        <PreferenceRow label={tr?.tema || 'Tema'} icon={theme === 'dark' ? '🌙' : '☀️'}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </PreferenceRow>

        {/* Language */}
        <PreferenceRow label={tr?.idioma || 'Idioma'} icon="🌐">
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {LANGUAGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setLanguage(opt.value)}
                style={{
                  padding: '0.3rem 0.7rem',
                  borderRadius: '1rem',
                  fontFamily: 'var(--font-main)',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  backgroundColor: language === opt.value ? 'var(--color-header-bg)' : 'var(--color-input-bg)',
                  color: language === opt.value ? 'var(--color-header-text)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {opt.flag} {opt.value.toUpperCase()}
              </button>
            ))}
          </div>
        </PreferenceRow>

        {/* Currency */}
        <PreferenceRow label={tr?.divisa || 'Divisa'} icon="💱">
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {CURRENCY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setCurrency(opt.value)}
                style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: '1rem',
                  fontFamily: 'var(--font-main)',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  backgroundColor: currency === opt.value ? 'var(--color-header-bg)' : 'var(--color-input-bg)',
                  color: currency === opt.value ? 'var(--color-header-text)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {opt.flag}
              </button>
            ))}
          </div>
        </PreferenceRow>
      </div>

      {/* ── Transaction History ── */}
      <SectionHeader>{tr?.historialCanjes || 'Historial de canjes'}</SectionHeader>
      <div style={{ margin: '0 1rem' }}>
        {transactions.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--color-card)',
            borderRadius: '1.3rem',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-card)'
          }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.6rem' }}>🎟</span>
            <p style={{
              fontFamily: 'var(--font-main)',
              fontSize: '0.9rem',
              color: 'var(--color-text-muted)'
            }}>
              {tr?.sinCanjes || 'Aún no has canjeado ningún bono'}
            </p>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'var(--color-card)',
            borderRadius: '1.3rem',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)'
          }}>
            {transactions.map((tx, i) => (
              <div
                key={tx.id}
                style={{
                  padding: '0.9rem 1.2rem',
                  borderBottom: i < transactions.length - 1 ? '1px solid var(--color-border)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.9rem'
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '40px', height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-card-alt)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem',
                  flexShrink: 0
                }}>
                  {tx.comercio_emoji || tx.comercioEmoji || '🏪'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: 'var(--font-main)',
                    fontWeight: '600',
                    fontSize: '0.88rem',
                    color: 'var(--color-text)',
                    marginBottom: '0.1rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {tx.comercio_nombre || tx.comercioNombre}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <code style={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      backgroundColor: 'var(--color-card-alt)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '0.3rem',
                      color: 'var(--color-accent)'
                    }}>
                      {tx.code}
                    </code>
                    <span style={{
                      fontFamily: 'var(--font-main)',
                      fontSize: '0.72rem',
                      color: 'var(--color-text-muted)'
                    }}>
                      {formatDate(tx.fecha)} · {formatTime(tx.fecha)}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: 'var(--color-accent)'
                  }}>
                    -{(tx.latidos_usados || tx.latidosUsados)}
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-main)',
                    fontSize: '0.7rem',
                    color: 'var(--color-text-muted)'
                  }}>
                    +{tx.descuento}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Logout ── */}
      <div style={{ margin: '1.4rem 1rem 0' }}>
        {!showLogoutConfirm ? (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              width: '100%',
              padding: '0.9rem',
              borderRadius: '2rem',
              backgroundColor: 'var(--color-card)',
              color: '#e74c3c',
              fontFamily: 'var(--font-main)',
              fontWeight: '600',
              fontSize: '0.9rem',
              boxShadow: 'var(--shadow-card)',
              border: '1.5px solid rgba(231,76,60,0.2)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {tr?.cerrarSesion || 'Cerrar sesión'}
          </button>
        ) : (
          <div style={{
            backgroundColor: 'var(--color-card)',
            borderRadius: '1.3rem',
            padding: '1.2rem',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'center'
          }}>
            <p style={{
              fontFamily: 'var(--font-main)',
              fontSize: '0.9rem',
              color: 'var(--color-text)',
              marginBottom: '1rem'
            }}>
              {tr?.confirmarCierre || '¿Seguro que quieres cerrar sesión?'}
            </p>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '2rem',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-main)', fontWeight: '600', fontSize: '0.88rem',
                  border: 'none', cursor: 'pointer'
                }}
              >
                {tr?.cancelar || 'Cancelar'}
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowLogoutConfirm(false);
                  navigate('/login');
                }}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '2rem',
                  backgroundColor: '#e74c3c', color: 'white',
                  fontFamily: 'var(--font-main)', fontWeight: '600', fontSize: '0.88rem',
                  border: 'none', cursor: 'pointer'
                }}
              >
                {tr?.si || 'Sí, cerrar sesión'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Perfil;
