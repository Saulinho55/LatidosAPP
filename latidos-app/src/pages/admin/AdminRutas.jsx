import React, { useState, useEffect, useMemo } from 'react';
import { useLatidos } from '../../context/LatidosContext';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Leaflet point markers
const createPointMarker = (num = 1) => L.divIcon({
  className: 'custom-admin-point-marker',
  html: `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      cursor: pointer;
    ">
      <div style="
        background: linear-gradient(135deg, #22c55e, #15803d);
        color: white;
        min-width: 30px;
        height: 30px;
        padding: 0 6px;
        border-radius: 15px;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 0.8rem;
        box-shadow: 0 4px 10px rgba(22, 163, 74, 0.4);
      ">
        📍 ${num}
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid #15803d;
        margin-top: -1px;
      "></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  popupAnchor: [0, -32]
});

const startMarkerIcon = L.divIcon({
  className: 'custom-start-marker',
  html: `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
    ">
      <div style="
        background: #22c55e;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        border: 2px solid white;
        font-weight: 800;
        font-size: 0.75rem;
        box-shadow: 0 3px 10px rgba(34, 197, 94, 0.4);
        white-space: nowrap;
      ">
        🚩 Inicio
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid #22c55e;
        margin-top: -1px;
      "></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  popupAnchor: [0, -30]
});

const endMarkerIcon = L.divIcon({
  className: 'custom-end-marker',
  html: `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
    ">
      <div style="
        background: #0f172a;
        color: #22c55e;
        padding: 4px 8px;
        border-radius: 12px;
        border: 2px solid #22c55e;
        font-weight: 800;
        font-size: 0.75rem;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        white-space: nowrap;
      ">
        🏁 Meta
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid #0f172a;
        margin-top: -1px;
      "></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  popupAnchor: [0, -30]
});

// Calculate distance in meters
const haversineDist = (posA, posB) => {
  if (!posA || !posB) return 0;
  const lat1 = posA.lat !== undefined ? posA.lat : posA[0];
  const lon1 = posA.lon !== undefined ? posA.lon : posA[1];
  const lat2 = posB.lat !== undefined ? posB.lat : posB[0];
  const lon2 = posB.lon !== undefined ? posB.lon : posB[1];
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;

  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c = 2 * Math.asin(Math.sqrt(sinLat * sinLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLon * sinLon));
  return R * c;
};

// Compute total route length in meters
const computePathDistance = (path) => {
  if (!path || path.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    total += haversineDist(path[i], path[i + 1]);
  }
  return total;
};

const formatTime = (seconds) => {
  const m = Math.floor((seconds || 0) / 60);
  const s = Math.floor((seconds || 0) % 60).toString().padStart(2, '0');
  return `${m}m ${s}s`;
};

// Safe parsers
const getSafePath = (rt) => {
  if (!rt) return [];
  if (Array.isArray(rt.path)) return rt.path;
  if (typeof rt.path === 'string') {
    try {
      const parsed = JSON.parse(rt.path);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

const getSafePoints = (rt) => {
  if (!rt) return [];
  if (Array.isArray(rt.points)) return rt.points;
  if (typeof rt.points === 'string') {
    try {
      const parsed = JSON.parse(rt.points);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

// Map click listener for interactive route creation
const MapEditorEvents = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lon: e.latlng.lng });
    }
  });
  return null;
};

const AdminRutas = () => {
  const { fetchRecommendedRoutes, addRecommendedRoute, updateRecommendedRoute, deleteRecommendedRoute, recommendedRoutes } = useLatidos();
  
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    distanceKm: '1.50',
    durationMin: '20',
    latidosEarned: '20',
    path: [],
    points: []
  });

  const [addMode, setAddMode] = useState('path'); // 'path' or 'checkpoint'
  const [tempCheckpointName, setTempCheckpointName] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await fetchRecommendedRoutes();
    setRoutes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMapClick = (coords) => {
    if (addMode === 'checkpoint') {
      const pointName = tempCheckpointName.trim() || `Punto ${formData.points.length + 1}`;
      const newPoint = { lat: coords.lat, lon: coords.lon, name: pointName };
      const updatedPoints = [...formData.points, newPoint];
      const updatedPath = [...formData.path, { lat: coords.lat, lon: coords.lon }];
      
      const newDistM = computePathDistance(updatedPath);
      const newDistKm = (newDistM / 1000).toFixed(2);
      const newDurationMin = Math.max(5, Math.round((newDistM / 1000) * 12)).toString();
      const newLatidos = Math.max(5, Math.floor((newDistM * 1.312) / 100)).toString();

      setFormData(prev => ({
        ...prev,
        points: updatedPoints,
        path: updatedPath,
        distanceKm: newDistKm,
        durationMin: newDurationMin,
        latidosEarned: newLatidos
      }));
      setTempCheckpointName('');
    } else {
      // Add path waypoint
      const updatedPath = [...formData.path, coords];
      const newDistM = computePathDistance(updatedPath);
      const newDistKm = (newDistM / 1000).toFixed(2);
      const newDurationMin = Math.max(5, Math.round((newDistM / 1000) * 12)).toString();
      const newLatidos = Math.max(5, Math.floor((newDistM * 1.312) / 100)).toString();

      setFormData(prev => ({
        ...prev,
        path: updatedPath,
        distanceKm: newDistKm,
        durationMin: newDurationMin,
        latidosEarned: newLatidos
      }));
    }
  };

  const handleRemovePoint = (index) => {
    setFormData(prev => ({
      ...prev,
      points: prev.points.filter((_, i) => i !== index)
    }));
  };

  const handleUndoLastPath = () => {
    if (formData.path.length === 0) return;
    const updatedPath = formData.path.slice(0, -1);
    const newDistM = computePathDistance(updatedPath);
    setFormData(prev => ({
      ...prev,
      path: updatedPath,
      distanceKm: (newDistM / 1000).toFixed(2),
      durationMin: Math.max(5, Math.round((newDistM / 1000) * 12)).toString(),
      latidosEarned: Math.max(5, Math.floor((newDistM * 1.312) / 100)).toString()
    }));
  };

  const handleClearMap = () => {
    setFormData(prev => ({
      ...prev,
      path: [],
      points: [],
      distanceKm: '0.00',
      durationMin: '5',
      latidosEarned: '5'
    }));
  };

  const handleStartCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      distanceKm: '1.50',
      durationMin: '20',
      latidosEarned: '20',
      path: [
        { lat: 28.0048, lon: -15.4158 },
        { lat: 28.0038, lon: -15.4148 }
      ],
      points: [
        { lat: 28.0048, lon: -15.4158, name: 'Punto de Inicio' }
      ]
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (r) => {
    setEditingId(r.id);
    const p = getSafePath(r);
    const pts = getSafePoints(r);
    const distNum = typeof r.distance === 'number' ? r.distance : parseFloat(r.distance) || 0;
    const durNum = typeof r.duration === 'number' ? r.duration : parseInt(r.duration, 10) || 0;

    setFormData({
      name: r.name || '',
      distanceKm: distNum.toFixed(2),
      durationMin: Math.round(durNum / 60).toString(),
      latidosEarned: (r.latidos_earned || 20).toString(),
      path: p,
      points: pts
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Por favor introduce un nombre para la ruta.');
      return;
    }

    if (formData.path.length < 2) {
      alert('Por favor añade al menos 2 puntos en el mapa para trazar el recorrido de la ruta.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        distance: parseFloat(formData.distanceKm) || 0.1,
        duration: Math.max(60, (parseInt(formData.durationMin, 10) || 10) * 60),
        latidos_earned: parseInt(formData.latidosEarned, 10) || 10,
        path: formData.path,
        points: formData.points
      };

      if (editingId) {
        const res = await updateRecommendedRoute(editingId, payload);
        if (res.success) {
          alert('Ruta recomendada actualizada correctamente.');
        } else {
          alert(res.error || 'Error al actualizar ruta.');
        }
      } else {
        const res = await addRecommendedRoute(payload);
        if (res.success) {
          alert('Nueva ruta recomendada publicada para todos los usuarios.');
        } else {
          alert(res.error || 'Error al crear ruta.');
        }
      }

      setShowForm(false);
      setEditingId(null);
      await loadData();
    } catch (err) {
      alert('Error: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const res = await deleteRecommendedRoute(deleteConfirmId);
    if (res.success) {
      setDeleteConfirmId(null);
      await loadData();
    } else {
      alert('Error al eliminar ruta.');
    }
  };

  const mapCenter = useMemo(() => {
    if (formData.path && formData.path.length > 0) {
      return [formData.path[0].lat, formData.path[0].lon];
    }
    return [28.0048, -15.4158]; // Telde center
  }, [formData.path]);

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-text)', margin: 0 }}>
            🧭 Rutas Recomendadas
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
            Gestiona y publica rutas recomendadas visibles para todos los usuarios de la app.
          </p>
        </div>

        <button 
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingId(null);
            } else {
              handleStartCreate();
            }
          }}
          style={{
            backgroundColor: showForm ? 'var(--color-card-alt)' : 'var(--color-accent)',
            color: showForm ? 'var(--color-text)' : 'white',
            border: showForm ? '1px solid var(--color-border)' : 'none',
            padding: '0.65rem 1.2rem',
            borderRadius: '2rem',
            fontFamily: 'var(--font-main)',
            fontWeight: '700',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 4px 12px rgba(212, 96, 122, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          {showForm ? '✖ Cancelar' : '+ Nueva Ruta'}
        </button>
      </div>

      {/* Creator / Editor Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'var(--color-card)',
          padding: '1.5rem',
          borderRadius: '1.5rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-card)',
          border: '1.5px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.8rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text)', margin: 0 }}>
              {editingId ? '✏️ Editar Ruta Recomendada' : '✨ Crear Nueva Ruta Recomendada'}
            </h3>
            <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: '700' }}>
              Visible para toda la comunidad
            </span>
          </div>

          {/* Route basic fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-detail)', marginBottom: '0.3rem' }}>
                Nombre de la Ruta *
              </label>
              <input 
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Paseo Comercial San Gregorio"
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-detail)', marginBottom: '0.3rem' }}>
                Recompensa (❤ Latidos)
              </label>
              <input 
                type="number"
                min="1"
                required
                value={formData.latidosEarned}
                onChange={e => setFormData({ ...formData, latidosEarned: e.target.value })}
                placeholder="Ej: 25"
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-detail)', marginBottom: '0.3rem' }}>
                Distancia Estimada (km)
              </label>
              <input 
                type="number"
                step="0.01"
                min="0.1"
                required
                value={formData.distanceKm}
                onChange={e => setFormData({ ...formData, distanceKm: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-detail)', marginBottom: '0.3rem' }}>
                Duración Estimada (minutos)
              </label>
              <input 
                type="number"
                min="1"
                required
                value={formData.durationMin}
                onChange={e => setFormData({ ...formData, durationMin: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Map instructions & tools */}
          <div style={{ backgroundColor: 'var(--color-card-alt)', borderRadius: '1rem', padding: '0.9rem', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text)' }}>Modo al tocar el mapa:</span>
                <button
                  type="button"
                  onClick={() => setAddMode('path')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '1rem',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    backgroundColor: addMode === 'path' ? '#22c55e' : 'var(--color-card)',
                    color: addMode === 'path' ? 'white' : 'var(--color-text-muted)'
                  }}
                >
                  🟢 Trazo de Ruta ({formData.path.length} pts)
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('checkpoint')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '1rem',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    backgroundColor: addMode === 'checkpoint' ? 'var(--color-accent)' : 'var(--color-card)',
                    color: addMode === 'checkpoint' ? 'white' : 'var(--color-text-muted)'
                  }}
                >
                  📍 Checkpoint ({formData.points.length})
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={handleUndoLastPath}
                  disabled={formData.path.length === 0}
                  style={{ padding: '0.35rem 0.7rem', borderRadius: '0.8rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.75rem', fontWeight: '600', cursor: formData.path.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  ↩ Deshacer punto
                </button>
                <button
                  type="button"
                  onClick={handleClearMap}
                  style={{ padding: '0.35rem 0.7rem', borderRadius: '0.8rem', border: 'none', backgroundColor: '#e74c3c', color: 'white', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  🗑️ Limpiar mapa
                </button>
              </div>
            </div>

            {addMode === 'checkpoint' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                <input 
                  type="text"
                  placeholder="Nombre del próximo checkpoint (Ej: Iglesia San Gregorio)"
                  value={tempCheckpointName}
                  onChange={e => setTempCheckpointName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.8rem',
                    borderRadius: '0.8rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-input-bg)',
                    color: 'var(--color-text)',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--color-detail)' }}>Toca el mapa para situarlo</span>
              </div>
            )}
          </div>

          {/* Interactive Leaflet Map */}
          <div style={{ height: '340px', width: '100%', borderRadius: '1.2rem', overflow: 'hidden', position: 'relative', zIndex: 0, boxShadow: 'var(--shadow-card)' }}>
            <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              <MapEditorEvents onMapClick={handleMapClick} />

              {/* Polyline path */}
              {formData.path.length > 0 && (
                <Polyline 
                  positions={formData.path.map(p => [p.lat, p.lon])} 
                  color="#22c55e" 
                  weight={5} 
                  opacity={0.9} 
                />
              )}

              {/* Start & End markers */}
              {formData.path.length > 0 && (
                <Marker position={[formData.path[0].lat, formData.path[0].lon]} icon={startMarkerIcon}>
                  <Popup>🚩 Inicio de ruta</Popup>
                </Marker>
              )}

              {formData.path.length > 1 && (
                <Marker position={[formData.path[formData.path.length - 1].lat, formData.path[formData.path.length - 1].lon]} icon={endMarkerIcon}>
                  <Popup>🏁 Fin de ruta</Popup>
                </Marker>
              )}

              {/* Checkpoints */}
              {formData.points.map((pt, i) => (
                <Marker 
                  key={i} 
                  position={[pt.lat, pt.lon]} 
                  icon={createPointMarker(i + 1)}
                  eventHandlers={{
                    click: () => handleRemovePoint(i)
                  }}
                >
                  <Popup>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 0.2rem', fontWeight: 'bold' }}>📍 {pt.name || `Punto ${i + 1}`}</p>
                      <span style={{ color: '#e74c3c', fontSize: '0.75rem', cursor: 'pointer' }}>(Haz clic para borrar)</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Checkpoints List in Form */}
          {formData.points.length > 0 && (
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text)', marginBottom: '0.4rem' }}>
                Puntos de control creados ({formData.points.length}):
              </p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {formData.points.map((pt, idx) => (
                  <span 
                    key={idx} 
                    style={{
                      fontSize: '0.8rem',
                      backgroundColor: 'var(--color-card-alt)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      borderRadius: '0.8rem',
                      padding: '0.3rem 0.6rem',
                      color: 'var(--color-text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    📍 <strong>{idx + 1}. {pt.name}</strong>
                    <button 
                      type="button" 
                      onClick={() => handleRemovePoint(idx)} 
                      style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', padding: 0 }}
                      title="Eliminar punto"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              onClick={() => { setShowForm(false); setEditingId(null); }}
              style={{ padding: '0.8rem 1.4rem', borderRadius: '2rem', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ padding: '0.8rem 1.8rem', borderRadius: '2rem', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: '700', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.35)', opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? 'Guardando en BD...' : (editingId ? 'Guardar Cambios' : 'Publicar Ruta')}
            </button>
          </div>
        </form>
      )}

      {/* Routes List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Cargando rutas recomendadas...
        </div>
      ) : routes.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--color-card)', borderRadius: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>No hay rutas recomendadas creadas.</p>
          <button onClick={handleStartCreate} style={{ backgroundColor: 'var(--color-accent)', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '2rem', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
            + Crear Primera Ruta
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {routes.map(r => {
            const p = getSafePath(r);
            const pts = getSafePoints(r);
            const isExp = expandedId === r.id;
            const distNum = typeof r.distance === 'number' ? r.distance : parseFloat(r.distance) || 0;
            const durNum = typeof r.duration === 'number' ? r.duration : parseInt(r.duration, 10) || 0;
            const stepsCount = Math.round(distNum * 1312);

            return (
              <div 
                key={r.id} 
                style={{ 
                  backgroundColor: 'var(--color-card)', 
                  borderRadius: '1.2rem', 
                  padding: '1.2rem', 
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExp ? null : r.id)}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h4 style={{ color: 'var(--color-text)', fontSize: '1.15rem', fontFamily: 'var(--font-main)', margin: 0, fontWeight: '700' }}>
                        {r.name}
                      </h4>
                      <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', padding: '0.15rem 0.5rem', borderRadius: '0.8rem', fontWeight: '700' }}>
                        ⭐ Recomendada
                      </span>
                    </div>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                      {distNum.toFixed(2).replace('.', ',')} km • {stepsCount.toLocaleString('es-ES')} pasos • {formatTime(durNum)} • {pts.length} puntos
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '0.4rem 0.8rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: '800' }}>
                      +{r.latidos_earned || 0} ❤
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(r); }}
                      style={{ padding: '0.45rem 0.8rem', borderRadius: '0.8rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card-alt)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(r.id); }}
                      style={{ padding: '0.45rem 0.8rem', borderRadius: '0.8rem', border: 'none', backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Expanded preview map */}
                {isExp && (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.8rem' }}>
                    {pts.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                        {pts.map((pt, idx) => (
                          <span key={idx} style={{ fontSize: '0.75rem', backgroundColor: 'var(--color-card-alt)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.25rem 0.6rem', borderRadius: '0.8rem', color: 'var(--color-text)' }}>
                            📍 {pt.name || `Punto ${idx + 1}`}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ height: '220px', width: '100%', borderRadius: '1rem', overflow: 'hidden', position: 'relative', zIndex: 0 }}>
                      <MapContainer 
                        center={p.length > 0 ? [p[0].lat, p[0].lon] : [28.0048, -15.4158]} 
                        zoom={15} 
                        style={{ height: '100%', width: '100%', zIndex: 1 }} 
                        zoomControl={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {p.length > 0 && <Polyline positions={p.map(coord => [coord.lat, coord.lon])} color="#22c55e" weight={4} opacity={0.85} />}
                        {p.length > 0 && <Marker position={[p[0].lat, p[0].lon]} icon={startMarkerIcon} />}
                        {p.length > 1 && <Marker position={[p[p.length - 1].lat, p[p.length - 1].lon]} icon={endMarkerIcon} />}
                        {pts.map((pt, i) => (
                          <Marker key={i} position={[pt.lat, pt.lon]} icon={createPointMarker(i + 1)}>
                            <Popup>{pt.name}</Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: '360px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗑️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              Eliminar Ruta Recomendada
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              ¿Estás seguro de que deseas eliminar esta ruta recomendada de la base de datos?
            </p>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button 
                onClick={() => setDeleteConfirmId(null)} 
                style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete} 
                style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: 'none', backgroundColor: '#e74c3c', color: 'white', fontWeight: '700', cursor: 'pointer' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRutas;
