import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLatidos } from '../../context/LatidosContext';

const ComercioHoy = () => {
  const navigate = useNavigate();
  const { fetchComercioStats, user } = useLatidos();
  
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
        
        const gastoHoy = todayTxs.reduce((sum, t) => sum + (parseFloat(t.importe_compra) || 0), 0);
        const bonosValidados = todayTxs.filter(t => t.importe_compra && parseFloat(t.importe_compra) > 0).length;
        
        // Calculate new clients
        const userTxsMap = {};
        data.transactions.forEach(t => {
          if (t.user_id) {
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
          clientesHoy: todayTxs.length,
          gastoHoy: gastoHoy.toFixed(2).replace('.', ','),
          bonosHoy: bonosValidados || todayTxs.length,
          clientesNuevos: clientesNuevos,
          recentTxs: [...data.transactions].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 15),
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
    // Auto refresh every 4 seconds to catch new incoming codes in real time
    const timer = setInterval(() => loadStats(false), 4000);
    return () => clearInterval(timer);
  }, [loadStats]);

  const StatBox = ({ title, value, icon }) => (
    <div style={{
      backgroundColor: '#F5D3D6',
      borderRadius: '1rem',
      padding: '1.2rem',
      flex: '1 1 calc(50% - 0.5rem)',
      minWidth: '140px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.78rem', color: '#6b4f53', margin: 0, fontWeight: '600' }}>
          {title}
        </p>
        {icon && <span style={{ fontSize: '1.1rem' }}>{icon}</span>}
      </div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: '700', color: 'var(--color-header-bg)', margin: 0, lineHeight: 1 }}>
        {value}
      </p>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-header-bg)', margin: 0, fontWeight: '700' }}>
            Resumen de hoy
          </h2>
          {stats.comercioNombre && (
            <p style={{ fontSize: '0.85rem', color: '#6b4f53', margin: '0.2rem 0 0', fontWeight: '600' }}>
              🏪 {stats.comercioNombre}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={() => loadStats(true)}
            style={{
              backgroundColor: '#fff',
              border: '1px solid #E8C8CB',
              color: 'var(--color-header-bg)',
              padding: '0.5rem 0.9rem',
              borderRadius: '1.5rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            {isRefreshing ? '⌛ Actualizando...' : '🔄 Actualizar'}
          </button>
          
          <button
            onClick={() => navigate('/comercio/validar')}
            style={{
              backgroundColor: 'var(--color-header-bg)',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1.2rem',
              borderRadius: '1.5rem',
              fontFamily: 'var(--font-main)',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(78,3,15,0.2)'
            }}
          >
            🎟️ Validar bono
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.8rem' }}>
        <StatBox title="Clientes vía LATIDOS" value={stats.clientesHoy} icon="👥" />
        <StatBox title="Gasto generado" value={`${stats.gastoHoy} €`} icon="💶" />
        <StatBox title="Bonos procesados" value={stats.bonosHoy} icon="🎁" />
        <StatBox title="Clientes nuevos" value={stats.clientesNuevos} icon="⭐" />
      </div>

      {/* Historial de canjes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--color-header-bg)', margin: 0, fontWeight: '700' }}>
          Últimos canjes recibidos
        </h3>
        <span style={{ fontSize: '0.75rem', color: '#6b4f53' }}>
          Total: {stats.recentTxs.length}
        </span>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '1.2rem', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #E8C8CB' }}>
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#6b4f53', margin: 0 }}>Cargando canjes...</p>
        ) : stats.recentTxs.length === 0 ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '0.5rem' }}>🎟️</span>
            <p style={{ margin: 0, fontFamily: 'var(--font-main)', color: '#6b4f53', fontWeight: '600', fontSize: '0.95rem' }}>
              No hay canjes registrados aún.
            </p>
            <p style={{ margin: '0.3rem 0 0', color: '#999', fontSize: '0.8rem' }}>
              Cuando un cliente canjee un bono en tu tienda, aparecerá aquí en tiempo real.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-main)', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F5E6E8', color: '#6b4f53', borderBottom: '1px solid #E8C8CB' }}>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: '700' }}>Fecha / Hora</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: '700' }}>Código</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: '700' }}>Bono</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: '700' }}>Estado / Importe</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: '700', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTxs.map(tx => {
                  const isValidated = tx.importe_compra && parseFloat(tx.importe_compra) > 0;
                  const isCancelled = tx.descuento && (tx.descuento.includes('Cancelado') || tx.descuento.includes('Caducado'));

                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: isValidated ? '#fff' : '#FFFDF7' }}>
                      <td style={{ padding: '0.9rem 1rem', color: '#444', whiteSpace: 'nowrap' }}>
                        {new Date(tx.fecha).toLocaleDateString('es-ES')} <span style={{ opacity: 0.7, fontSize: '0.78rem' }}>{new Date(tx.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--color-header-bg)', fontWeight: '800', letterSpacing: '0.04em' }}>
                        {tx.code}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: '#333', fontWeight: '600' }}>
                        {typeof tx.descuento === 'number' ? `${tx.descuento} € dto.` : tx.descuento} <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({tx.latidos_usados || 0} ❤)</span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {isValidated ? (
                          <span style={{ backgroundColor: '#E8F5E9', color: '#2E7D32', padding: '0.3rem 0.7rem', borderRadius: '1rem', fontWeight: '800', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            ✓ Validado ({parseFloat(tx.importe_compra).toFixed(2)} €)
                          </span>
                        ) : isCancelled ? (
                          <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.3rem 0.7rem', borderRadius: '1rem', fontWeight: '700', fontSize: '0.78rem' }}>
                            ✕ Expirado / Cancelado
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#FFF3E0', color: '#E65100', padding: '0.3rem 0.7rem', borderRadius: '1rem', fontWeight: '800', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            ⏳ Esperando validar
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        {!isValidated && !isCancelled && (
                          <button
                            onClick={() => navigate(`/comercio/validar?code=${tx.code}`)}
                            style={{
                              backgroundColor: 'var(--color-header-bg)',
                              color: '#fff',
                              border: 'none',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '0.8rem',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Validar →
                          </button>
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
