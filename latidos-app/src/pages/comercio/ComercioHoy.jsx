import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLatidos } from '../../context/LatidosContext';
import { supabase } from '../../lib/supabase';

const PendingCountdown = ({ fecha }) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!fecha) return '10:00';
    const elapsed = Date.now() - new Date(fecha).getTime();
    const remaining = Math.max(0, Math.floor((10 * 60 * 1000 - elapsed) / 1000));
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!fecha) return;
    const update = () => {
      const elapsed = Date.now() - new Date(fecha).getTime();
      const remaining = Math.max(0, Math.floor((10 * 60 * 1000 - elapsed) / 1000));
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [fecha]);

  return <span style={{ opacity: 0.9, fontWeight: '700' }}>({timeLeft})</span>;
};

const ComercioHoy = () => {
  const navigate = useNavigate();
  const { fetchComercioStats, user, rechazarBono } = useLatidos();
  
  const [stats, setStats] = useState({
    clientesHoy: 0,
    gastoHoy: 0,
    bonosHoy: 0,
    clientesNuevos: 0,
    recentTxs: [],
    comercioNombre: ''
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);

  const loadStats = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await fetchComercioStats();
      if (data && data.transactions) {
        const todayStr = new Date().toLocaleDateString('es-ES');
        
        // Filter transactions for today based on local date
        const todayTxs = data.transactions.filter(t => {
          if (!t.fecha) return false;
          const d = new Date(t.fecha);
          return d.toLocaleDateString('es-ES') === todayStr;
        });
        
        // Strictly count validated completed transactions
        const validatedTxsToday = todayTxs.filter(t => t.importe_compra && parseFloat(t.importe_compra) > 0 && t.latidos_usados > 0);
        const gastoHoy = validatedTxsToday.reduce((sum, t) => sum + (parseFloat(t.importe_compra) || 0), 0);
        const bonosValidados = validatedTxsToday.length;
        
        // Calculate new clients based ONLY on completed validated transactions
        const userTxsMap = {};
        data.transactions.forEach(t => {
          if (t.user_id && t.importe_compra && parseFloat(t.importe_compra) > 0 && t.latidos_usados > 0) {
            if (!userTxsMap[t.user_id]) userTxsMap[t.user_id] = [];
            userTxsMap[t.user_id].push(new Date(t.fecha).toLocaleDateString('es-ES'));
          }
        });
        
        let clientesNuevos = 0;
        Object.values(userTxsMap).forEach(dates => {
          if (dates[dates.length - 1] === todayStr && dates.length === 1) {
            clientesNuevos++;
          }
        });

        setStats({
          clientesHoy: bonosValidados,
          gastoHoy: gastoHoy.toFixed(2).replace('.', ','),
          bonosHoy: bonosValidados,
          clientesNuevos: clientesNuevos,
          recentTxs: [...data.transactions].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
          comercioNombre: data.comercio?.nombre || user?.name || 'Mi Comercio'
        });
      }
    } catch (e) {
      console.error('Error loading comercio stats:', e);
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, [fetchComercioStats, user]);

  useEffect(() => {
    loadStats();
    
    // 1. Instant Supabase Realtime channel
    const channel = supabase
      .channel(`comercio-hoy-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          loadStats(false);
        }
      )
      .subscribe();

    // 2. High-frequency 2-second fallback poll
    const timer = setInterval(() => loadStats(false), 2000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [loadStats]);

  const handleRechazar = async (tx) => {
    if (window.confirm(`¿Rechazar el código ${tx.code}? Se devolverán los ${tx.latidos_usados || 0} Latidos al cliente y se cancelará el bono.`)) {
      setRejectingId(tx.id);
      try {
        const res = await rechazarBono(tx.id || tx.code);
        if (res.success) {
          await loadStats(true);
        } else {
          alert(res.error || 'Error al rechazar el bono');
        }
      } catch (err) {
        alert(err.message || 'Error al conectar');
      } finally {
        setRejectingId(null);
      }
    }
  };

  const now = Date.now();
  const TEN_MINUTES_MS = 10 * 60 * 1000;

  // Filter out expired and cancelled bonos by default
  const displayedTxs = stats.recentTxs.filter(tx => {
    if (showAllHistory) return true;
    const isValidated = tx.importe_compra && parseFloat(tx.importe_compra) > 0 && tx.latidos_usados > 0;
    const isCancelled = tx.latidos_usados === 0 || tx.importe_compra === 0 || tx.importe_compra === -1 || (typeof tx.descuento === 'string' && tx.descuento.includes('Cancelado'));
    const isExpired = !isValidated && !isCancelled && tx.fecha && (now - new Date(tx.fecha).getTime() > TEN_MINUTES_MS);

    // If pending, only show if NOT expired and NOT cancelled
    if (!isValidated) {
      return !isExpired && !isCancelled;
    }
    // If validated, show it
    return true;
  }).slice(0, 25);

  const StatBox = ({ title, value, icon }) => (
    <div style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '1.2rem',
      padding: '1.1rem 1.2rem',
      flex: '1 1 calc(50% - 0.5rem)',
      minWidth: '140px',
      boxShadow: 'var(--shadow-card)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, fontWeight: '600' }}>
          {title}
        </p>
        {icon && <span style={{ fontSize: '1.1rem' }}>{icon}</span>}
      </div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: '700', color: 'var(--color-text)', margin: 0, lineHeight: 1.1 }}>
        {value}
      </p>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-text)', margin: 0, fontWeight: '700' }}>
            Resumen de hoy
          </h2>
          {stats.comercioNombre && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0', fontWeight: '600' }}>
              🏪 {stats.comercioNombre}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={() => loadStats(true)}
            style={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              padding: '0.5rem 0.9rem',
              borderRadius: '1.5rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            {isRefreshing ? '⌛ Actualizando...' : '🔄 Actualizar'}
          </button>
          
          <button
            onClick={() => navigate('/comercio/validar')}
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1.1rem',
              borderRadius: '1.5rem',
              fontFamily: 'var(--font-main)',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            🎟️ Validar bono
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.8rem' }}>
        <StatBox title="Clientes vía LATIDOS" value={stats.clientesHoy} icon="👥" />
        <StatBox title="Gasto generado" value={`${stats.gastoHoy} €`} icon="💶" />
        <StatBox title="Bonos validados" value={stats.bonosHoy} icon="🎁" />
        <StatBox title="Clientes nuevos" value={stats.clientesNuevos} icon="⭐" />
      </div>

      {/* Historial de canjes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--color-text)', margin: 0, fontWeight: '700' }}>
          Canjes y Bonos
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={() => setShowAllHistory(!showAllHistory)}
            style={{
              background: 'transparent',
              border: '1px dashed var(--color-border)',
              color: 'var(--color-text-muted)',
              padding: '0.3rem 0.7rem',
              borderRadius: '1rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {showAllHistory ? '👁️ Ocultar caducados' : '📜 Ver historial completo'}
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
            ({displayedTxs.length})
          </span>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1.2rem', overflow: 'hidden', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)' }}>
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', margin: 0 }}>Cargando canjes...</p>
        ) : displayedTxs.length === 0 ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🎟️</span>
            <p style={{ margin: 0, fontFamily: 'var(--font-main)', color: 'var(--color-text)', fontWeight: '600', fontSize: '0.95rem' }}>
              No hay canjes activos o pendientes en este momento.
            </p>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              Los códigos activos generados por los vecinos aparecerán aquí al instante. Los caducados se ocultan automáticamente.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-main)', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-card-alt)', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>Fecha</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>Código</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>Bono</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase' }}>Estado</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {displayedTxs.map(tx => {
                  const isValidated = tx.importe_compra && parseFloat(tx.importe_compra) > 0 && tx.latidos_usados > 0;
                  const isCancelled = tx.latidos_usados === 0 || tx.importe_compra === 0 || tx.importe_compra === -1 || (typeof tx.descuento === 'string' && tx.descuento.includes('Cancelado'));
                  const isExpired = !isValidated && !isCancelled && tx.fecha && (now - new Date(tx.fecha).getTime() > TEN_MINUTES_MS);
                  const isPending = !isValidated && !isCancelled && !isExpired;

                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isPending ? 'rgba(245, 158, 11, 0.04)' : 'var(--color-card)' }}>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                        {new Date(tx.fecha).toLocaleDateString('es-ES')} <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>{new Date(tx.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--color-accent)', fontWeight: '800', letterSpacing: '0.04em' }}>
                        {tx.code}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--color-text)', fontWeight: '600' }}>
                        {typeof tx.descuento === 'number' ? `${tx.descuento} € dto.` : tx.descuento} <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({tx.latidos_usados || 0} ❤)</span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {isValidated ? (
                          <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669', padding: '0.3rem 0.65rem', borderRadius: '1rem', fontWeight: '700', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            ✓ Validado ({parseFloat(tx.importe_compra).toFixed(2)} €)
                          </span>
                        ) : isCancelled ? (
                          <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', padding: '0.3rem 0.65rem', borderRadius: '1rem', fontWeight: '700', fontSize: '0.78rem' }}>
                            ✕ Cancelado
                          </span>
                        ) : isExpired ? (
                          <span style={{ backgroundColor: 'rgba(156, 163, 175, 0.15)', color: '#6b7280', padding: '0.3rem 0.65rem', borderRadius: '1rem', fontWeight: '600', fontSize: '0.78rem' }}>
                            ⏰ Caducado
                          </span>
                        ) : (
                          <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.18)', color: '#d97706', padding: '0.3rem 0.65rem', borderRadius: '1rem', fontWeight: '800', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            ⏳ Esperando validar
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        {isPending && (
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              onClick={() => navigate(`/comercio/validar?code=${tx.code}`)}
                              style={{
                                backgroundColor: 'var(--color-accent)',
                                color: '#fff',
                                border: 'none',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '0.8rem',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              ✓ Validar
                            </button>
                            <button
                              disabled={rejectingId === tx.id}
                              onClick={() => handleRechazar(tx)}
                              title="Rechazar y devolver Latidos al cliente"
                              style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#dc2626',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '0.8rem',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                cursor: rejectingId === tx.id ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              {rejectingId === tx.id ? '...' : '✕ Rechazar'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComercioHoy;
