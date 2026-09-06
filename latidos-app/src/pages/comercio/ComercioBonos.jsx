import React, { useEffect, useState } from 'react';
import { useLatidos } from '../../context/LatidosContext';

const ComercioBonos = () => {
  const { user, fetchComercios, updateComercioBonos } = useLatidos();
  const [bonos, setBonos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [newBono, setNewBono] = useState({ titulo: '', descripcion: '', coste: 100 });

  useEffect(() => {
    loadBonos();
  }, [user]);

  const loadBonos = async () => {
    try {
      const all = await fetchComercios();
      let mine = null;
      if (user?.comercio_id) {
        mine = all.find(c => Number(c.id) === Number(user.comercio_id));
      }
      if (!mine && user) {
        mine = all.find(c =>
          (c.email && user.email && c.email.toLowerCase() === user.email.toLowerCase()) ||
          (c.nombre && user.name && c.nombre.toLowerCase() === user.name.toLowerCase())
        );
      }
      if (!mine && all.length > 0) {
        mine = all[0];
      }
      if (mine && mine.bonos) {
        setBonos(Array.isArray(mine.bonos) ? mine.bonos : (typeof mine.bonos === 'string' ? JSON.parse(mine.bonos || '[]') : []));
      }
    } catch (e) {
      console.error('Error loading bonos:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const updated = [...bonos, {
      titulo: newBono.titulo,
      descripcion: `Coste para el vecino: ${newBono.coste} Latidos`,
      coste: parseInt(newBono.coste, 10) || 100
    }];
    const success = await updateComercioBonos(updated);
    if (success) {
      setBonos(updated);
      setIsEditing(false);
      setNewBono({ titulo: '', descripcion: '', coste: 100 });
    }
  };

  const handleDelete = async (index) => {
    if (window.confirm('¿Seguro que quieres borrar este bono?')) {
      const updated = bonos.filter((_, i) => i !== index);
      const success = await updateComercioBonos(updated);
      if (success) {
        setBonos(updated);
      }
    }
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Cargando bonos...</p>;

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-text)', fontWeight: '700', margin: 0 }}>
            Bonos que ofrezco
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
            Los vecinos podrán canjear sus Latidos por estos descuentos en tu tienda.
          </p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1.1rem',
              borderRadius: '1.5rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-main)',
              fontWeight: '700',
              fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
            + Añadir bono
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleAdd} style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1.2rem', marginBottom: '1.8rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text)', margin: '0 0 1rem' }}>
            Crear nuevo bono
          </h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text)', fontWeight: '700', marginBottom: '0.4rem' }}>
              Título del descuento (Ej: 2,50 € de descuento)
            </label>
            <input
              required
              value={newBono.titulo}
              onChange={e => setNewBono({...newBono, titulo: e.target.value})}
              placeholder="Ej: 3 € de descuento en compra superior a 15 €"
              style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: '0.7rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text)', fontWeight: '700', marginBottom: '0.4rem' }}>
              Coste en Latidos ❤
            </label>
            <input
              required
              type="number"
              value={newBono.coste}
              onChange={e => setNewBono({...newBono, coste: e.target.value})}
              style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: '0.7rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)', padding: '0.5rem 1rem', borderRadius: '1rem', cursor: 'pointer', color: 'var(--color-text)', fontWeight: '600' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ background: 'var(--color-accent)', color: 'white', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '1rem', cursor: 'pointer', fontWeight: '700' }}
            >
              Guardar Bono
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {bonos.length === 0 && (
          <div style={{ backgroundColor: 'var(--color-card)', padding: '2rem', borderRadius: '1.2rem', textAlign: 'center', border: '1px solid var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No tienes bonos activos actualmente.</p>
          </div>
        )}
        {bonos.map((bono, idx) => (
          <div key={idx} style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '1.2rem',
            padding: '1.1rem 1.3rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--shadow-card)',
            gap: '0.8rem'
          }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text)', margin: '0 0 0.2rem', fontWeight: '700' }}>
                {bono.titulo}
              </h3>
              <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
                {bono.descripcion || `Coste: ${bono.coste} Latidos`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669', padding: '0.3rem 0.8rem', borderRadius: '1.5rem', fontSize: '0.78rem', fontWeight: '700' }}>
                Activo
              </span>
              <button
                onClick={() => handleDelete(idx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0.4rem', opacity: 0.7 }}
                title="Eliminar bono"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComercioBonos;
