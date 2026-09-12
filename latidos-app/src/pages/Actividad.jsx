import React from 'react';
import { useLatidos } from '../context/LatidosContext';

const Actividad = () => {
  const { activity, steps, currency, tr } = useLatidos();

  const todayStr = new Date().toISOString().slice(0, 10);

  const formatFecha = (fechaStr) => {
    if (!fechaStr) return 'Hoy';
    if (fechaStr === todayStr) {
      const d = new Date();
      return `Hoy, ${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    const d = new Date(fechaStr + 'T00:00:00');
    if (isNaN(d.getTime())) return fechaStr;
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Combine historical activity with live today's steps and accurate Latidos
  let displayActivity = (activity || []).map(a => {
    const p = a.pasos || 0;
    const l = Math.max(a.latidos_ganados || 0, Math.floor(p / 100));
    return { ...a, pasos: p, latidos_ganados: l };
  });

  const todayIndex = displayActivity.findIndex(a => a.fecha === todayStr);

  if (todayIndex >= 0) {
    const livePasos = Math.max(displayActivity[todayIndex].pasos || 0, steps || 0);
    const liveLatidos = Math.max(displayActivity[todayIndex].latidos_ganados || 0, Math.floor(livePasos / 100));
    displayActivity[todayIndex] = {
      ...displayActivity[todayIndex],
      pasos: livePasos,
      latidos_ganados: liveLatidos
    };
  } else if ((steps || 0) > 0) {
    displayActivity.unshift({
      id: 'today-live',
      fecha: todayStr,
      pasos: steps,
      latidos_ganados: Math.floor((steps || 0) / 100)
    });
  }

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

      {/* Lista */}
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
            <div key={item.id} style={{
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
                  {formatFecha(item.fecha)}
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
