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
      backgroundColor: '#F5D3D6',
      borderRadius: '1rem',
      padding: '1.2rem',
      flex: '1 1 calc(25% - 1rem)',
      minWidth: '180px'
    }}>
      <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.75rem', color: '#6b4f53', marginBottom: '0.4rem' }}>
        {title}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: '600', color: 'var(--color-header-bg)', margin: 0, lineHeight: 1 }}>
          {value}
        </p>
      </div>
      {subtext && (
        <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.75rem', color: '#A4777C', margin: '0.4rem 0 0' }}>
          {subtext}
        </p>
      )}
    </div>
  );

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-header-bg)', marginBottom: '1.5rem', fontWeight: '600' }}>
        Informe mensual
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem' }}>
        <StatBox title="Clientes captados vía LATIDOS" value={stats.clientesMes} subtext="+14 vs. mes anterior" />
        <StatBox title="Gasto generado" value={`${stats.gastoMes.toFixed(2)} €`} subtext={`ticket medio ${stats.ticketMedio.toFixed(2)} €`} />
        <StatBox title="Clientes recurrentes" value={`${stats.clientesRecurrentesPct} %`} subtext="2 o más visitas" />
        <StatBox title="Mejor día de la semana" value={stats.mejorDia} subtext="23 % de las visitas" />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.8rem', fontWeight: '700', color: '#6b4f53', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
          Evolución mensual · Clientes vía LATIDOS
        </p>
        <div style={{ height: '200px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.chartData}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b4f53', fontSize: 12, fontFamily: 'var(--font-main)' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '0.8rem', border: 'none', backgroundColor: '#FCECEE', color: 'var(--color-header-bg)' }}
                itemStyle={{ color: 'var(--color-header-bg)' }}
              />
              <Line type="monotone" dataKey="clients" stroke="#F5D3D6" strokeWidth={4} dot={{ r: 6, fill: '#E8C8CB', stroke: 'none' }} activeDot={{ r: 8, fill: 'var(--color-header-bg)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ backgroundColor: '#F5D3D6', padding: '1rem 1.5rem', borderRadius: '1rem', marginTop: '1rem' }}>
          <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.85rem', color: 'var(--color-header-bg)', margin: 0, fontWeight: '500' }}>
            Tu cuota mensual incluye este informe y visibilidad en la app y redes de LATIDOS.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComercioInforme;
