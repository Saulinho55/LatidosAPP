import React, { useEffect, useState } from 'react';
import { useLatidos } from '../../context/LatidosContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const { fetchAdminStats } = useLatidos();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchAdminStats().then(setStats);
  }, []);

  if (!stats) return <div style={{ color: 'var(--color-text)' }}>Cargando estadísticas...</div>;

  const mockChartData = [
    { day: 'Lun', steps: Math.floor(stats.totalSteps * 0.1) },
    { day: 'Mar', steps: Math.floor(stats.totalSteps * 0.15) },
    { day: 'Mié', steps: Math.floor(stats.totalSteps * 0.12) },
    { day: 'Jue', steps: Math.floor(stats.totalSteps * 0.2) },
    { day: 'Vie', steps: Math.floor(stats.totalSteps * 0.18) },
    { day: 'Sáb', steps: Math.floor(stats.totalSteps * 0.25) },
    { day: 'Dom', steps: Math.floor(stats.totalSteps * 0.1) }
  ];

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
        Visión General
      </h2>
      
      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: 'var(--color-card)', padding: '1.2rem', borderRadius: '1.2rem', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-main)', marginBottom: '0.3rem' }}>Total Usuarios</p>
          <p style={{ color: 'var(--color-text)', fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: '700' }}>{stats.totalUsers}</p>
        </div>
        <div style={{ backgroundColor: 'var(--color-card)', padding: '1.2rem', borderRadius: '1.2rem', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-main)', marginBottom: '0.3rem' }}>Total Pasos</p>
          <p style={{ color: 'var(--color-accent)', fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: '700' }}>{(stats.totalSteps / 1000).toFixed(1)}k</p>
        </div>
        <div style={{ backgroundColor: 'var(--color-card)', padding: '1.2rem', borderRadius: '1.2rem', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-main)', marginBottom: '0.3rem' }}>Latidos en Circulación</p>
          <p style={{ color: 'var(--color-text)', fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: '700' }}>{stats.totalLatidos.toLocaleString()}</p>
        </div>
        <div style={{ backgroundColor: 'var(--color-card)', padding: '1.2rem', borderRadius: '1.2rem', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-main)', marginBottom: '0.3rem' }}>Transacciones</p>
          <p style={{ color: 'var(--color-text)', fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: '700' }}>{stats.totalTransactions}</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--color-accent)', color: 'white', padding: '1.2rem', borderRadius: '1.2rem', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <p style={{ fontSize: '0.8rem', fontFamily: 'var(--font-main)', opacity: 0.9, marginBottom: '0.3rem' }}>Ingresos Generados (Valor estimado)</p>
        <p style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: '700' }}>
          {(stats.totalLatidosGastados * 0.01).toFixed(2)} €
        </p>
        <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-main)', opacity: 0.8, marginTop: '0.4rem' }}>
          Basado en un valor de retorno de 0.01€ / Latido.
        </p>
      </div>

      {/* Chart */}
      <div style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1.2rem', boxShadow: 'var(--shadow-card)', height: '260px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ color: 'var(--color-text)', fontSize: '1rem', fontFamily: 'var(--font-main)', marginBottom: '1rem', opacity: 0.8 }}>
          Actividad Global (Simulada)
        </h3>
        <div style={{ flex: 1, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAdminSteps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-card-alt)', borderRadius: '0.8rem', border: 'none', color: 'var(--color-text)' }} />
              <Area type="monotone" dataKey="steps" stroke="var(--color-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorAdminSteps)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
