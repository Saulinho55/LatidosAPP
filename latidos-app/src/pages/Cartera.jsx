import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLatidos } from '../context/LatidosContext';

const ComercioCanjeCard = ({ comercio, latidos, activeCode, onGenerarCodigo, onCancelarCodigo, tr }) => {
  const [error, setError] = useState('');
  const [selectedBonoIndex, setSelectedBonoIndex] = useState(comercio?.bonos?.length > 0 ? 0 : -1);

  const bonoActual = selectedBonoIndex >= 0 
    ? comercio.bonos[selectedBonoIndex] 
    : { coste: comercio.latidosNecesarios, descuento: comercio.descuento, titulo: 'Bono por defecto' };
  
  const latidosRequeridos = bonoActual.coste !== undefined ? parseInt(bonoActual.coste, 10) : comercio.latidosNecesarios;
  const puedeCanjear = latidos >= latidosRequeridos;

  const isThisCommerceActive = activeCode && activeCode.comercioNombre === comercio.nombre;
  const hasOtherActiveCode = activeCode && !isThisCommerceActive;

  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!isThisCommerceActive) return;
    const calc = () => Math.max(0, Math.floor((activeCode.expiresAt - Date.now()) / 1000));
    setSecondsLeft(calc());
    const interval = setInterval(() => setSecondsLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [isThisCommerceActive, activeCode]);

  const handleGenerate = async () => {
    if (hasOtherActiveCode) {
      setError(tr?.yaTienesCodigoActivo || 'Ya tienes un código activo en curso.');
      return;
    }
    if (!puedeCanjear) {
      setError(`${tr?.latidosInsuficientes || 'Necesitas más latidos'} (${latidosRequeridos - latidos})`);
      return;
    }
    setError('');
    const res = await onGenerarCodigo({ comercio, bono: bonoActual });
    if (!res.success) {
      setError(res.error || 'No se pudo generar el código');
    }
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      borderRadius: '1.3rem',
      padding: '1.1rem 1.2rem',
      boxShadow: 'var(--shadow-card)',
      border: isThisCommerceActive ? '2px solid var(--color-accent)' : '1px solid var(--color-border)'
    }}>
      {/* Business name + discount */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.2rem',
          fontWeight: '600',
          color: 'var(--color-text)',
          margin: 0
        }}>
          {comercio.emoji || '🏪'} {comercio.nombre}
        </p>
      </div>

      {/* Discount info (only if no custom bonos) */}
      {(!comercio.bonos || comercio.bonos.length === 0) && (
        <p style={{
          fontFamily: 'var(--font-main)',
          fontSize: '0.82rem',
          color: 'var(--color-accent)',
          marginBottom: '0.8rem'
        }}>
          {comercio.descuento} € {tr?.descuento || 'de descuento'} ({comercio.latidosNecesarios} {tr?.navLatidos || 'Latidos'})
        </p>
      )}

      {/* Active bonuses */}
      {comercio.bonos && comercio.bonos.length > 0 && (
        <div style={{ marginBottom: '1rem', marginTop: '0.6rem' }}>
          {comercio.bonos.map((bono, i) => (
            <div 
              key={i} 
              onClick={() => !isThisCommerceActive && setSelectedBonoIndex(i)}
              style={{
                backgroundColor: selectedBonoIndex === i ? 'var(--color-card-alt)' : 'transparent',
                border: selectedBonoIndex === i ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                borderRadius: '0.8rem',
                padding: '0.6rem 0.8rem',
                marginBottom: '0.4rem',
                cursor: !isThisCommerceActive ? 'pointer' : 'default',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.85rem', color: 'var(--color-text)' }}>{bono.titulo}</p>
                {bono.descripcion && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{bono.descripcion}</p>}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                -{bono.coste} ❤
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p style={{ color: '#e74c3c', fontSize: '0.78rem', marginBottom: '0.6rem', fontFamily: 'var(--font-main)', textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* Timer / Code if active for this store */}
      {isThisCommerceActive ? (
        <div style={{
          backgroundColor: 'var(--color-card-alt)',
          borderRadius: '1rem',
          padding: '1rem',
          textAlign: 'center',
          border: '1px dashed var(--color-accent)'
        }}>
          <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
            {tr?.mostrarAlComercio || 'Muestra este código en la tienda:'}
          </p>
          <p style={{
            fontFamily: 'monospace',
            fontSize: '2rem',
            fontWeight: '800',
            letterSpacing: '0.15em',
            color: 'var(--color-accent)',
            margin: '0.2rem 0'
          }}>
            {activeCode.code}
          </p>
          <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.8rem', color: 'var(--color-text)', margin: '0.3rem 0 0.8rem' }}>
            {tr?.codigoValidoDurante || 'Código válido durante'}: <strong style={{ color: 'var(--color-accent)', fontSize: '0.95rem' }}>{mins}:{secs}</strong>
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
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            🗑️ {tr?.cancelarCodigo || 'Cancelar código y recuperar puntos'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={!puedeCanjear || hasOtherActiveCode}
          style={{
            backgroundColor: hasOtherActiveCode 
              ? 'var(--color-input-bg)' 
              : puedeCanjear 
                ? 'var(--color-accent)' 
                : 'var(--color-input-bg)',
            color: hasOtherActiveCode 
              ? 'var(--color-text-muted)' 
              : puedeCanjear 
                ? 'white' 
                : 'var(--color-text-muted)',
            width: '100%',
            padding: '0.85rem',
            borderRadius: '2rem',
            fontFamily: 'var(--font-main)',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: (!puedeCanjear || hasOtherActiveCode) ? 'not-allowed' : 'pointer',
            border: 'none',
            letterSpacing: '0.01em',
            transition: 'opacity 0.2s',
            opacity: hasOtherActiveCode ? 0.6 : 1
          }}
        >
          {hasOtherActiveCode 
            ? `🔒 ${tr?.codigoActivo || 'Código activo en curso'}` 
            : puedeCanjear 
              ? `${tr?.generarCodigo || 'Generar código'} · -${latidosRequeridos} ❤` 
              : `${tr?.latidosInsuficientes || 'Faltan Latidos'}`}
        </button>
      )}
    </div>
  );
};

const Cartera = () => {
  const {
    latidos,
    isAuthenticated,
    fetchComercios,
    activeCode,
    activeCodeNotification,
    setActiveCodeNotification,
    generarCodigoCanje,
    cancelarCodigoCanje,
    tr
  } = useLatidos();
  
  const [comercios, setComercios] = useState([]);
  const [bannerSecondsLeft, setBannerSecondsLeft] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      fetchComercios().then(setComercios);
    }
  }, [isAuthenticated, fetchComercios]);

  useEffect(() => {
    if (!activeCode) return;
    const calc = () => Math.max(0, Math.floor((activeCode.expiresAt - Date.now()) / 1000));
    setBannerSecondsLeft(calc());
    const interval = setInterval(() => setBannerSecondsLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [activeCode]);

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem', color: 'var(--color-text)' }}>{tr?.cuenta || 'Debes iniciar sesión'}</h2>
        <p style={{ fontFamily: 'var(--font-main)', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Inicia sesión para gestionar tu cartera de bonos.</p>
        <button onClick={() => navigate('/login')} style={{ backgroundColor: 'var(--color-accent)', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '2rem', fontFamily: 'var(--font-main)', fontWeight: '600', border: 'none', cursor: 'pointer' }}>Ir a Iniciar Sesión</button>
      </div>
    );
  }

  const bMins = String(Math.floor(bannerSecondsLeft / 60)).padStart(2, '0');
  const bSecs = String(bannerSecondsLeft % 60).padStart(2, '0');

  return (
    <div style={{ paddingBottom: '6rem', paddingTop: '0.8rem' }}>
      {/* Expiration Notification Banner */}
      {activeCodeNotification && (
        <div style={{
          margin: '0 1rem 0.8rem',
          padding: '0.8rem 1rem',
          borderRadius: '1rem',
          backgroundColor: '#ffebee',
          border: '1px solid #ffcdd2',
          color: '#c62828',
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: '500'
        }}>
          <span>ℹ️ {activeCodeNotification}</span>
          <button 
            onClick={() => setActiveCodeNotification(null)}
            style={{ background: 'none', border: 'none', color: '#c62828', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginLeft: '0.5rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Global Active Code Banner */}
      {activeCode && (
        <div style={{
          margin: '0 1rem 1rem',
          backgroundColor: 'var(--color-card)',
          borderRadius: '1.4rem',
          padding: '1.2rem',
          border: '2px solid var(--color-accent)',
          boxShadow: '0 4px 16px rgba(212, 96, 122, 0.25)',
          textAlign: 'center'
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(212, 96, 122, 0.1)', padding: '0.3rem 0.8rem', borderRadius: '1rem', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.85rem' }}>⏱</span>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-accent)', textTransform: 'uppercase' }}>
              {tr?.codigoActivo || 'Código Activo'} ({bMins}:{bSecs})
            </span>
          </div>

          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text)', margin: '0 0 0.2rem' }}>
            {activeCode.comercioEmoji} {activeCode.comercioNombre}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 0.6rem' }}>
            {activeCode.descuento} • -{activeCode.latidosUsados} ❤
          </p>

          <div style={{
            backgroundColor: 'var(--color-card-alt)',
            borderRadius: '1rem',
            padding: '0.6rem',
            fontFamily: 'monospace',
            fontSize: '2.2rem',
            fontWeight: '800',
            color: 'var(--color-accent)',
            letterSpacing: '0.15em',
            margin: '0.4rem 0 0.8rem'
          }}>
            {activeCode.code}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.8rem' }}>
            {tr?.mostrarAlComercio || 'Muestra este código en la tienda antes de que expire.'}
          </p>

          <button
            onClick={cancelarCodigoCanje}
            style={{
              backgroundColor: 'transparent',
              color: '#e74c3c',
              border: '1px solid #e74c3c',
              padding: '0.6rem 1.2rem',
              borderRadius: '2rem',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            🗑️ {tr?.cancelarCodigo || 'Cancelar código y recuperar puntos'}
          </button>
        </div>
      )}

      {/* Section header */}
      <div style={{ padding: '0.4rem 1.2rem 0.6rem' }}>
        <p style={{
          fontFamily: 'var(--font-main)',
          fontSize: '0.7rem',
          fontWeight: '700',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--color-detail)',
          marginBottom: '0.3rem'
        }}>
          {tr?.canjear || 'Canjear Latidos'}
        </p>
        <p style={{
          fontFamily: 'var(--font-main)',
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)'
        }}>
          Elige un bono, genera el código y muéstralo en el mostrador.
        </p>
      </div>

      {/* Balance pill */}
      <div style={{
        margin: '0 1rem 1rem',
        backgroundColor: 'var(--color-header-bg)',
        borderRadius: '1rem',
        padding: '0.65rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{
          fontFamily: 'var(--font-main)',
          fontSize: '0.82rem',
          color: 'var(--color-header-text)', opacity: 0.7
        }}>
          {tr?.miCartera || 'Saldo disponible'}
        </span>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          fontWeight: '600',
          color: 'var(--color-header-text)',
          letterSpacing: '-0.01em'
        }}>
          ❤ {latidos.toLocaleString('es-ES')}
        </span>
      </div>

      {/* Commerce list */}
      <div style={{
        margin: '0 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.7rem'
      }}>
        {comercios.map(c => (
          <ComercioCanjeCard
            key={c.id}
            comercio={c}
            latidos={latidos}
            activeCode={activeCode}
            onGenerarCodigo={generarCodigoCanje}
            onCancelarCodigo={cancelarCodigoCanje}
            tr={tr}
          />
        ))}
      </div>
    </div>
  );
};

export default Cartera;