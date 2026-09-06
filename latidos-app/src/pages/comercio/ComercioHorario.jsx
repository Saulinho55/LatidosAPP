import React, { useEffect, useState } from 'react';
import { useLatidos } from '../../context/LatidosContext';

const DIAS_SEMANA = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' }
];

const DEFAULT_HORARIO = {
  lunes: '09:00 - 14:00, 17:00 - 20:30',
  martes: '09:00 - 14:00, 17:00 - 20:30',
  miercoles: '09:00 - 14:00, 17:00 - 20:30',
  jueves: '09:00 - 14:00, 17:00 - 20:30',
  viernes: '09:00 - 14:00, 17:00 - 20:30',
  sabado: '09:30 - 14:00',
  domingo: 'Cerrado'
};

const ComercioHorario = () => {
  const { user, fetchComercios, updateComercioHorarios } = useLatidos();
  const [comercio, setComercio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // States
  const [horario, setHorario] = useState(DEFAULT_HORARIO);
  const [vacaciones, setVacaciones] = useState({
    activo: false,
    inicio: '',
    fin: '',
    mensaje: ''
  });
  const [aviso, setAviso] = useState({
    activo: true,
    texto: '',
    programar: false,
    inicio: '',
    fin: ''
  });
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadComercioData();
  }, [user]);

  const loadComercioData = async () => {
    const all = await fetchComercios();
    const targetComercioId = user?.comercio_id || 2;
    const mine = all.find(c => Number(c.id) === Number(targetComercioId)) || all[0];
    if (mine) {
      setComercio(mine);
      
      let parsedH = mine.horario;
      if (typeof parsedH === 'string') {
        try { parsedH = JSON.parse(parsedH); } catch (e) { parsedH = {}; }
      }
      if (parsedH && Object.keys(parsedH).length > 0) {
        setHorario({ ...DEFAULT_HORARIO, ...parsedH });
      }

      let parsedV = mine.vacaciones;
      if (typeof parsedV === 'string') {
        try { parsedV = JSON.parse(parsedV); } catch (e) { parsedV = {}; }
      }
      if (parsedV) {
        setVacaciones({
          activo: Boolean(parsedV.activo),
          inicio: parsedV.inicio || '',
          fin: parsedV.fin || '',
          mensaje: parsedV.mensaje || ''
        });
      }

      if (mine.aviso) {
        let parsedA = mine.aviso;
        if (typeof parsedA === 'string' && (parsedA.trim().startsWith('{') || parsedA.trim().startsWith('['))) {
          try { parsedA = JSON.parse(parsedA); } catch(e) {}
        }
        if (typeof parsedA === 'string') {
          setAviso({
            activo: parsedA.trim() !== '',
            texto: parsedA,
            programar: false,
            inicio: '',
            fin: ''
          });
        } else if (typeof parsedA === 'object' && parsedA !== null) {
          setAviso({
            activo: parsedA.activo !== false,
            texto: parsedA.texto || '',
            programar: Boolean(parsedA.inicio || parsedA.fin),
            inicio: parsedA.inicio || '',
            fin: parsedA.fin || ''
          });
        }
      }

      setTelefono(mine.telefono || '');
      setEmail(mine.email || '');
    }
    setLoading(false);
  };

  const handleHorarioChange = (diaKey, value) => {
    setHorario(prev => ({ ...prev, [diaKey]: value }));
  };

  const aplicarPlantillaComercial = () => {
    setHorario({
      lunes: '09:00 - 14:00, 17:00 - 20:30',
      martes: '09:00 - 14:00, 17:00 - 20:30',
      miercoles: '09:00 - 14:00, 17:00 - 20:30',
      jueves: '09:00 - 14:00, 17:00 - 20:30',
      viernes: '09:00 - 14:00, 17:00 - 20:30',
      sabado: '09:30 - 14:00',
      domingo: 'Cerrado'
    });
  };

  const aplicarPlantillaContinuo = () => {
    setHorario({
      lunes: '08:30 - 18:00',
      martes: '08:30 - 18:00',
      miercoles: '08:30 - 18:00',
      jueves: '08:30 - 18:00',
      viernes: '08:30 - 18:00',
      sabado: '09:00 - 14:00',
      domingo: 'Cerrado'
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const targetId = user?.comercio_id || comercio?.id || 2;
    
    const avisoToSave = aviso.activo && aviso.texto?.trim()
      ? JSON.stringify(aviso)
      : '';

    const success = await updateComercioHorarios(targetId, {
      horario,
      vacaciones,
      aviso: avisoToSave,
      telefono,
      email
    });

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } else {
      alert('Error al guardar los cambios. Inténtalo de nuevo.');
    }
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Cargando información del comercio...</p>;

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-text)', fontWeight: '700', margin: 0 }}>
          Horarios & Avisos
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', fontFamily: 'var(--font-main)', marginTop: '0.3rem' }}>
          Configura tus horas de apertura, periodos de vacaciones y avisos destacados que verán los usuarios en la app.
        </p>
      </div>

      {saveSuccess && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          color: '#059669',
          padding: '0.9rem 1.2rem',
          borderRadius: '1rem',
          marginBottom: '1.5rem',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          fontWeight: '600',
          fontFamily: 'var(--font-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>✅</span>
          <span>¡Horarios, vacaciones y avisos guardados correctamente!</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>

        {/* ── SECCIÓN 1: HORARIO SEMANAL ── */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          padding: '1.5rem',
          borderRadius: '1.2rem',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text)', margin: 0, fontWeight: '700' }}>
              ⏰ Horario Semanal
            </h3>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={aplicarPlantillaComercial}
                style={templateBtnStyle}
              >
                Partición Estándar
              </button>
              <button
                type="button"
                onClick={aplicarPlantillaContinuo}
                style={templateBtnStyle}
              >
                Continuo
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {DIAS_SEMANA.map(({ key, label }) => (
              <div key={key} style={{
                display: 'grid',
                gridTemplateColumns: '95px 1fr 70px',
                alignItems: 'center',
                gap: '0.6rem',
                backgroundColor: 'var(--color-card-alt)',
                padding: '0.5rem 0.8rem',
                borderRadius: '0.8rem',
                border: '1px solid var(--color-border)'
              }}>
                <span style={{ fontWeight: '700', fontSize: '0.82rem', color: 'var(--color-text)', fontFamily: 'var(--font-main)' }}>
                  {label}
                </span>
                <input
                  type="text"
                  placeholder="Ej: 09:00 - 14:00, 17:00 - 20:30"
                  value={horario[key] || ''}
                  onChange={e => handleHorarioChange(key, e.target.value)}
                  style={{
                    padding: '0.45rem 0.7rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-main)',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--color-input-bg)',
                    color: 'var(--color-text)',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleHorarioChange(key, horario[key] === 'Cerrado' ? '09:00 - 14:00, 17:00 - 20:30' : 'Cerrado')}
                  style={{
                    backgroundColor: horario[key] === 'Cerrado' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: horario[key] === 'Cerrado' ? '#dc2626' : '#059669',
                    border: 'none',
                    padding: '0.35rem 0.5rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {horario[key] === 'Cerrado' ? 'Cerrado' : 'Abierto'}
                </button>
              </div>
            ))}
          </div>
        </div>


        {/* ── SECCIÓN 2: VACACIONES Y CIERRE TEMPORAL ── */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          padding: '1.5rem',
          borderRadius: '1.2rem',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text)', margin: 0, fontWeight: '700' }}>
                🏖️ Periodo de Vacaciones / Cierres
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)', marginTop: '0.2rem' }}>
                Informa a los usuarios si tu tienda estará cerrada temporalmente.
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', color: 'var(--color-text)' }}>
              <input
                type="checkbox"
                checked={vacaciones.activo}
                onChange={e => setVacaciones({...vacaciones, activo: e.target.checked})}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
              />
              {vacaciones.activo ? 'Activado' : 'Desactivado'}
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
            <div>
              <label style={fieldLabelStyle}>Fecha Inicio</label>
              <input
                type="date"
                value={vacaciones.inicio}
                onChange={e => setVacaciones({...vacaciones, inicio: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Fecha Fin</label>
              <input
                type="date"
                value={vacaciones.fin}
                onChange={e => setVacaciones({...vacaciones, fin: e.target.value})}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle}>Mensaje para el cliente</label>
            <input
              type="text"
              placeholder="Ej: Estaremos de vacaciones del 12 al 24 de Agosto. ¡Volvemos pronto!"
              value={vacaciones.mensaje}
              onChange={e => setVacaciones({...vacaciones, mensaje: e.target.value})}
              style={inputStyle}
            />
          </div>
        </div>


        {/* ── SECCIÓN 3: AVISO DESTACADO / NOTICIA ── */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          padding: '1.5rem',
          borderRadius: '1.2rem',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text)', margin: 0, fontWeight: '700' }}>
              📢 Aviso Especial / Cartelera
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-text)' }}>
                <input
                  type="checkbox"
                  checked={aviso.activo}
                  onChange={e => setAviso({...aviso, activo: e.target.checked})}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
                />
                Activar
              </label>
              {aviso.texto && (
                <button
                  type="button"
                  onClick={() => setAviso({ activo: false, texto: '', programar: false, inicio: '', fin: '' })}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '700' }}
                >
                  ✕ Borrar
                </button>
              )}
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)', marginBottom: '0.8rem' }}>
            Muestra un mensaje importante en la ficha de tu tienda. Puedes programarlo para que solo se muestre entre dos fechas específicas.
          </p>

          <div style={{ marginBottom: '0.9rem' }}>
            <label style={fieldLabelStyle}>Texto del Aviso</label>
            <textarea
              rows="2"
              placeholder="Ej: Hoy cerramos a las 18:00 por inventario / ¡Oferta especial este fin de semana!"
              value={aviso.texto || ''}
              onChange={e => setAviso({ ...aviso, texto: e.target.value })}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '60px'
              }}
            />
          </div>

          {/* Programación de fechas del aviso */}
          <div style={{
            backgroundColor: 'var(--color-card-alt)',
            padding: '0.8rem 1rem',
            borderRadius: '0.8rem',
            border: '1px solid var(--color-border)'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-text)' }}>
              <input
                type="checkbox"
                checked={aviso.programar}
                onChange={e => setAviso({ ...aviso, programar: e.target.checked })}
                style={{ width: '15px', height: '15px', accentColor: 'var(--color-accent)' }}
              />
              🕒 Programar fechas de publicación (mostrar solo de fecha X a fecha Y)
            </label>

            {aviso.programar && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '0.8rem' }}>
                <div>
                  <label style={fieldLabelStyle}>Mostrar desde (Fecha Inicio)</label>
                  <input
                    type="date"
                    value={aviso.inicio || ''}
                    onChange={e => setAviso({ ...aviso, inicio: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Mostrar hasta (Fecha Fin)</label>
                  <input
                    type="date"
                    value={aviso.fin || ''}
                    onChange={e => setAviso({ ...aviso, fin: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}
          </div>
        </div>


        {/* ── SECCIÓN 4: INFORMACIÓN DE CONTACTO ── */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          padding: '1.5rem',
          borderRadius: '1.2rem',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text)', margin: '0 0 0.4rem', fontWeight: '700' }}>
            📞 Información de Contacto (Opcional)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)', marginBottom: '1rem' }}>
            Añade un teléfono o email para que los clientes puedan llamarte o escribirte directamente con 1 clic desde la app.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div>
              <label style={fieldLabelStyle}>📞 Teléfono de contacto</label>
              <input
                type="tel"
                placeholder="Ej: 928 123 456"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>✉️ Correo electrónico</label>
              <input
                type="email"
                placeholder="Ej: contacto@tutienda.es"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        </div>


        {/* ── VISTA PREVIA ── */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          padding: '1.4rem',
          borderRadius: '1.2rem',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.8rem' }}>
            👁️ Vista Previa en la Ficha del Negocio
          </p>

          {/* Banner de vacaciones en vista previa */}
          {(vacaciones.activo || (vacaciones.inicio && vacaciones.fin)) && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.8rem',
              padding: '0.75rem 1rem',
              marginBottom: '0.8rem',
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '1.2rem' }}>🏖️</span>
              <div>
                <p style={{ fontWeight: '700', fontSize: '0.85rem', color: '#dc2626', margin: '0 0 0.1rem' }}>
                  Cerrado por vacaciones
                </p>
                <p style={{ fontSize: '0.8rem', color: '#b91c1c', margin: 0, lineHeight: '1.4' }}>
                  {vacaciones.mensaje || `Estaremos de vacaciones del ${vacaciones.inicio} al ${vacaciones.fin}.`}
                </p>
              </div>
            </div>
          )}

          {/* Banner de aviso especial en vista previa */}
          {aviso.activo && aviso.texto?.trim() && (
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '0.8rem',
              padding: '0.75rem 1rem',
              marginBottom: '0.8rem',
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '1.2rem' }}>📢</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.1rem' }}>
                  <p style={{ fontWeight: '700', fontSize: '0.85rem', color: '#d97706', margin: 0 }}>
                    Aviso del comercio
                  </p>
                  {aviso.programar && (aviso.inicio || aviso.fin) && (
                    <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(245, 158, 11, 0.25)', color: '#b45309', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: '700' }}>
                      {aviso.inicio && aviso.fin ? `${aviso.inicio} al ${aviso.fin}` : (aviso.fin ? `Hasta ${aviso.fin}` : `Desde ${aviso.inicio}`)}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#b45309', margin: 0, lineHeight: '1.4' }}>
                  {aviso.texto}
                </p>
              </div>
            </div>
          )}

          {/* Botones de contacto en vista previa */}
          {(telefono.trim() || email.trim()) && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              {telefono.trim() && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#059669',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  padding: '0.35rem 0.7rem',
                  borderRadius: '1rem'
                }}>
                  <span>📞</span>
                  <span>{telefono}</span>
                </div>
              )}
              {email.trim() && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#2563eb',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  padding: '0.35rem 0.7rem',
                  borderRadius: '1rem'
                }}>
                  <span>✉️</span>
                  <span>{email}</span>
                </div>
              )}
            </div>
          )}

          {/* Horario de hoy en vista previa */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-card-alt)',
            padding: '0.65rem 0.9rem',
            borderRadius: '0.8rem',
            border: '1px solid var(--color-border)'
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text)' }}>
              🕒 Horario de hoy ({DIAS_SEMANA[(new Date().getDay() + 6) % 7].label}):
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-accent)', fontWeight: '700' }}>
              {horario[DIAS_SEMANA[(new Date().getDay() + 6) % 7].key] || 'No definido'}
            </span>
          </div>
        </div>

        {/* ── BOTÓN GUARDAR ── */}
        <button
          type="submit"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            padding: '1rem',
            borderRadius: '2rem',
            fontFamily: 'var(--font-main)',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
            transition: 'opacity 0.2s'
          }}
        >
          💾 Guardar Horarios y Avisos
        </button>

      </form>
    </div>
  );
};

const templateBtnStyle = {
  backgroundColor: 'var(--color-card-alt)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  padding: '0.3rem 0.6rem',
  borderRadius: '0.5rem',
  fontSize: '0.72rem',
  fontWeight: '600',
  cursor: 'pointer',
  fontFamily: 'var(--font-main)'
};

const fieldLabelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: '700',
  color: 'var(--color-text)',
  marginBottom: '0.3rem',
  fontFamily: 'var(--font-main)'
};

const inputStyle = {
  width: '100%',
  padding: '0.75rem 0.9rem',
  borderRadius: '0.7rem',
  border: '1px solid var(--color-border)',
  fontFamily: 'var(--font-main)',
  fontSize: '0.88rem',
  backgroundColor: 'var(--color-input-bg)',
  color: 'var(--color-text)',
  boxSizing: 'border-box',
  outline: 'none'
};

export default ComercioHorario;
