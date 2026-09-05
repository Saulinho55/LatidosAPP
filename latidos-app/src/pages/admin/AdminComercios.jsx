import React, { useEffect, useState } from 'react';
import { useLatidos } from '../../context/LatidosContext';

const AdminComercios = () => {
  const { fetchComercios, createComercio, updateComercio, deleteComercio } = useLatidos();
  const [comercios, setComercios] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '', categoria: '', direccion: '', lat: '', lon: '', 
    descuento: '', latidosNecesarios: '', color: '#5E000E', emoji: '🏪'
  });

  const loadComercios = async () => {
    const data = await fetchComercios();
    setComercios(data);
  };

  useEffect(() => {
    loadComercios();
  }, [fetchComercios]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSend = {
      ...formData,
      lat: parseFloat(formData.lat),
      lon: parseFloat(formData.lon),
      descuento: parseFloat(formData.descuento),
      latidosNecesarios: parseInt(formData.latidosNecesarios, 10),
      bonos: []
    };
    
    let success = false;
    if (editingId) {
      success = await updateComercio(editingId, dataToSend);
    } else {
      success = await createComercio(dataToSend);
    }
    
    if (success) {
      alert(`Comercio ${editingId ? 'actualizado' : 'añadido'} con éxito`);
      setShowForm(false);
      setEditingId(null);
      setFormData({ nombre: '', categoria: '', direccion: '', lat: '', lon: '', descuento: '', latidosNecesarios: '', color: '#5E000E', emoji: '🏪' });
      loadComercios();
    } else {
      alert('Error al guardar comercio');
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setFormData({
      nombre: c.nombre, categoria: c.categoria, direccion: c.direccion,
      lat: c.lat, lon: c.lon, descuento: c.descuento, latidosNecesarios: c.latidosNecesarios,
      color: c.color, emoji: c.emoji
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que quieres borrar este comercio?')) {
      const ok = await deleteComercio(id);
      if (ok) {
        loadComercios();
      } else {
        alert('Error al borrar comercio');
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-text)' }}>
          Comercios
        </h2>
        <button 
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingId(null);
              setFormData({ nombre: '', categoria: '', direccion: '', lat: '', lon: '', descuento: '', latidosNecesarios: '', color: '#5E000E', emoji: '🏪' });
            } else {
              setShowForm(true);
            }
          }}
          style={{
            backgroundColor: showForm ? 'var(--color-text-muted)' : 'var(--color-accent)',
            color: 'white',
            border: 'none',
            padding: '0.6rem 1rem',
            borderRadius: '2rem',
            fontFamily: 'var(--font-main)',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {showForm ? 'Cancelar' : '+ Añadir Comercio'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'var(--color-card)',
          padding: '1.5rem',
          borderRadius: '1.2rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
            {editingId ? 'Editar Comercio' : 'Nuevo Comercio'}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input required placeholder="Nombre" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} style={inputStyle} />
            <input required placeholder="Categoría" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} style={inputStyle} />
            <input required placeholder="Dirección" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1'}} />
            <input required type="number" step="any" placeholder="Latitud" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} style={inputStyle} />
            <input required type="number" step="any" placeholder="Longitud" value={formData.lon} onChange={e => setFormData({...formData, lon: e.target.value})} style={inputStyle} />
            <input required type="number" step="0.1" placeholder="Descuento (€)" value={formData.descuento} onChange={e => setFormData({...formData, descuento: e.target.value})} style={inputStyle} />
            <input required type="number" placeholder="Latidos Necesarios" value={formData.latidosNecesarios} onChange={e => setFormData({...formData, latidosNecesarios: e.target.value})} style={inputStyle} />
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input required type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '8px' }} />
              <input required placeholder="Emoji (ej: ☕)" value={formData.emoji} onChange={e => setFormData({...formData, emoji: e.target.value})} style={{...inputStyle, flex: 1}} />
            </div>
          </div>
          
          <button type="submit" style={{
            backgroundColor: 'var(--color-text)',
            color: 'var(--color-card)',
            border: 'none',
            padding: '1rem',
            borderRadius: '1rem',
            fontFamily: 'var(--font-main)',
            fontWeight: '700',
            cursor: 'pointer',
            marginTop: '0.5rem'
          }}>
            Guardar Comercio
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {comercios.map(c => (
          <div key={c.id} style={{
            backgroundColor: 'var(--color-card)',
            padding: '1rem',
            borderRadius: '1rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '45px', height: '45px',
              borderRadius: '50%',
              backgroundColor: c.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', flexShrink: 0, color: 'white'
            }}>
              {c.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: '600', color: 'var(--color-text)', fontSize: '1.05rem' }}>{c.nombre}</p>
              <p style={{ fontFamily: 'var(--font-main)', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{c.categoria} • {c.direccion}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: '700', color: 'var(--color-accent)' }}>-{c.descuento}€</p>
              <p style={{ fontFamily: 'var(--font-main)', color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{c.latidosNecesarios} ❤</p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button onClick={() => handleEdit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✏️</button>
                <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
        {comercios.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No hay comercios dados de alta.</p>
        )}
      </div>
    </div>
  );
};

const inputStyle = {
  padding: '0.8rem 1rem',
  borderRadius: '0.8rem',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-background)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-main)',
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
};

export default AdminComercios;
