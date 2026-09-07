import React, { useState, useEffect } from 'react';
import { useLatidos } from '../../context/LatidosContext';
import { getComerciosProductsList } from '../../data/defaultProducts';

const CATEGORIAS_PRESET = ['General', 'Desayunos', 'Comida', 'Bebidas', 'Postres', 'Panadería', 'Libros', 'Accesorios', 'Moda', 'Peluquería', 'Tratamientos', 'Cosmética Natural', 'Alimentación Bio', 'Servicios'];

const ComercioProductos = () => {
  const { user, fetchComercios, updateComercioProductos } = useLatidos();
  const [comercio, setComercio] = useState(null);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos'); // 'todos', 'ofertas', 'productos', 'servicios', 'packs'

  // Modal / Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    tipo: 'Producto',
    categoria: 'General',
    descripcion: '',
    precioOriginal: '',
    enOferta: false,
    precioRebajado: '',
    badge: 'Oferta',
    emoji: '',
    imagen: '',
    disponible: true,
    latidosDescuento: ''
  });

  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadCommerceData();
  }, [user]);

  const loadCommerceData = async () => {
    try {
      const all = await fetchComercios();
      const targetComercioId = user?.comercio_id || 1;
      const mine = all.find(c => Number(c.id) === Number(targetComercioId)) || all[0];
      if (mine) {
        setComercio(mine);
        const prods = getComerciosProductsList(mine.id, mine);
        setProductos(prods || []);
      }
    } catch (e) {
      console.error('Error loading products:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingIndex(-1);
    setFormData({
      id: `prod-${Date.now()}`,
      nombre: '',
      tipo: 'Producto',
      categoria: 'General',
      descripcion: '',
      precioOriginal: '',
      enOferta: false,
      precioRebajado: '',
      badge: '-20%',
      emoji: '',
      imagen: '',
      disponible: true,
      latidosDescuento: ''
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (prod, index) => {
    setEditingIndex(index);
    setFormData({
      id: prod.id || `prod-${Date.now()}`,
      nombre: prod.nombre || '',
      tipo: prod.tipo || 'Producto',
      categoria: prod.categoria || 'General',
      descripcion: prod.descripcion || '',
      precioOriginal: prod.precioOriginal !== undefined ? String(prod.precioOriginal) : '',
      enOferta: Boolean(prod.enOferta),
      precioRebajado: prod.precioRebajado !== undefined && prod.precioRebajado !== null ? String(prod.precioRebajado) : '',
      badge: prod.badge || '',
      emoji: prod.emoji || '',
      imagen: prod.imagen || '',
      disponible: prod.disponible !== false,
      latidosDescuento: prod.latidosDescuento !== undefined ? String(prod.latidosDescuento) : ''
    });
    setIsEditing(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.precioOriginal) return;

    const parsedOrig = parseFloat(formData.precioOriginal) || 0;
    const parsedReb = formData.enOferta && formData.precioRebajado ? parseFloat(formData.precioRebajado) : null;

    const newProd = {
      ...formData,
      nombre: formData.nombre.trim(),
      precioOriginal: parsedOrig,
      precioRebajado: parsedReb,
      latidosDescuento: formData.latidosDescuento ? parseInt(formData.latidosDescuento, 10) : null
    };

    let updatedList = [];
    if (editingIndex >= 0) {
      updatedList = productos.map((p, i) => i === editingIndex ? newProd : p);
    } else {
      updatedList = [newProd, ...productos];
    }

    setProductos(updatedList);
    setIsEditing(false);

    const targetId = comercio?.id || user?.comercio_id || 1;
    await updateComercioProductos(targetId, updatedList);

    setSuccessMsg(editingIndex >= 0 ? 'Artículo actualizado correctamente.' : 'Nuevo artículo añadido al catálogo.');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleToggleDisponible = async (index) => {
    const updatedList = productos.map((p, i) => {
      if (i === index) return { ...p, disponible: p.disponible === false ? true : false };
      return p;
    });
    setProductos(updatedList);
    const targetId = comercio?.id || user?.comercio_id || 1;
    await updateComercioProductos(targetId, updatedList);
  };

  const handleDeleteProduct = async (index) => {
    const prod = productos[index];
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${prod.nombre}" del catálogo?`)) {
      const updatedList = productos.filter((_, i) => i !== index);
      setProductos(updatedList);
      const targetId = comercio?.id || user?.comercio_id || 1;
      await updateComercioProductos(targetId, updatedList);
    }
  };

  // Filtered list
  const filteredProducts = productos.filter(p => {
    if (filter === 'ofertas') return p.enOferta;
    if (filter === 'productos') return p.tipo === 'Producto';
    if (filter === 'servicios') return p.tipo === 'Servicio';
    if (filter === 'packs') return p.tipo === 'Menú / Pack';
    return true;
  });

  const totalOfertas = productos.filter(p => p.enOferta).length;
  const totalServicios = productos.filter(p => p.tipo === 'Servicio').length;

  if (loading) {
    return <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-main)' }}>Cargando catálogo...</p>;
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-text)', fontWeight: '700', margin: 0 }}>
            Productos & Servicios
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0', fontFamily: 'var(--font-main)' }}>
            Gestión del catálogo comercial y promociones disponibles para tus clientes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowPreviewModal(true)}
            style={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              padding: '0.5rem 0.9rem',
              borderRadius: '1.5rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            Vista previa
          </button>

          <button
            onClick={handleOpenNew}
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1.1rem',
              borderRadius: '1.5rem',
              fontFamily: 'var(--font-main)',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            + Nuevo artículo
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          color: '#059669',
          padding: '0.8rem 1.2rem',
          borderRadius: '0.9rem',
          marginBottom: '1.2rem',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          fontWeight: '700',
          fontSize: '0.88rem'
        }}>
          {successMsg}
        </div>
      )}

      {/* Summary KPI Badges */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.6rem',
        marginBottom: '1.4rem'
      }}>
        <div style={kpiBoxStyle}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Total Catálogo</span>
          <p style={kpiNumberStyle}>{productos.length}</p>
        </div>
        <div style={{ ...kpiBoxStyle, borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>En Oferta</span>
          <p style={{ ...kpiNumberStyle, color: '#dc2626' }}>{totalOfertas}</p>
        </div>
        <div style={{ ...kpiBoxStyle, borderLeft: '4px solid #3b82f6' }}>
          <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '700' }}>Servicios</span>
          <p style={{ ...kpiNumberStyle, color: '#2563eb' }}>{totalServicios}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.4rem',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        marginBottom: '1.2rem',
        paddingBottom: '0.2rem'
      }}>
        {[
          { key: 'todos', label: `Todos (${productos.length})` },
          { key: 'ofertas', label: `Promociones & Descuentos (${totalOfertas})` },
          { key: 'productos', label: 'Productos' },
          { key: 'servicios', label: 'Servicios' },
          { key: 'packs', label: 'Menús & Packs' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '1.5rem',
              border: filter === tab.key ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
              backgroundColor: filter === tab.key ? 'var(--color-accent)' : 'var(--color-card)',
              color: filter === tab.key ? '#fff' : 'var(--color-text)',
              fontSize: '0.78rem',
              fontWeight: filter === tab.key ? '700' : '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: filter === tab.key ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── FORM MODAL / DRAWER ── */}
      {isEditing && (
        <div style={{
          backgroundColor: 'var(--color-card)',
          borderRadius: '1.4rem',
          padding: '1.5rem',
          border: '1.5px solid var(--color-accent)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '1.8rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--color-text)', margin: 0, fontWeight: '700' }}>
              {editingIndex >= 0 ? 'Editar artículo o servicio' : 'Nuevo producto / servicio'}
            </h3>
            <button
              onClick={() => setIsEditing(false)}
              style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Nombre */}
            <div>
              <label style={fieldLabelStyle}>Nombre del Producto / Servicio *</label>
              <input
                required
                placeholder="Ej: Menú Brunch Completo / Limpieza Facial / Camiseta Algodón"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                style={inputStyle}
              />
            </div>

            {/* Tipo y Categoría */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>
                <label style={fieldLabelStyle}>Tipo</label>
                <select
                  value={formData.tipo}
                  onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Producto">Producto</option>
                  <option value="Servicio">Servicio</option>
                  <option value="Menú / Pack">Menú / Pack</option>
                  <option value="Promoción especial">Promoción especial</option>
                </select>
              </div>

              <div>
                <label style={fieldLabelStyle}>Categoría</label>
                <input
                  list="categorias-list"
                  placeholder="Ej: Desayunos, Ropa..."
                  value={formData.categoria}
                  onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                  style={inputStyle}
                />
                <datalist id="categorias-list">
                  {CATEGORIAS_PRESET.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label style={fieldLabelStyle}>Descripción breve / Detalles</label>
              <textarea
                rows="2"
                placeholder="Ingredientes, duración del servicio, qué incluye la oferta..."
                value={formData.descripcion}
                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Precios & Oferta */}
            <div style={{
              backgroundColor: 'var(--color-card-alt)',
              padding: '1rem',
              borderRadius: '1rem',
              border: '1px solid var(--color-border)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                <div>
                  <label style={fieldLabelStyle}>Precio habitual / Original (€) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.precioOriginal}
                    onChange={e => setFormData({ ...formData, precioOriginal: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', color: 'var(--color-text)', marginTop: '0.6rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.enOferta}
                      onChange={e => setFormData({ ...formData, enOferta: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
                    />
                    Artículo en oferta / rebajado
                  </label>
                </div>
              </div>

              {formData.enOferta && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.8rem' }}>
                  <div>
                    <label style={{ ...fieldLabelStyle, color: '#dc2626' }}>Precio de oferta (€) *</label>
                    <input
                      required={formData.enOferta}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.precioRebajado}
                      onChange={e => setFormData({ ...formData, precioRebajado: e.target.value })}
                      style={{ ...inputStyle, borderColor: '#ef4444', fontWeight: '700' }}
                    />
                  </div>
                  <div>
                    <label style={{ ...fieldLabelStyle, color: '#dc2626' }}>Etiqueta de descuento</label>
                    <input
                      placeholder="Ej: -25%, 2x1, Promo Vecinal"
                      value={formData.badge}
                      onChange={e => setFormData({ ...formData, badge: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Disponibilidad */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text)' }}>
                <input
                  type="checkbox"
                  checked={formData.disponible}
                  onChange={e => setFormData({ ...formData, disponible: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
                />
                Artículo disponible en el catálogo
              </label>
              <span style={{ fontSize: '0.75rem', color: formData.disponible ? '#059669' : '#dc2626', fontWeight: '700' }}>
                {formData.disponible ? 'Disponible' : 'Agotado'}
              </span>
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)', padding: '0.6rem 1.1rem', borderRadius: '1.2rem', cursor: 'pointer', color: 'var(--color-text)', fontWeight: '600' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ background: 'var(--color-accent)', color: 'white', border: 'none', padding: '0.6rem 1.4rem', borderRadius: '1.2rem', cursor: 'pointer', fontWeight: '700', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
              >
                Guardar artículo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── LISTADO DE PRODUCTOS Y SERVICIOS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {filteredProducts.length === 0 ? (
          <div style={{ backgroundColor: 'var(--color-card)', padding: '2.5rem 1.5rem', borderRadius: '1.2rem', textAlign: 'center', border: '1px solid var(--color-border)' }}>
            <p style={{ color: 'var(--color-text)', fontWeight: '700', margin: 0 }}>No hay artículos en esta categoría.</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '0.3rem 0 1rem' }}>
              Añade productos o promociones para que tus clientes puedan consultar tu catálogo desde la app.
            </p>
            <button
              onClick={handleOpenNew}
              style={{ backgroundColor: 'var(--color-accent)', color: 'white', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '1.2rem', fontWeight: '700', cursor: 'pointer' }}
            >
              + Añadir primer artículo
            </button>
          </div>
        ) : (
          filteredProducts.map((prod, idx) => {
            const isPromo = prod.enOferta && prod.precioRebajado;
            const originalPrice = parseFloat(prod.precioOriginal) || 0;
            const salePrice = isPromo ? parseFloat(prod.precioRebajado) : null;
            const realIndex = productos.findIndex(p => p.id === prod.id);

            return (
              <div
                key={prod.id || idx}
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderRadius: '1.2rem',
                  padding: '1rem 1.2rem',
                  border: isPromo ? '1.5px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  opacity: prod.disponible === false ? 0.6 : 1,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Initial Badge / Category Icon */}
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '0.8rem',
                  backgroundColor: isPromo ? 'rgba(239, 68, 68, 0.12)' : 'var(--color-card-alt)',
                  color: isPromo ? '#dc2626' : 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                  flexShrink: 0,
                  border: '1px solid var(--color-border)'
                }}>
                  {prod.nombre ? prod.nombre.slice(0, 2).toUpperCase() : 'PR'}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.68rem', backgroundColor: 'var(--color-card-alt)', color: 'var(--color-text-muted)', padding: '0.1rem 0.4rem', borderRadius: '0.8rem', fontWeight: '700', border: '1px solid var(--color-border)' }}>
                      {prod.categoria || prod.tipo}
                    </span>
                    {isPromo && (
                      <span style={{ fontSize: '0.68rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.1rem 0.45rem', borderRadius: '0.8rem', fontWeight: '800' }}>
                        {prod.badge || 'OFERTA'}
                      </span>
                    )}
                    {prod.disponible === false && (
                      <span style={{ fontSize: '0.68rem', backgroundColor: '#f3f4f6', color: '#6b7280', padding: '0.1rem 0.4rem', borderRadius: '0.8rem', fontWeight: '600' }}>
                        Agotado
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--color-text)', margin: '0 0 0.2rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {prod.nombre}
                  </h3>

                  {prod.descripcion && (
                    <p style={{ fontFamily: 'var(--font-main)', fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 0.4rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {prod.descripcion}
                    </p>
                  )}

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    {isPromo ? (
                      <>
                        <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
                          {salePrice.toFixed(2)} €
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                          {originalPrice.toFixed(2)} €
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                        {originalPrice.toFixed(2)} €
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      onClick={() => handleToggleDisponible(realIndex)}
                      title={prod.disponible === false ? 'Marcar como disponible' : 'Marcar como agotado'}
                      style={{
                        background: 'var(--color-card-alt)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.6rem',
                        padding: '0.3rem 0.5rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        color: prod.disponible === false ? '#6b7280' : '#059669',
                        cursor: 'pointer'
                      }}
                    >
                      {prod.disponible === false ? 'Pausado' : 'Activo'}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(prod, realIndex)}
                      title="Editar artículo"
                      style={{
                        background: 'var(--color-card-alt)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.6rem',
                        padding: '0.3rem 0.5rem',
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        color: 'var(--color-text)',
                        cursor: 'pointer'
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(realIndex)}
                      title="Eliminar artículo"
                      style={{
                        background: 'var(--color-card-alt)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.6rem',
                        padding: '0.3rem 0.5rem',
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        color: '#ef4444',
                        cursor: 'pointer'
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── LIVE PREVIEW MODAL ── */}
      {showPreviewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--color-card)',
            borderRadius: '1.5rem',
            width: '100%',
            maxWidth: '460px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            border: '1px solid var(--color-border)'
          }}>
            {/* Header with back arrow */}
            <div style={{
              padding: '1rem 1.2rem',
              backgroundColor: 'var(--color-card-alt)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  style={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text)'
                  }}
                  title="Volver"
                >
                  ←
                </button>
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                    Catálogo del Comercio
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text)', margin: 0, fontWeight: '700' }}>
                    {comercio?.nombre || 'Mi Negocio'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Content preview */}
            <div style={{ padding: '1.2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ backgroundColor: 'rgba(94, 0, 14, 0.06)', padding: '0.8rem 1rem', borderRadius: '0.9rem', border: '1px solid var(--color-border)', marginBottom: '0.4rem' }}>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text)', fontWeight: '600' }}>
                  Vista previa de cómo los clientes ven tu catálogo en la aplicación.
                </p>
              </div>

              {productos.map(p => {
                const isPromo = p.enOferta && p.precioRebajado;
                return (
                  <div key={p.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    backgroundColor: 'var(--color-card-alt)',
                    padding: '0.8rem 1rem',
                    borderRadius: '1rem',
                    border: '1px solid var(--color-border)'
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', width: '38px', height: '38px', borderRadius: '0.6rem', backgroundColor: 'var(--color-card)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--color-border)' }}>
                      {p.nombre ? p.nombre.slice(0, 2).toUpperCase() : 'PR'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '0.95rem', color: 'var(--color-text)', margin: 0 }}>
                          {p.nombre}
                        </p>
                        {isPromo && (
                          <span style={{ fontSize: '0.62rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.05rem 0.35rem', borderRadius: '0.5rem', fontWeight: '800' }}>
                            {p.badge || 'OFERTA'}
                          </span>
                        )}
                      </div>
                      {p.descripcion && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.1rem 0' }}>{p.descripcion}</p>}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.2rem' }}>
                        {isPromo ? (
                          <>
                            <span style={{ fontWeight: '800', color: 'var(--color-accent)', fontSize: '0.95rem' }}>{parseFloat(p.precioRebajado).toFixed(2)} €</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>{parseFloat(p.precioOriginal).toFixed(2)} €</span>
                          </>
                        ) : (
                          <span style={{ fontWeight: '800', color: 'var(--color-text)', fontSize: '0.95rem' }}>{parseFloat(p.precioOriginal).toFixed(2)} €</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const kpiBoxStyle = {
  backgroundColor: 'var(--color-card)',
  borderRadius: '1rem',
  padding: '0.8rem 1rem',
  border: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-card)'
};

const kpiNumberStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '1.5rem',
  fontWeight: '700',
  color: 'var(--color-text)',
  margin: '0.2rem 0 0',
  lineHeight: 1
};

const fieldLabelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: '700',
  color: 'var(--color-text)',
  marginBottom: '0.35rem',
  fontFamily: 'var(--font-main)'
};

const inputStyle = {
  width: '100%',
  padding: '0.7rem 0.85rem',
  borderRadius: '0.75rem',
  border: '1px solid var(--color-border)',
  fontFamily: 'var(--font-main)',
  fontSize: '0.85rem',
  backgroundColor: 'var(--color-input-bg)',
  color: 'var(--color-text)',
  boxSizing: 'border-box',
  outline: 'none'
};

export default ComercioProductos;
