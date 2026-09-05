import React from 'react';
import { useLatidos } from '../context/LatidosContext';

const Racha = ({ dias, weekData, objetivo }) => {
  const { tr } = useLatidos();

  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      padding: '1.4rem 1.5rem',
      borderRadius: '1.5rem',
      margin: '0.75rem 1rem',
      boxShadow: 'var(--shadow-card)',
      border: '1px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{
            color: 'var(--color-text)',
            fontSize: '1rem', fontWeight: '500',
            fontFamily: 'var(--font-main)',
            letterSpacing: '0.01em',
            marginBottom: '0.1rem',
            opacity: 0.8
          }}>
            {tr?.racha || 'Racha'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{
              fontSize: '2.8rem', fontWeight: '600',
              color: 'var(--color-accent)',
              fontFamily: 'var(--font-display)',
              lineHeight: '1', letterSpacing: '-0.01em'
            }}>
              {dias}
            </span>
            <span style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem', fontFamily: 'var(--font-main)', fontWeight: '400'
            }}>
              {tr?.dias || 'días'}
            </span>
          </div>
        </div>

        {/* Weekly days breakdown with fire emoji */}
        <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem' }}>
          {weekData.map((day, i) => {
            const todayIndex = (new Date().getDay() + 6) % 7;
            const isToday = i === todayIndex;
            const metGoal = day.steps >= objetivo;
            
            return (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem'
              }}>
                <div style={{
                  width: isToday ? '28px' : '24px', 
                  height: isToday ? '28px' : '24px',
                  borderRadius: '50%',
                  backgroundColor: metGoal ? (isToday ? 'rgba(255, 69, 0, 0.2)' : 'rgba(255, 107, 0, 0.15)') : 'var(--color-card-alt)',
                  border: isToday && !metGoal ? '2px dashed var(--color-border)' : (isToday && metGoal ? '2px solid #ff4500' : 'none'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isToday ? '1rem' : '0.85rem',
                  boxShadow: isToday && metGoal ? '0 0 10px rgba(255, 69, 0, 0.4)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {metGoal ? '🔥' : ''}
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  color: isToday ? 'var(--color-accent)' : (metGoal ? 'var(--color-text)' : 'var(--color-text-muted)'),
                  fontFamily: 'var(--font-main)',
                  fontWeight: isToday || metGoal ? '700' : '400'
                }}>
                  {day.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Racha;