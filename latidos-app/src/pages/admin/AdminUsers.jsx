import React, { useEffect, useState } from 'react';
import { useLatidos } from '../../context/LatidosContext';

const AdminUsers = () => {
  const { fetchAdminUsers, createUser, updateUser, deleteUser, fetchComercios, user: currentUser } = useLatidos();
  const [users, setUsers] = useState([]);
  const [comercios, setComercios] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    comercio_id: '',
    latidos: 0,
    steps_today: 0,
    racha: 0
  });

  const loadData = async () => {
    const [userData, comerciosData] = await Promise.all([
      fetchAdminUsers(),
      fetchComercios()
    ]);
    setUsers(userData);
    setComercios(comerciosData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (u) => {
    // If target user is superadmin and current user is NOT superadmin, prevent editing
    if (u.role === 'superadmin' && currentUser?.role !== 'superadmin') {
      alert('Los administradores no tienen permiso para modificar a un SuperAdministrador.');
      return;
    }

    setEditingId(u.id);
    setFormData({
      name: u.name,
      email: u.email,
      role: u.role,
      comercio_id: u.comercio_id || '',
      latidos: u.latidos,
      steps_today: u.steps_today,
      racha: u.racha
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role,
      comercio_id: formData.role === 'comercio' && formData.comercio_id ? parseInt(formData.comercio_id, 10) : null,
      latidos: formData.role === 'comercio' ? 0 : (formData.latidos === '' ? 0 : parseInt(formData.latidos, 10) || 0),
      steps_today: formData.role === 'comercio' ? 0 : (formData.steps_today === '' ? 0 : parseInt(formData.steps_today, 10) || 0),
      racha: formData.role === 'comercio' ? 0 : (formData.racha === '' ? 0 : parseInt(formData.racha, 10) || 0)
    };
    const res = await updateUser(editingId, payload);
    if (res?.success) {
      setEditingId(null);
      loadData();
    } else {
      alert(res?.error || 'Error al actualizar el usuario');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: newUserData.name.trim(),
      email: newUserData.email.trim().toLowerCase(),
      password: newUserData.password || 'demo123',
      role: newUserData.role,
      comercio_id: newUserData.role === 'comercio' && newUserData.comercio_id ? parseInt(newUserData.comercio_id, 10) : null,
      latidos: newUserData.role === 'comercio' ? 0 : (newUserData.latidos === '' ? 0 : parseInt(newUserData.latidos, 10) || 0),
      steps_today: newUserData.role === 'comercio' ? 0 : (newUserData.steps_today === '' ? 0 : parseInt(newUserData.steps_today, 10) || 0),
      racha: newUserData.role === 'comercio' ? 0 : (newUserData.racha === '' ? 0 : parseInt(newUserData.racha, 10) || 0)
    };
    const res = await createUser(payload);
    if (res?.success) {
      alert('Usuario creado correctamente');
      setShowCreateForm(false);
      setNewUserData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        comercio_id: '',
        latidos: 0,
        steps_today: 0,
        racha: 0
      });
      loadData();
    } else {
      alert(res?.error || 'Error al crear usuario');
    }
  };

  const handleDelete = async (u) => {
    if (u.role === 'superadmin' && currentUser?.role !== 'superadmin') {
      alert('Los administradores no pueden eliminar a un SuperAdministrador.');
      return;
    }

    if (window.confirm(`¿Seguro que quieres eliminar al usuario "${u.name}" permanentemente? Esta acción no se puede deshacer.`)) {
      const res = await deleteUser(u.id);
      if (res?.success) {
        loadData();
      } else {
        alert(res?.error || 'Error al eliminar usuario');
      }
    }
  };

  const isSuper = currentUser?.role === 'superadmin';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-text)' }}>
            Usuarios
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)' }}>
            Gestiona permisos, latidos, rachas y roles del sistema.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            backgroundColor: showCreateForm ? 'var(--color-text-muted)' : 'var(--color-accent)',
            color: 'white',
            border: 'none',
            padding: '0.6rem 1.1rem',
            borderRadius: '2rem',
            fontFamily: 'var(--font-main)',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s'
          }}
        >
          {showCreateForm ? '✕ Cancelar' : '+ Crear Usuario'}
        </button>
      </div>

      {/* ── Formulario de Creación de Usuario ── */}
      {showCreateForm && (
        <form onSubmit={handleCreateSubmit} style={{
          backgroundColor: 'var(--color-card)',
          padding: '1.5rem',
          borderRadius: '1.2rem',
          marginBottom: '1.8rem',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text)' }}>
              ➕ Nuevo Usuario
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)' }}>
              {isSuper ? '👑 Modo SuperAdmin' : '⚡ Modo Admin'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div>
              <label style={labelStyle}>Nombre completo *</label>
              <input
                required
                placeholder="Ej: Juan Pérez"
                value={newUserData.name}
                onChange={e => setNewUserData({...newUserData, name: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Correo electrónico *</label>
              <input
                required
                type="email"
                placeholder="ejemplo@latidos.app"
                value={newUserData.email}
                onChange={e => setNewUserData({...newUserData, email: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Contraseña inicial (7 a 22 caracteres)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showAdminPass ? 'text' : 'password'}
                  placeholder="Por defecto: demo123 (7-22 car.)"
                  minLength={7}
                  maxLength={22}
                  value={newUserData.password}
                  onChange={e => setNewUserData({...newUserData, password: e.target.value})}
                  style={{ ...inputStyle, paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPass(!showAdminPass)}
                  title={showAdminPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                  style={{
                    position: 'absolute',
                    right: '0.6rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem',
                    opacity: 0.8
                  }}
                >
                  {showAdminPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Rol del usuario *</label>
              <select
                value={newUserData.role}
                onChange={e => setNewUserData({...newUserData, role: e.target.value})}
                style={inputStyle}
              >
                <option value="user">👤 Usuario normal</option>
                <option value="comercio">🏪 Comercio asociado</option>
                <option value="admin">⚡ Administrador</option>
                {isSuper && <option value="superadmin">👑 SuperAdministrador</option>}
              </select>
            </div>

            {newUserData.role === 'comercio' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Vincular Comercio *</label>
                <select
                  required
                  value={newUserData.comercio_id}
                  onChange={e => setNewUserData({...newUserData, comercio_id: e.target.value})}
                  style={inputStyle}
                >
                  <option value="">-- Selecciona el comercio que administra --</option>
                  {comercios.map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.nombre} ({c.categoria})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Solo se muestran latidos, pasos y racha si el rol NO es comercio */}
            {newUserData.role !== 'comercio' && (
              <>
                <div>
                  <label style={labelStyle}>Latidos iniciales</label>
                  <input
                    type="number"
                    min="0"
                    value={newUserData.latidos}
                    onChange={e => setNewUserData({...newUserData, latidos: e.target.value})}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Pasos hoy</label>
                  <input
                    type="number"
                    min="0"
                    value={newUserData.steps_today}
                    onChange={e => setNewUserData({...newUserData, steps_today: e.target.value})}
                    style={inputStyle}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Racha de días</label>
                  <input
                    type="number"
                    min="0"
                    value={newUserData.racha}
                    onChange={e => setNewUserData({...newUserData, racha: e.target.value})}
                    style={inputStyle}
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              padding: '0.9rem',
              borderRadius: '1rem',
              fontFamily: 'var(--font-main)',
              fontWeight: '700',
              cursor: 'pointer',
              marginTop: '0.5rem'
            }}
          >
            Guardar y Crear Usuario
          </button>
        </form>
      )}

      {/* ── Listado de Usuarios ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {users.map(u => {
          const isTargetSuper = u.role === 'superadmin';
          const isTargetAdmin = u.role === 'admin';
          const isTargetComercio = u.role === 'comercio';
          const isSelf = u.id === currentUser?.id;
          const isUntouchable = isTargetSuper && !isSuper;
          const linkedComercio = isTargetComercio && comercios.find(c => Number(c.id) === Number(u.comercio_id));

          return (
            <div key={u.id} style={{
              backgroundColor: 'var(--color-card)',
              padding: '1.2rem',
              borderRadius: '1rem',
              boxShadow: 'var(--shadow-card)',
              borderLeft: isTargetSuper 
                ? '5px solid #eab308' 
                : (isTargetAdmin ? '4px solid var(--color-accent)' : (isTargetComercio ? '4px solid #10b981' : '4px solid transparent')),
              border: isTargetSuper ? '1.5px solid rgba(234, 179, 8, 0.4)' : '1px solid var(--color-border)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: '600', color: 'var(--color-text)' }}>
                      {u.name}
                    </p>
                    
                    {/* Role Badges */}
                    {isTargetSuper && (
                      <span style={{
                        fontSize: '0.72rem',
                        background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                        color: '#000',
                        fontWeight: '800',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '1rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        boxShadow: '0 2px 6px rgba(234,179,8,0.3)'
                      }}>
                        👑 SUPERADMIN
                      </span>
                    )}

                    {isTargetAdmin && (
                      <span style={{
                        fontSize: '0.72rem',
                        backgroundColor: 'var(--color-accent)',
                        color: 'white',
                        fontWeight: '700',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '1rem'
                      }}>
                        ⚡ ADMIN
                      </span>
                    )}

                    {isTargetComercio && (
                      <span style={{
                        fontSize: '0.72rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        fontWeight: '700',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '1rem'
                      }}>
                        🏪 COMERCIO
                      </span>
                    )}

                    {!isTargetSuper && !isTargetAdmin && !isTargetComercio && (
                      <span style={{
                        fontSize: '0.72rem',
                        backgroundColor: 'var(--color-card-alt)',
                        color: 'var(--color-text-muted)',
                        fontWeight: '600',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '1rem'
                      }}>
                        👤 USUARIO
                      </span>
                    )}

                    {isSelf && (
                      <span style={{
                        fontSize: '0.68rem',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        color: '#3b82f6',
                        fontWeight: '700',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '1rem'
                      }}>
                        (Tú)
                      </span>
                    )}
                  </div>
                  
                  <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                    {u.email}
                  </p>
                </div>

                {!isTargetComercio ? (
                  <div style={{ backgroundColor: 'var(--color-card-alt)', padding: '0.4rem 0.8rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.9rem' }}>❤</span>
                    <span style={{ fontFamily: 'var(--font-main)', fontWeight: '700', color: 'var(--color-text)', fontSize: '0.9rem' }}>{u.latidos || 0}</span>
                  </div>
                ) : (
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.82rem', fontWeight: '700' }}>
                    🏪 {linkedComercio ? linkedComercio.nombre : 'Comercio'}
                  </div>
                )}
              </div>

              {/* ── Formulario de Edición ── */}
              {editingId === u.id ? (
                <form onSubmit={handleSave} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <div>
                      <label style={labelStyle}>Nombre</label>
                      <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: formData.role === 'comercio' ? '1 / 2' : 'auto' }}>
                      <label style={labelStyle}>Rol</label>
                      <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={inputStyle}>
                        <option value="user">Usuario</option>
                        <option value="comercio">Comercio</option>
                        <option value="admin">Administrador</option>
                        {isSuper && <option value="superadmin">SuperAdministrador</option>}
                      </select>
                    </div>

                    {formData.role === 'comercio' && (
                      <div>
                        <label style={labelStyle}>Comercio asignado</label>
                        <select value={formData.comercio_id || ''} onChange={e => setFormData({...formData, comercio_id: e.target.value})} style={inputStyle}>
                          <option value="">-- Ninguno --</option>
                          {comercios.map(c => (
                            <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formData.role !== 'comercio' && (
                      <>
                        <div>
                          <label style={labelStyle}>Latidos</label>
                          <input required type="number" value={formData.latidos} onChange={e => setFormData({...formData, latidos: e.target.value})} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Pasos Hoy</label>
                          <input required type="number" value={formData.steps_today} onChange={e => setFormData({...formData, steps_today: e.target.value})} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Racha</label>
                          <input required type="number" value={formData.racha} onChange={e => setFormData({...formData, racha: e.target.value})} style={inputStyle} />
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="button" onClick={() => setEditingId(null)} style={{ background: 'transparent', border: '1px solid var(--color-border)', padding: '0.5rem 1rem', borderRadius: '0.8rem', cursor: 'pointer', color: 'var(--color-text)' }}>Cancelar</button>
                    <button type="submit" style={{ background: 'var(--color-accent)', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.8rem', cursor: 'pointer', color: 'white', fontWeight: 'bold' }}>Guardar Cambios</button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', alignItems: 'center' }}>
                  {isTargetComercio ? (
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)' }}>Comercio Vinculado</p>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: '600', color: 'var(--color-text)', fontSize: '0.95rem' }}>
                        {linkedComercio ? `${linkedComercio.emoji} ${linkedComercio.nombre} (${linkedComercio.categoria})` : 'Sin comercio asignado'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)' }}>Pasos hoy</p>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: '600', color: 'var(--color-text)' }}>{u.steps_today || 0}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)' }}>Racha</p>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: '600', color: 'var(--color-text)' }}>{u.racha || 0} d</p>
                      </div>
                    </>
                  )}
                  <div style={{ flex: isTargetComercio ? 0 : 1 }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)' }}>Registrado</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: '600', color: 'var(--color-text)', fontSize: '0.85rem' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Activo'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {isUntouchable ? (
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#ca8a04',
                        backgroundColor: 'rgba(234, 179, 8, 0.1)',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '1rem',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}>
                        🔒 Intocable
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(u)}
                          title="Editar usuario"
                          style={{
                            background: 'var(--color-card-alt)',
                            border: '1px solid var(--color-border)',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '0.6rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          ✏️
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => handleDelete(u)}
                            title="Eliminar usuario"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '0.6rem',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              color: '#ef4444'
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {users.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>No hay usuarios dados de alta.</p>
        )}
      </div>
    </div>
  );
};

const labelStyle = {
  fontSize: '0.78rem',
  fontWeight: '600',
  color: 'var(--color-text)',
  display: 'block',
  marginBottom: '0.2rem',
  fontFamily: 'var(--font-main)'
};

const inputStyle = {
  padding: '0.55rem 0.75rem',
  borderRadius: '0.7rem',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-input-bg)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-main)',
  fontSize: '0.88rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
};

export default AdminUsers;
