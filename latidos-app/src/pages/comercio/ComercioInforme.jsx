import React, { useEffect, useState } from 'react';
import { useLatidos } from '../../context/LatidosContext';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ComercioInforme = () => {
  const { fetchComercioStats } = useLatidos();
  
  const [stats, setStats] = useState({
    clientesMes: 0,
    gastoMes: 0,
    ticketMedio: 0,
    clientesRecurrentesPct: 0,
    mejorDia: '-',
    chartData: []
  });

  useEffect(() => {
    const loadStats = async () => {
      const data = await fetchComercioStats();
      if (data && data.transactions) {
        const now = new Date();
        const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
        
        // Filter transactions for current month
        const monthTxs = data.transactions.filter(t => t.fecha && t.fecha.startsWith(currentMonthStr));
        
        const gastoMes = monthTxs.reduce((sum, t) => sum + (parseFloat(t.importe_compra) || 0), 0);
        const ticketMedio = monthTxs.length > 0 ? (gastoMes / monthTxs.length) : 0;
        
        // Calculate recurrency (all time)
        const userTxsMap = {};
        data.transactions.forEach(t => {
          if (t.user_id) {
            if (!userTxsMap[t.user_id]) userTxsMap[t.user_id] = 0;
            userTxsMap[t.user_id]++;
          }
        });
        const totalUsers = Object.keys(userTxsMap).length;
        const recurrentUsers = Object.values(userTxsMap).filter(count => count >= 2).length;
        const recurrentPct = totalUsers > 0 ? Math.round((recurrentUsers / totalUsers) * 100) : 0;

        // Best day of week
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayCounts = [0,0,0,0,0,0,0];
        data.transactions.forEach(t => {
          if (t.fecha) {
            const d = new Date(t.fecha).getDay();
            dayCounts[d]++;
          }
        });
        const maxDayCount = Math.max(...dayCounts);
        const bestDayIndex = dayCounts.indexOf(maxDayCount);
        const bestDay = maxDayCount > 0 ? days[bestDayIndex] : '-';

        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const currentYear = new Date().getFullYear();
        
        const chartData = meses.map((monthStr, index) => {
          const monthNumber = String(index + 1).padStart(2, '0');
          const monthPrefix = `${currentYear}-${monthNumber}`;
          const count = data.transactions.filter(t => t.fecha && t.fecha.startsWith(monthPrefix)).length;
          return { month: monthStr, clients: count };
        });

        setStats({
          clientesMes: monthTxs.length,
          gastoMes: gastoMes,
          ticketMedio: ticketMedio,
          clientesRecurrentesPct: recurrentPct,
          mejorDia: bestDay,
          chartData: chartData
        });
      }
    };
    loadStats();
  }, [fetchComercioStats]);

  const StatBox = ({ title, value, subtext }) => (
    <div style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '1.2rem',
      padding: '1.2rem',
      flex: '1 1 calc(50% - 0.5rem)',
      minWidth: '150px',
      boxShadow: 'var(--shadow-card)'
    }}>
      <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem', fontWeight: '600' }}>
        {title}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: '700', color: 'var(--color-text)', margin: 0, lineHeight: 1.1 }}>
          {value}
        </p>
      </div>
      {subtext && (
        <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.4rem 0 0', opacity: 0.8 }}>
          {subtext}
        </p>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-text)', margin: 0, fontWeight: '700' }}>
          Informe mensual
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
          Estadísticas de impacto y ventas canalizadas a través de LATIDOS.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '2rem' }}>
        <StatBox title="Clientes vía LATIDOS" value={stats.clientesMes} subtext="Este mes" />
        <StatBox title="Gasto generado" value={`${stats.gastoMes.toFixed(2)} €`} subtext={`Ticket medio ${stats.ticketMedio.toFixed(2)} €`} />
        <StatBox title="Clientes recurrentes" value={`${stats.clientesRecurrentesPct} %`} subtext="2 o más visitas" />
        <StatBox title="Mejor día" value={stats.mejorDia} subtext="Mayor afluencia" />
      </div>

      <div style={{
        backgroundColor: 'var(--color-card)',
        padding: '1.4rem',
        borderRadius: '1.2rem',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        marginBottom: '1.5rem'
      }}>
        <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.2rem' }}>
          Evolución mensual · Clientes vía LATIDOS
        </p>
        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.chartData}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-main)' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '0.8rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-text)', boxShadow: 'var(--shadow-card)' }}
                itemStyle={{ color: 'var(--color-accent)', fontWeight: '700' }}
              />
              <Line type="monotone" dataKey="clients" stroke="var(--color-accent)" strokeWidth={3} dot={{ r: 5, fill: 'var(--color-accent)', stroke: 'none' }} activeDot={{ r: 7, fill: 'var(--color-text)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--color-card-alt)', padding: '1rem 1.2rem', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
        <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, fontWeight: '500' }}>
          💡 Tu cuota mensual incluye este informe detallado y visibilidad preferente en el mapa y la app de LATIDOS.
        </p>
      </div>
    </div>
  );
};

export default ComercioInforme;
