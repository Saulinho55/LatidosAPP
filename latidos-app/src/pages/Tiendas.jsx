import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLatidos } from '../context/LatidosContext';
import { useStepCounter } from '../hooks/useStepCounter';

// Fix Leaflet default icon missing in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored marker
const createMarker = (color, active = false) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        width: ${active ? 36 : 28}px;
        height: ${active ? 36 : 28}px;
        background: ${active ? 'var(--color-accent, #5E000E)' : color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
      "></div>
    `,
    iconSize: [active ? 36 : 28, active ? 36 : 28],
    iconAnchor: [active ? 18 : 14, active ? 36 : 28],
  });

// Component to fly the map to a position
const MapFlyTo = ({ position, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, zoom, { duration: 1 });
  }, [position, zoom, map]);
  return null;
};

const CODE_VALIDITY_SECONDS = 600;
const generateCode = () => `LAT-${Math.floor(1000 + Math.random() * 9000)}`;

const DIAS_KEYS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' }
];

const isShopOnVacation = (comercio) => {
  if (!comercio?.vacaciones) return false;
  let vac = comercio.vacaciones;
  if (typeof vac === 'string') {
    try { vac = JSON.parse(vac); } catch (e) { return false; }
  }
  if (!vac) return false;
  if (vac.activo) return true;
  if (vac.inicio && vac.fin) {
    const today = new Date().toISOString().slice(0, 10);
    return today >= vac.inicio && today <= vac.fin;
  }
  return false;
};

const getActiveNotice = (comercio) => {
  if (!comercio?.aviso) return null;
  let av = comercio.aviso;
  if (typeof av === 'string' && (av.trim().startsWith('{') || av.trim().startsWith('['))) {
    try { av = JSON.parse(av); } catch (e) {}
  }
  if (typeof av === 'string') {
    return av.trim() ? { texto: av.trim() } : null;
  }
  if (typeof av === 'object' && av !== null) {
    if (av.activo === false) return null;
    const texto = (av.texto || '').trim();
    if (!texto) return null;

    const today = new Date().toISOString().slice(0, 10);
    if (av.inicio && today < av.inicio) return null;
    if (av.fin && today > av.fin) return null;

    return {
      texto,
      inicio: av.inicio || '',
      fin: av.fin || ''
    };
  }
  return null;
};

const ComercioModal = ({ comercio, onClose, latidos, activeCode, onGenerarCodigo, onCancelarCodigo, isAuthenticated, user, onTrazarRuta, tr }) => {
  const [error, setError] = useState('');
  const [selectedBonoIndex, setSelectedBonoIndex] = useState(comercio?.bonos?.length > 0 ? 0 : -1);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  const isThisCommerceActive = activeCode && activeCode.comercioNombre === comercio.nombre;
  const hasOtherActiveCode = activeCode && !isThisCommerceActive;

  // Safe parsing of horario and vacaciones in case raw JSON strings are passed
  let parsedHorario = comercio?.horario;
  if (typeof parsedHorario === 'string') {
    try { parsedHorario = JSON.parse(parsedHorario); } catch(e) { parsedHorario = {}; }
  }
  parsedHorario = parsedHorario || {};

  let parsedVacaciones = comercio?.vacaciones;
  if (typeof parsedVacaciones === 'string') {
    try { parsedVacaciones = JSON.parse(parsedVacaciones); } catch(e) { parsedVacaciones = {}; }
  }
  parsedVacaciones = parsedVacaciones || {};

  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!isThisCommerceActive) return;
    const calc = () => Math.max(0, Math.floor((activeCode.expiresAt - Date.now()) / 1000));
    setSecondsLeft(calc());
    const interval = setInterval(() => setSecondsLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [isThisCommerceActive, activeCode]);

  if (!comercio) return null;

  const onVacation = isShopOnVacation(comercio);
  const todayKey = DIAS_KEYS[(new Date().getDay() + 6) % 7].key;
  const todayLabel = DIAS_KEYS[(new Date().getDay() + 6) % 7].label;
  const todaySchedule = parsedHorario[todayKey] || null;

  const bonoActual = selectedBonoIndex >= 0 ? comercio.bonos[selectedBonoIndex] : { coste: comercio.latidosNecesarios, descuento: comercio.descuento, titulo: 'Bono por defecto' };
  const latidosRequeridos = bonoActual.coste !== undefined ? parseInt(bonoActual.coste, 10) : comercio.latidosNecesarios;
  const puedeCanjear = latidos >= latidosRequeridos;
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const handleGenerar = async () => {
    if (hasOtherActiveCode) {
      setError(tr?.yaTienesCodigoActivo || 'Ya tienes un código activo en curso.');
      return;
    }
    if (!puedeCanjear && user?.role !== 'admin') {
      setError(`${tr?.latidosInsuficientes || 'Necesitas más latidos'} (${latidosRequeridos - latidos})`);
      return;
    }
    setError('');
    const res = await onGenerarCodigo({ comercio, bono: bonoActual });
    if (!res.success) {
      setError(res.error || 'No se pudo generar el código');
    }
  };

  const navigate = useNavigate();

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(3,38,23,0.4)',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease'
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '88vh',
        overflowY: 'auto',
        backgroundColor: 'var(--color-white)',
        borderRadius: '1.5rem 1.5rem 0 0',
        padding: '1.5rem 1.5rem 2.5rem',
        zIndex: 1000,
        animation: 'slideUp 0.3s ease',
        boxShadow: '0 -8px 32px rgba(3,38,23,0.18)'
      }}>
        {/* Handle */}
        <div style={{
          width: '40px', height: '4px',
          backgroundColor: '#ddd',
          borderRadius: '2px',
          margin: '0 auto 1.2rem',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '1.4rem' }}>{comercio.emoji}</span>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'var(--color-secondary)'
              }}>
                {comercio.nombre}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.75rem',
                color: 'white',
                backgroundColor: comercio.color,
                padding: '0.2rem 0.6rem',
                borderRadius: '1rem',
                fontFamily: 'var(--font-main)',
                fontWeight: '500'
              }}>
                {comercio.categoria}
              </span>
              {onVacation && (
                <span style={{
                  fontSize: '0.72rem',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '1rem',
                  fontWeight: '700'
                }}>
                  🏖️ De vacaciones
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f5f5f5', border: 'none',
              borderRadius: '50%', width: '32px', height: '32px',
              fontSize: '1rem', cursor: 'pointer', color: '#888',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >✕</button>
        </div>

        {/* Address */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          marginBottom: (comercio.telefono || comercio.email) ? '0.6rem' : '1rem',
          color: 'var(--color-detail)',
          fontSize: '0.88rem',
          fontFamily: 'var(--font-main)'
        }}>
          <span>📍</span>
          <span>{comercio.direccion}</span>
        </div>

        {/* Contact buttons if present */}
        {(comercio.telefono || comercio.email) && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {comercio.telefono && comercio.telefono.trim() !== '' && (
              <a
                href={`tel:${comercio.telefono.replace(/\s+/g, '')}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: '#ecfdf5',
                  border: '1.5px solid #a7f3d0',
                  color: '#047857',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '1.2rem',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-main)'
                }}
              >
                <span>📞</span>
                <span>Llamar ({comercio.telefono})</span>
              </a>
            )}

            {comercio.email && comercio.email.trim() !== '' && (
              <a
                href={`mailto:${comercio.email}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  color: '#1d4ed8',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '1.2rem',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-main)'
                }}
              >
                <span>✉️</span>
                <span>Email ({comercio.email})</span>
              </a>
            )}
          </div>
        )}

        {/* ── BANNER DE VACACIONES ── */}
        {onVacation && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1.5px solid #fca5a5',
            borderRadius: '0.9rem',
            padding: '0.8rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            gap: '0.6rem',
            alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '1.4rem' }}>🏖️</span>
            <div>
              <p style={{ fontWeight: '700', fontSize: '0.88rem', color: '#b91c1c', margin: '0 0 0.2rem', fontFamily: 'var(--font-main)' }}>
                Este negocio está de vacaciones
              </p>
              <p style={{ fontSize: '0.82rem', color: '#991b1b', margin: 0, lineHeight: '1.4', fontFamily: 'var(--font-main)' }}>
                {parsedVacaciones?.mensaje || (parsedVacaciones?.inicio && parsedVacaciones?.fin ? `Cerrado por vacaciones del ${parsedVacaciones.inicio} al ${parsedVacaciones.fin}.` : 'Cerrado temporalmente por descanso.')}
              </p>
            </div>
          </div>
        )}

        {/* ── BANNER DE AVISO ESPECIAL ── */}
        {(() => {
          const activeNotice = getActiveNotice(comercio);
          if (!activeNotice) return null;
          return (
            <div style={{
              backgroundColor: '#fefce8',
              border: '1.5px solid #fde047',
              borderRadius: '0.9rem',
              padding: '0.8rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '1.3rem' }}>📢</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.15rem' }}>
                  <p style={{ fontWeight: '700', fontSize: '0.85rem', color: '#854d0e', margin: 0, fontFamily: 'var(--font-main)' }}>
                    Aviso del comercio
                  </p>
                  {activeNotice.fin && (
                    <span style={{ fontSize: '0.68rem', backgroundColor: '#fef08a', color: '#854d0e', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: '600' }}>
                      {activeNotice.inicio ? `${activeNotice.inicio} al ${activeNotice.fin}` : `Hasta el ${activeNotice.fin}`}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.82rem', color: '#713f12', margin: 0, lineHeight: '1.4', fontFamily: 'var(--font-main)' }}>
                  {activeNotice.texto}
                </p>
              </div>
            </div>
          );
        })()}

        {/* ── SECCIÓN HORARIOS ── */}
        {Object.keys(parsedHorario).length > 0 && (
          <div style={{
            backgroundColor: 'var(--color-card-alt)',
            borderRadius: '0.9rem',
            padding: '0.8rem 1rem',
            marginBottom: '1.2rem',
            border: '1px solid var(--color-border)'
          }}>
            <div
              onClick={() => setShowFullSchedule(!showFullSchedule)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🕒</span>
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-text)', margin: 0, fontFamily: 'var(--font-main)' }}>
                    Horario de hoy ({todayLabel}):
                  </p>
                  <p style={{ fontSize: '0.78rem', color: todaySchedule === 'Cerrado' ? '#ef4444' : 'var(--color-text-muted)', margin: '0.1rem 0 0', fontFamily: 'var(--font-main)', fontWeight: '600' }}>
                    {todaySchedule || 'Consultar en tienda'}
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: '700', fontFamily: 'var(--font-main)' }}>
                {showFullSchedule ? 'Ocultar ▲' : 'Ver semana ▼'}
              </span>
            </div>

            {showFullSchedule && (
              <div style={{ marginTop: '0.8rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {DIAS_KEYS.map(({ key, label }) => {
                  const isCurrentDay = key === todayKey;
                  const dayVal = parsedHorario[key] || 'Cerrado';
                  return (
                    <div key={key} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      padding: '0.25rem 0.4rem',
                      borderRadius: '0.4rem',
                      backgroundColor: isCurrentDay ? 'rgba(94,0,14,0.08)' : 'transparent',
                      fontWeight: isCurrentDay ? '700' : '400',
                      color: isCurrentDay ? 'var(--color-accent)' : 'var(--color-text)',
                      fontFamily: 'var(--font-main)'
                    }}>
                      <span>{label}</span>
                      <span style={{ color: dayVal === 'Cerrado' ? '#ef4444' : 'inherit' }}>{dayVal}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Discount info (only if no custom bonos) */}
        {(!comercio.bonos || comercio.bonos.length === 0) && (
          <p style={{
            fontFamily: 'var(--font-main)',
            fontSize: '0.85rem',
            color: 'var(--color-accent)',
            fontWeight: '500',
            marginBottom: '0.8rem'
          }}>
            {comercio.descuento} € de descuento con {comercio.latidosNecesarios} Latidos
          </p>
        )}

        {/* Active bonuses */}
        {comercio.bonos && comercio.bonos.length > 0 && (
          <div style={{ marginBottom: '1.2rem' }}>
            <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text)', marginBottom: '0.6rem' }}>
              Elige tu bono:
            </p>
            {comercio.bonos.map((bono, i) => (
              <div 
                key={i} 
                onClick={() => !activeCode && setSelectedBonoIndex(i)}
                style={{
                backgroundColor: selectedBonoIndex === i ? '#fff8e1' : 'transparent',
                border: selectedBonoIndex === i ? '1.5px solid #ffe082' : '1px solid var(--color-border)',
                borderRadius: '0.8rem',
                padding: '0.6rem 0.9rem',
                marginBottom: '0.5rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
                cursor: activeCode ? 'default' : 'pointer',
                opacity: activeCode && selectedBonoIndex !== i ? 0.4 : 1
              }}>
                <span>🎁</span>
                <div>
                  <p style={{ fontFamily: 'var(--font-main)', fontWeight: '600', fontSize: '0.85rem', color: selectedBonoIndex === i ? '#795548' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{bono.titulo}</span>
                    <span style={{ fontSize: '0.75rem', backgroundColor: selectedBonoIndex === i ? '#ffe082' : '#f0f0f0', padding: '0.1rem 0.4rem', borderRadius: '1rem', color: selectedBonoIndex === i ? '#795548' : '#888' }}>
                      {bono.coste !== undefined ? bono.coste : comercio.latidosNecesarios} L
                    </span>
                  </p>
                  <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.78rem', color: selectedBonoIndex === i ? '#a1887f' : 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    {bono.descripcion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={{
            color: 'var(--color-accent)',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-main)',
            textAlign: 'center',
            marginBottom: '0.6rem'
          }}>{error}</p>
        )}

        {/* Code box OR generate button */}
        {isThisCommerceActive ? (
          <div style={{
            backgroundColor: 'var(--color-card-alt)',
            borderRadius: '1rem',
            padding: '1.1rem',
            textAlign: 'center',
            border: '1px dashed var(--color-accent)'
          }}>
            <p style={{
              fontFamily: 'var(--font-main)',
              fontSize: '0.72rem',
              color: 'var(--color-text-muted)',
              marginBottom: '0.3rem',
              letterSpacing: '0.04em'
            }}>
              {tr?.mostrarAlComercio || 'Tu código activo:'}
            </p>
            <p style={{
              fontFamily: 'monospace',
              fontSize: '2.4rem',
              fontWeight: '800',
              color: 'var(--color-accent)',
              letterSpacing: '0.12em',
              lineHeight: '1',
              margin: '0.2rem 0'
            }}>
              {activeCode.code}
            </p>
            <p style={{
              fontFamily: 'var(--font-main)',
              fontSize: '0.75rem',
              color: 'var(--color-text)',
              marginTop: '0.5rem',
              marginBottom: '0.8rem'
            }}>
              {tr?.codigoValidoDurante || 'Válido durante'}: <strong>{mins}:{secs}</strong>
            </p>
            <button
              onClick={onCancelarCodigo}
              style={{
                backgroundColor: 'transparent',
                color: '#e74c3c',
                border: '1px solid #e74c3c',
                padding: '0.5rem 1rem',
                borderRadius: '1.5rem',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🗑️ {tr?.cancelarCodigo || 'Cancelar código y recuperar puntos'}
            </button>
          </div>
        ) : (
          isAuthenticated ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {onTrazarRuta && (
                <button
                  onClick={onTrazarRuta}
                  style={{
                    backgroundColor: 'white',
                    color: 'var(--color-accent)',
                    border: '1.5px solid var(--color-accent)',
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '2rem',
                    fontFamily: 'var(--font-main)',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    letterSpacing: '0.01em'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fff0f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                >
                  📍 {tr?.comoLlegar || 'Trazar ruta caminando'}
                </button>
              )}
              <button
                onClick={handleGenerar}
                disabled={hasOtherActiveCode || (!puedeCanjear && user?.role !== 'admin')}
                style={{
                  backgroundColor: hasOtherActiveCode 
                    ? 'var(--color-input-bg)' 
                    : (user?.role === 'admin' || puedeCanjear) 
                      ? 'var(--color-accent)' 
                      : 'var(--color-input-bg)',
                  color: hasOtherActiveCode 
                    ? 'var(--color-text-muted)' 
                    : (user?.role === 'admin' || puedeCanjear) 
                      ? 'white' 
                      : 'var(--color-text-muted)',
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '2rem',
                  fontFamily: 'var(--font-main)',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: (hasOtherActiveCode || (!puedeCanjear && user?.role !== 'admin')) ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
                  letterSpacing: '0.01em',
                  border: 'none',
                  opacity: hasOtherActiveCode ? 0.6 : 1
                }}
              >
                {hasOtherActiveCode
                  ? `🔒 ${tr?.codigoActivo || 'Código activo en curso'}`
                  : (user?.role === 'admin' || puedeCanjear)
                    ? `${tr?.generarCodigo || 'Generar código'} ${user?.role !== 'admin' ? `· -${latidosRequeridos} ❤` : ''}`
                    : `${tr?.latidosInsuficientes || 'Faltan Latidos'}`}
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                width: '100%',
                padding: '0.85rem',
                borderRadius: '2rem',
                fontFamily: 'var(--font-main)',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                letterSpacing: '0.01em',
                border: 'none'
              }}
            >
              Inicia sesión para canjear
            </button>
          )
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateX(-50%) translateY(100%) } to { transform: translateX(-50%) translateY(0) } }
      `}</style>
    </>
  );
};


// ── Main Page ──────────────────────────────────────────────────────────────────
const Tiendas = () => {
  const {
    latidos,
    isAuthenticated,
    user,
    fetchComercios,
    activeCode,
    generarCodigoCanje,
    cancelarCodigoCanje,
    tr
  } = useLatidos();
  const [comercios, setComercios] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [mapCenter, setMapCenter] = useState([28.0034, -15.4144]);
  const [mapZoom, setMapZoom] = useState(15);

  useEffect(() => {
    fetchComercios().then(data => {
      setComercios(data);
    });
  }, []);

  // Navigation and Geolocation State
  const [userLocation, setUserLocation] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null); // Array of [lat, lon]
  const [routeStats, setRouteStats] = useState(null);   // { distKm, durationMin, estSteps }
  const [navigatingShop, setNavigatingShop] = useState(null);
  const lastFetchRef = useRef(null);
  
  // Step Counter for the active route
  const { steps: routeSteps, startTracking, stopTracking } = useStepCounter(0);

  // Track User Location
  useEffect(() => {
    if (!navigator.geolocation) return;
    
    // Get initial position quickly
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      err => console.error(err),
      { enableHighAccuracy: true }
    );

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      err => console.error(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const fetchRouteData = async (startLoc, endLoc) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${startLoc[1]},${startLoc[0]};${endLoc.lon},${endLoc.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const latLngs = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        const distKm = (route.distance / 1000).toFixed(2);
        const durationMin = Math.ceil(route.duration / 60);
        const estSteps = Math.ceil(route.distance / 0.76);
        return { latLngs, distKm, durationMin, estSteps };
      }
    } catch (err) {
      console.error("Error fetching route:", err);
    }
    return null;
  };

  // Dynamic route recalculation as user walks
  useEffect(() => {
    if (!userLocation || !navigatingShop || !lastFetchRef.current) return;
    
    const dLat = Math.abs(userLocation[0] - lastFetchRef.current[0]);
    const dLon = Math.abs(userLocation[1] - lastFetchRef.current[1]);
    const distDeg = Math.sqrt(dLat*dLat + dLon*dLon);
    
    // Re-fetch route if user has moved ~15 meters (0.00015 degrees)
    if (distDeg > 0.00015) {
      lastFetchRef.current = userLocation;
      fetchRouteData(userLocation, navigatingShop).then(routeData => {
        if (routeData) {
          setActiveRoute(routeData.latLngs);
          setRouteStats({ distKm: routeData.distKm, durationMin: routeData.durationMin, estSteps: routeData.estSteps });
        }
      });
    }
  }, [userLocation, navigatingShop]);

  // Fetch Route from OSRM
  const handleTrazarRuta = async (comercio) => {
    if (!userLocation) {
      alert("Esperando señal del GPS...");
      return;
    }
    
    setNavigatingShop(comercio);
    lastFetchRef.current = userLocation;
    
    const routeData = await fetchRouteData(userLocation, comercio);
    if (routeData) {
      setActiveRoute(routeData.latLngs);
      setRouteStats({ distKm: routeData.distKm, durationMin: routeData.durationMin, estSteps: routeData.estSteps });
      setMapCenter(userLocation);
      setMapZoom(17);
      startTracking();
    } else {
      alert("No se pudo calcular la ruta. Comprueba tu conexión a internet.");
      setNavigatingShop(null);
    }
  };

  const handleCancelarRuta = () => {
    setActiveRoute(null);
    setRouteStats(null);
    setNavigatingShop(null);
    stopTracking();
  };

  const handleSelectComercio = (comercio) => {
    setSelectedShop(comercio);
    setMapCenter([comercio.lat, comercio.lon]);
    setMapZoom(17);
    // Scroll al mapa
    document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ paddingBottom: '6rem' }}>
      {/* Title */}
      <div style={{ padding: '1.2rem 1.2rem 0.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-main)',
          fontSize: '0.72rem',
          fontWeight: '700',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-accent)'
        }}>
          Comercios adheridos cerca de ti
        </p>
      </div>

      {/* Map */}
      <div id="map-section" style={{
        margin: '0 1rem 0.75rem',
        borderRadius: '1.5rem',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(3,38,23,0.1)',
        position: 'relative',
        height: '350px' // Increased height for better navigation view
      }}>
        {/* Navigation Panel Overlay */}
        {activeRoute && routeStats && (
          <div style={{
            position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 900,
            backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '0.8rem', borderRadius: '1rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)', backdropFilter: 'blur(5px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--color-accent)', fontSize: '1.1rem' }}>En Ruta</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Distancia: {routeStats.distKm} km (~{routeStats.durationMin} min)</p>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${navigatingShop.lat},${navigatingShop.lon}`} target="_blank" rel="noreferrer" style={{
                  background: '#1a73e8', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center'
                }}>Maps</a>
                <button onClick={handleCancelarRuta} style={{
                  background: '#ff4757', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 'bold'
                }}>Cancelar</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', borderTop: '1px solid #eee', paddingTop: '0.6rem' }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#888' }}>Pasos Estimados</p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-text)' }}>{routeStats.estSteps}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#888' }}>Realizados</p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#4ade80' }}>{routeSteps}</p>
              </div>
            </div>
          </div>
        )}
        {/* Open in Maps button - REMOVED */}
        
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapFlyTo position={mapCenter} zoom={mapZoom} />
          
          {/* Active Route Polyline */}
          {activeRoute && (
            <Polyline positions={activeRoute} color="#4ade80" weight={6} opacity={0.9} />
          )}

          {/* User Location Marker */}
          {userLocation && (
            <Marker position={userLocation} icon={L.divIcon({
              className: '',
              html: `<div style="width: 16px; height: 16px; background: #3498db; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(52,152,219,0.8); animation: pulse 1.5s infinite;"></div>`,
              iconSize: [16, 16], iconAnchor: [8, 8]
            })} />
          )}

          {comercios.map(c => (
            <Marker
              key={c.id}
              position={[c.lat, c.lon]}
              icon={createMarker(c.color, selectedShop?.id === c.id)}
              eventHandlers={{ click: () => handleSelectComercio(c) }}
            >
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <strong style={{ fontFamily: 'var(--font-main)' }}>{c.nombre}</strong><br />
                  <span style={{ fontSize: '0.8em', color: '#888' }}>{c.categoria}</span>
                  {!activeRoute && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleTrazarRuta(c); }}
                        style={{
                          display: 'block', width: '100%', marginTop: '8px', padding: '6px',
                          backgroundColor: 'var(--color-accent)', color: 'white', border: 'none',
                          borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'
                        }}
                      >
                        📍 Trazar ruta
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`}
                        target="_blank" rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'block', width: '100%', marginTop: '6px', padding: '6px',
                          backgroundColor: '#f1f3f4', color: '#1a73e8', border: '1px solid #dadce0',
                          borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none'
                        }}
                      >
                        🗺️ Google Maps
                      </a>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Hint */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 900,
          backgroundColor: 'rgba(255,255,255,0.92)',
          padding: '0.3rem 0.8rem',
          borderRadius: '1rem',
          fontSize: '0.72rem',
          fontFamily: 'var(--font-main)',
          color: 'var(--color-accent)',
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 6px rgba(0,0,0,0.1)'
        }}>
          Toca un comercio para verlo en el mapa
        </div>
      </div>

      {/* Saldo */}
      <div style={{
        margin: '0 1rem 0.75rem',
        backgroundColor: 'var(--color-header-bg)',
        borderRadius: '1rem',
        padding: '0.7rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontFamily: 'var(--font-main)', fontSize: '0.82rem', color: 'var(--color-header-text)', opacity: 0.75 }}>
          Mis Latidos disponibles
        </span>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          fontWeight: '600',
          color: 'var(--color-header-text)',
        }}>
          ❤ {latidos.toLocaleString('es-ES')}
        </span>
      </div>

      {/* Business list */}
      <div style={{ margin: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {comercios.map(c => (
          <button
            key={c.id}
            onClick={() => handleSelectComercio(c)}
            style={{
              backgroundColor: selectedShop?.id === c.id ? '#fff8f8' : 'var(--color-white)',
              borderRadius: '1.3rem',
              padding: '1rem 1.2rem',
              boxShadow: selectedShop?.id === c.id
                ? '0 2px 16px rgba(94,0,14,0.15)'
                : '0 2px 10px rgba(3,38,23,0.07)',
              border: selectedShop?.id === c.id
                ? '1.5px solid #f2d6da'
                : '1.5px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.15rem',
                fontWeight: '600',
                color: 'var(--color-secondary)',
              }}>
                {c.emoji} {c.nombre}
              </span>
              <span style={{
                fontFamily: 'var(--font-main)',
                fontSize: '0.72rem',
                color: 'var(--color-detail)',
                fontWeight: '400',
                flexShrink: 0,
                marginLeft: '0.5rem',
                marginTop: '0.1rem'
              }}>
                {c.categoria}
              </span>
            </div>

            {/* Discount */}
            <p style={{
              fontFamily: 'var(--font-main)',
              fontSize: '0.85rem',
              color: 'var(--color-accent)',
              fontWeight: '500',
              marginBottom: '0.3rem'
            }}>
              {c.descuento} € de descuento con {c.latidosNecesarios} Latidos
            </p>

            {/* Address */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.7rem' }}>📍</span>
              <span style={{
                fontFamily: 'var(--font-main)',
                fontSize: '0.78rem',
                color: 'var(--color-detail)'
              }}>
                {c.direccion}
              </span>
            </div>

            {/* Badges row */}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              {isShopOnVacation(c) && (
                <span style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '1rem'
                }}>
                  🏖️ De vacaciones
                </span>
              )}

              {getActiveNotice(c) && (
                <span style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde047',
                  color: '#92400e',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '1rem'
                }}>
                  📢 Aviso
                </span>
              )}

              {c.bonos && c.bonos.length > 0 && (
                <span style={{
                  backgroundColor: '#fff8e1',
                  border: '1px solid #ffe082',
                  color: '#795548',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '1rem'
                }}>
                  🎁 {c.bonos.length} bono{c.bonos.length > 1 ? 's' : ''} disponible{c.bonos.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
      {selectedShop && (
        <ComercioModal
          comercio={selectedShop}
          latidos={latidos}
          activeCode={activeCode}
          onGenerarCodigo={generarCodigoCanje}
          onCancelarCodigo={cancelarCodigoCanje}
          isAuthenticated={isAuthenticated}
          user={user}
          onClose={() => setSelectedShop(null)}
          tr={tr}
          onTrazarRuta={activeRoute ? null : () => {
            handleTrazarRuta(selectedShop);
            setSelectedShop(null); // Close modal to show the map
          }}
        />
      )}
    </div>
  );
};

export default Tiendas;