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
    if (!user?.comercio_id) return;
    // We fetch all comercios and find ours to get the bonos
    // Alternatively we could have a specific endpoint, but this is fine for now
    const all = await fetchComercios();
    const mine = all.find(c => c.id === user.comercio_id);
    if (mine && mine.bonos) {
      setBonos(mine.bonos);
    }
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const updated = [...bonos, {
      titulo: newBono.titulo,
      descripcion: `Coste para el vecino: ${newBono.coste} Latidos`,
      coste: newBono.coste
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

  if (loading) return <p>Cargando...</p>;

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-header-bg)', fontWeight: '600', margin: 0 }}>
          Bonos que ofrezco
        </h2>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            style={{
              backgroundColor: 'var(--color-header-bg)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '1rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-main)'
            }}>
            + Añadir bono
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleAdd} style={{ backgroundColor: '#FCECEE', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-header-bg)', fontWeight: '600', marginBottom: '0.5rem' }}>Título (Ej: 2 € de descuento)</label>
            <input required value={newBono.titulo} onChange={e => setNewBono({...newBono, titulo: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #E8C8CB' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-header-bg)', fontWeight: '600', marginBottom: '0.5rem' }}>Coste en Latidos</label>
            <input required type="number" value={newBono.coste} onChange={e => setNewBono({...newBono, coste: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #E8C8CB' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setIsEditing(false)} style={{ background: 'none', border: '1px solid var(--color-header-bg)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ background: 'var(--color-header-bg)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}>Guardar</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {bonos.length === 0 && <p style={{ color: '#6b4f53' }}>No tienes bonos activos.</p>}
        {bonos.map((bono, idx) => (
          <div key={idx} style={{
            backgroundColor: '#F5D3D6',
            borderRadius: '1rem',
            padding: '1.2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-header-bg)', margin: '0 0 0.3rem' }}>
                {bono.titulo}
              </h3>
              <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.85rem', color: '#6b4f53', margin: 0 }}>
                {bono.descripcion}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ backgroundColor: '#A4777C', color: 'white', padding: '0.3rem 1rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: '600' }}>
                Activo
              </span>
              <button onClick={() => handleDelete(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}>
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
