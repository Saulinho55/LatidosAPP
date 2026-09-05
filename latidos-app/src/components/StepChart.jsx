import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useLatidos } from '../context/LatidosContext';

const StepChart = ({ data, objetivo }) => {
  const { tr } = useLatidos();

  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      padding: '1.4rem 1.5rem',
      borderRadius: '1.5rem',
      margin: '0.75rem 1rem',
      boxShadow: 'var(--shadow-card)',
      border: '1px solid var(--color-border)',
      height: '240px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h3 style={{
        color: 'var(--color-text)',
        fontSize: '1rem', fontWeight: '500',
        fontFamily: 'var(--font-main)',
        letterSpacing: '0.01em',
        marginBottom: '1rem',
        opacity: 0.8
      }}>
        {tr?.actividadSemanal || 'Actividad semanal'}
      </h3>
      
      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-main)' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-main)' }} 
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              domain={[0, dataMax => Math.max(dataMax, objetivo)]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--color-card-alt)', 
                border: '1px solid var(--color-border)', 
                borderRadius: '0.8rem',
                color: 'var(--color-text)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              itemStyle={{ color: 'var(--color-accent)', fontWeight: 'bold' }}
              formatter={(value) => [`${(value || 0).toLocaleString('es-ES')} ${tr?.pasosUnit || 'pasos'}`, '']}
              labelStyle={{ color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}
            />
            <ReferenceLine y={objetivo} stroke="#4ade80" strokeDasharray="3 3" opacity={0.6} />
            <Area 
              type="monotone" 
              dataKey="steps" 
              stroke="var(--color-accent)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSteps)" 
              activeDot={{ r: 6, fill: 'var(--color-accent)', stroke: 'var(--color-card)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StepChart;
