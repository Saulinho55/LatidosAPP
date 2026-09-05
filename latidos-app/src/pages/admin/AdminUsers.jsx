import React, { useEffect, useState } from 'react';
import { useLatidos } from '../../context/LatidosContext';

const AdminUsers = () => {
  const { fetchAdminUsers, updateUser, deleteUser, user: currentUser } = useLatidos();
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  const loadUsers = async () => {
    const data = await fetchAdminUsers();
    setUsers(data);
  };

  useEffect(() => {
    loadUsers();
  }, [fetchAdminUsers]);

  const handleEdit = (u) => {
    setEditingId(u.id);
    setFormData({
      name: u.name,
      email: u.email,
      role: u.role,
      latidos: u.latidos,
      steps_today: u.steps_today,
      racha: u.racha
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const success = await updateUser(editingId, formData);
    if (success) {
      setEditingId(null);
      loadUsers();
    } else {
      alert('Error al actualizar el usuario');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que quieres eliminar este usuario permanentemente? Esta acción no se puede deshacer.')) {
      const ok = await deleteUser(id);
      if (ok) {
        loadUsers();
      }
    }
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
        Usuarios
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {users.map(u => (
          <div key={u.id} style={{
            backgroundColor: 'var(--color-card)',
            padding: '1.2rem',
            borderRadius: '1rem',
            boxShadow: 'var(--shadow-card)',
            borderLeft: u.role === 'admin' ? '4px solid var(--color-accent)' : '4px solid transparent'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text)' }}>
                  {u.name}
                  {u.role === 'admin' && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', backgroundColor: '#ffd700', padding: '0.1rem 0.4rem', borderRadius: '1rem', color: '#000', fontWeight: 'bold' }}>ADMIN</span>}
                </p>
                <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{u.email}</p>
              </div>
              <div style={{ backgroundColor: 'var(--color-card-alt)', padding: '0.4rem 0.8rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.9rem' }}>❤</span>
                <span style={{ fontFamily: 'var(--font-main)', fontWeight: '700', color: 'var(--color-text)', fontSize: '0.9rem' }}>{u.latidos}</span>
              </div>
            </div>
            
            {editingId === u.id ? (
              <form onSubmit={handleSave} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>Nombre <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} /></label>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>Email <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={inputStyle} /></label>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>Rol <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={inputStyle}><option value="user">User</option><option value="admin">Admin</option></select></label>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>Latidos <input required type="number" value={formData.latidos} onChange={e => setFormData({...formData, latidos: e.target.value})} style={inputStyle} /></label>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>Pasos Hoy <input required type="number" value={formData.steps_today} onChange={e => setFormData({...formData, steps_today: e.target.value})} style={inputStyle} /></label>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>Racha <input required type="number" value={formData.racha} onChange={e => setFormData({...formData, racha: e.target.value})} style={inputStyle} /></label>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setEditingId(null)} style={{ background: 'transparent', border: '1px solid var(--color-border)', padding: '0.5rem 1rem', borderRadius: '0.8rem', cursor: 'pointer', color: 'var(--color-text)' }}>Cancelar</button>
                  <button type="submit" style={{ background: 'var(--color-accent)', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.8rem', cursor: 'pointer', color: 'white', fontWeight: 'bold' }}>Guardar</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)' }}>Pasos hoy</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: '600', color: 'var(--color-text)' }}>{u.steps_today}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)' }}>Racha actual</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: '600', color: 'var(--color-text)' }}>{u.racha} días</p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)' }}>Registrado</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: '600', color: 'var(--color-text)' }}>{new Date(u.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={() => handleEdit(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✏️</button>
                  {u.id !== currentUser?.id && (
                    <button onClick={() => handleDelete(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>🗑️</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No hay usuarios.</p>
        )}
      </div>
    </div>
  );
};

const inputStyle = {
  padding: '0.4rem 0.6rem',
  borderRadius: '0.6rem',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-background)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-main)',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  marginTop: '0.2rem'
};

export default AdminUsers;
