import React from 'react';
import { useLatidos } from '../context/LatidosContext';
import { getLocalDateStr, formatDisplayDate } from '../utils/dateUtils';

const Actividad = () => {
  const { activity, steps, tr } = useLatidos();

  const todayStr = getLocalDateStr();

  // Deduplicate and sanitize activity records
  const activityMap = new Map();
  (activity || []).forEach(a => {
    if (!a || !a.fecha) return;
    const cleanDate = a.fecha.split('T')[0];
    const prev = activityMap.get(cleanDate);
    const currentPasos = a.pasos || 0;
    const currentLatidos = Math.max(a.latidos_ganados || 0, Math.floor(currentPasos / 100));

    if (!prev) {
      activityMap.set(cleanDate, {
        id: a.id || `act-${cleanDate}`,
        fecha: cleanDate,
        pasos: currentPasos,
        latidos_ganados: currentLatidos
      });
    } else {
      activityMap.set(cleanDate, {
        ...prev,
        pasos: Math.max(prev.pasos, currentPasos),
        latidos_ganados: Math.max(prev.latidos_ganados, currentLatidos)
      });
    }
  });

  // If there are live steps recorded today, merge with today's record
  const effectiveLiveSteps = steps || 0;
  if (effectiveLiveSteps > 0) {
    const todayRecord = activityMap.get(todayStr);
    const combinedPasos = Math.max(todayRecord ? todayRecord.pasos : 0, effectiveLiveSteps);
    const combinedLatidos = Math.max(todayRecord ? todayRecord.latidos_ganados : 0, Math.floor(combinedPasos / 100));
    activityMap.set(todayStr, {
      id: todayRecord ? todayRecord.id : 'today-live',
      fecha: todayStr,
      pasos: combinedPasos,
      latidos_ganados: combinedLatidos
    });
  }

  // Convert map to sorted array descending by date
  const displayActivity = Array.from(activityMap.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const totalPasos = displayActivity.reduce((s, a) => s + (a.pasos || 0), 0);
  const totalLatidos = displayActivity.reduce((s, a) => s + (a.latidos_ganados || 0), 0);

  return (
    <div style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--color-header-bg)',
        color: 'var(--color-header-text)',
        padding: '1.8rem 1.8rem 1.5rem',
        borderRadius: '1.5rem',
        margin: '1rem 1rem 0.75rem',
      }}>
        <p style={{ fontSize: '0.85rem', opacity: 0.7, fontFamily: 'var(--font-main)', marginBottom: '0.3rem' }}>
          {tr?.historicoActividad || 'Histórico de Actividad'}
        </p>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
          <div>
            <p style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: '600', lineHeight: 1 }}>
              {totalPasos.toLocaleString('es-ES')}
            </p>
            <p style={{ fontSize: '0.75rem', opacity: 0.65, fontFamily: 'var(--font-main)' }}>
              {tr?.stepCount || 'Pasos'} {tr?.totales || 'totales'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: '600', lineHeight: 1 }}>
              {totalLatidos.toLocaleString('es-ES')}
            </p>
            <p style={{ fontSize: '0.75rem', opacity: 0.65, fontFamily: 'var(--font-main)' }}>
              {tr?.latidosGanados || 'Latidos ganados'}
            </p>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div style={{ padding: '0 1rem' }}>
        {displayActivity.length === 0 ? (
          <p style={{
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-main)',
            marginTop: '3rem',
            fontSize: '0.9rem'
          }}>
            {tr?.sinActividad || 'Aún no tienes actividad registrada. ¡Empieza a caminar!'}
          </p>
        ) : (
          displayActivity.map((item) => (
            <div key={item.id || item.fecha} style={{
              backgroundColor: 'var(--color-card)',
              borderRadius: '1rem',
              padding: '1rem 1.2rem',
              marginBottom: '0.75rem',
              border: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              {/* Left: date + steps */}
              <div>
                <p style={{
                  fontFamily: 'var(--font-main)',
                  fontSize: '0.75rem',
                  opacity: 0.5,
                  marginBottom: '0.2rem',
                  textTransform: 'capitalize'
                }}>
                  {formatDisplayDate(item.fecha, tr)}
                </p>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: 'var(--color-text)',
                  lineHeight: 1
                }}>
                  {(item.pasos || 0).toLocaleString('es-ES')}
                  <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-main)', fontWeight: '400', opacity: 0.5, marginLeft: '0.3rem' }}>
                    {tr?.stepCount || 'pasos'}
                  </span>
                </p>
              </div>

              {/* Right: latidos */}
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: 'var(--color-accent)',
                  lineHeight: 1
                }}>
                  +{item.latidos_ganados || 0} ❤️
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Actividad;
