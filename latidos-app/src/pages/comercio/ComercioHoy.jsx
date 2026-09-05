import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLatidos } from '../../context/LatidosContext';

const ComercioHoy = () => {
  const navigate = useNavigate();
  const { fetchComercioStats } = useLatidos();
  
  const [stats, setStats] = useState({
    clientesHoy: 0,
    gastoHoy: 0,
    bonosHoy: 0,
    clientesNuevos: 0,
    recentTxs: []
  });

  useEffect(() => {
    const loadStats = async () => {
      const data = await fetchComercioStats();
      if (data && data.transactions) {
        const today = new Date().toISOString().split('T')[0];
        
        // Filter transactions for today
        const todayTxs = data.transactions.filter(t => t.fecha.startsWith(today));
        
        const gastoHoy = todayTxs.reduce((sum, t) => sum + (t.importe_compra || 0), 0);
        
        // Calculate new clients (first time they transact with this commerce is today)
        const userTxsMap = {};
        data.transactions.forEach(t => {
          if (!userTxsMap[t.user_id]) userTxsMap[t.user_id] = [];
          userTxsMap[t.user_id].push(t.fecha);
        });
        
        let clientesNuevos = 0;
        Object.values(userTxsMap).forEach(dates => {
          dates.sort();
          if (dates[0].startsWith(today)) {
            clientesNuevos++;
          }
        });

        setStats({
          clientesHoy: todayTxs.length,
          gastoHoy: gastoHoy,
          bonosHoy: todayTxs.length,
          clientesNuevos: clientesNuevos,
          recentTxs: data.transactions.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10)
        });
      }
    };
    loadStats();
  }, [fetchComercioStats]);

  const StatBox = ({ title, value }) => (
    <div style={{
      backgroundColor: '#F5D3D6',
      borderRadius: '1rem',
      padding: '1.2rem',
      flex: '1 1 calc(50% - 0.5rem)',
      minWidth: '140px'
    }}>
      <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.75rem', color: '#6b4f53', marginBottom: '0.4rem' }}>
        {title}
      </p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: '600', color: 'var(--color-header-bg)', margin: 0, lineHeight: 1 }}>
        {value}
      </p>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-header-bg)', marginBottom: '1.5rem', fontWeight: '600' }}>
        Resumen de hoy
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <StatBox title="Clientes vía LATIDOS" value={stats.clientesHoy} />
        <StatBox title="Gasto generado" value={`${stats.gastoHoy} €`} />
        <StatBox title="Bonos canjeados" value={stats.bonosHoy} />
        <StatBox title="Clientes nuevos" value={stats.clientesNuevos} />
      </div>

      <button
        onClick={() => navigate('/comercio/validar')}
        style={{
          backgroundColor: '#4E030F',
          color: '#fff',
          border: 'none',
          padding: '1rem 2rem',
          borderRadius: '2rem',
          fontFamily: 'var(--font-main)',
          fontWeight: '700',
          fontSize: '1rem',
          cursor: 'pointer',
          width: 'fit-content',
          marginBottom: '2rem'
        }}
      >
        Validar código del vecino
      </button>

      {/* Historial de canjes */}
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-header-bg)', marginBottom: '1rem', fontWeight: '600' }}>
        Últimos canjes
      </h3>
      <div style={{ backgroundColor: '#fff', borderRadius: '1rem', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        {stats.recentTxs.length === 0 ? (
          <p style={{ padding: '1.5rem', margin: 0, fontFamily: 'var(--font-main)', color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>No hay canjes registrados aún.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-main)', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F5E6E8', color: '#6b4f53' }}>
                <th style={{ padding: '0.8rem 1rem', fontWeight: '600' }}>Fecha</th>
                <th style={{ padding: '0.8rem 1rem', fontWeight: '600' }}>Bono</th>
                <th style={{ padding: '0.8rem 1rem', fontWeight: '600' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentTxs.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text)' }}>
                    {new Date(tx.fecha).toLocaleDateString()} {new Date(tx.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text)' }}>
                    {tx.descuento}
                  </td>
                  <td style={{ padding: '0.8rem 1rem', color: tx.importe_compra ? 'var(--color-accent)' : '#aaa', fontWeight: tx.importe_compra ? '600' : 'normal' }}>
                    {tx.importe_compra ? `${tx.importe_compra} €` : 'No validado'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ComercioHoy;
