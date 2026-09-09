import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { useLatidos } from '../context/LatidosContext';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
});

// Native SVG / CSS Leaflet Marker Icons in vibrant Green
const createPointMarker = (num = 1) => L.divIcon({
  className: 'custom-point-marker',
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
        min-width: 32px;
        height: 32px;
        padding: 0 6px;
        border-radius: 16px;
        border: 2.5px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 0.85rem;
        box-shadow: 0 4px 12px rgba(22, 163, 74, 0.5);
      ">
        📍 ${num}
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 7px solid #15803d;
        margin-top: -1px;
      "></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  popupAnchor: [0, -38]
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
        padding: 5px 10px;
        border-radius: 14px;
        border: 2.5px solid white;
        font-weight: 800;
        font-size: 0.8rem;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.5);
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      ">
        🚩 Inicio
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 7px solid #22c55e;
        margin-top: -1px;
      "></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  popupAnchor: [0, -34]
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
        padding: 5px 10px;
        border-radius: 14px;
        border: 2.5px solid #22c55e;
        font-weight: 800;
        font-size: 0.8rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      ">
        🏁 Meta
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 7px solid #0f172a;
        margin-top: -1px;
      "></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  popupAnchor: [0, -34]
});

const userGreenMarker = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
    ">
      <div style="
        position: absolute;
        inset: 0;
        background: rgba(34, 197, 94, 0.4);
        border-radius: 50%;
        animation: pulseRing 1.6s infinite ease-out;
      "></div>
      <div style="
        position: relative;
        width: 18px;
        height: 18px;
        background: #22c55e;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 10px rgba(34,197,94,0.6);
      "></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  popupAnchor: [0, -20]
});

// Helper for safe path and points extraction
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

// Haversine formula to compute real-time distance in meters between two coordinates
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

const formatDistance = (meters) => {
  if (!meters || meters <= 0) return '0 m';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2).replace('.', ',')} km`;
  return `${Math.round(meters)} m`;
};

const formatTime = (seconds) => {
  const m = Math.floor((seconds || 0) / 60).toString().padStart(2, '0');
  const s = Math.floor((seconds || 0) % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const Recenter = ({ lat, lon }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) map.setView([lat, lon]);
  }, [lat, lon, map]);
  return null;
};

// Default recommended popular routes with rich points
const DEFAULT_POPULAR_ROUTES = [
  {
    id: 'pop-1',
    name: 'Ruta Histórica San Gregorio',
    distance: 1.85,
    duration: 1320,
    latidos_earned: 24,
    points: [
      { lat: 28.0048, lon: -15.4158, name: 'Plaza de San Gregorio' },
      { lat: 28.0034, lon: -15.4144, name: 'Calle León y Castillo' },
      { lat: 28.0021, lon: -15.4139, name: 'Calle Inés Chemida' }
    ],
    path: [
      { lat: 28.0048, lon: -15.4158 },
      { lat: 28.0042, lon: -15.4152 },
      { lat: 28.0034, lon: -15.4144 },
      { lat: 28.0028, lon: -15.4140 },
      { lat: 28.0021, lon: -15.4139 }
    ]
  },
  {
    id: 'pop-2',
    name: 'Paseo Parque de San Juan',
    distance: 2.40,
    duration: 1800,
    latidos_earned: 31,
    points: [
      { lat: 28.0055, lon: -15.4162, name: 'Plaza de San Juan' },
      { lat: 28.0038, lon: -15.4148, name: 'Paseo de la Fraternidad' },
      { lat: 28.0015, lon: -15.4130, name: 'Mirador del Valle' }
    ],
    path: [
      { lat: 28.0055, lon: -15.4162 },
      { lat: 28.0048, lon: -15.4158 },
      { lat: 28.0038, lon: -15.4148 },
      { lat: 28.0025, lon: -15.4138 },
      { lat: 28.0015, lon: -15.4130 }
    ]
  }
];

const LiveMap = ({ position, route, points, targetRoute, targetPoints, onRemovePoint, tr }) => {
  const currentPos = position || { lat: 28.0048, lon: -15.4158 };
  const positions = (route || []).map(p => [p.lat, p.lon]);
  const targetPositions = (targetRoute || []).map(p => [p.lat, p.lon]);
  
  return (
    <div style={{ height: '320px', width: 'calc(100% - 2rem)', borderRadius: '1.5rem', overflow: 'hidden', margin: '0 1rem 0.75rem', boxShadow: 'var(--shadow-card)', zIndex: 0, position: 'relative' }}>
      <MapContainer center={[currentPos.lat, currentPos.lon]} zoom={16} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
        <Recenter lat={currentPos.lat} lon={currentPos.lon} />

        {/* Target route guide (blue dashed line) */}
        {targetPositions.length > 0 && (
          <Polyline positions={targetPositions} color="#3b82f6" weight={5} opacity={0.7} dashArray="8, 8" />
        )}

        {/* Live user walked route in bright green */}
        {positions.length > 0 && (
          <Polyline positions={positions} color="#22c55e" weight={6} opacity={0.95} />
        )}
        
        {/* User GPS Live Marker in pulsing Green */}
        <Marker position={[currentPos.lat, currentPos.lon]} icon={userGreenMarker}>
          <Popup>
            <div style={{ textAlign: 'center', padding: '0.2rem' }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#16a34a', fontSize: '0.9rem' }}>
                🟢 {tr?.tuEstasAqui || 'Tu posición GPS'}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Target route checkpoints when replicating a route */}
        {targetPoints && targetPoints.map((pt, i) => {
          const distToPt = haversineDist(currentPos, pt);
          return (
            <Marker key={`tgt-pt-${i}`} position={[pt.lat, pt.lon]} icon={createPointMarker(i + 1)}>
              <Popup>
                <div style={{ textAlign: 'center', padding: '0.2rem' }}>
                  <p style={{ margin: '0 0 0.2rem', fontWeight: 'bold', color: '#15803d' }}>
                    📍 {pt.name || `Punto ${i + 1}`}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#16a34a', fontWeight: '800' }}>
                    🟢 Distancia: {formatDistance(distToPt)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Custom checkpoints added live by the user */}
        {points && points.map((pt, i) => {
          const distToPt = haversineDist(currentPos, pt);
          return (
            <Marker key={`live-pt-${i}`} position={[pt.lat, pt.lon]} icon={createPointMarker(i + 1)}>
              <Popup>
                <div style={{ textAlign: 'center', padding: '0.2rem' }}>
                  <p style={{ margin: '0 0 0.2rem', fontWeight: 'bold', color: '#15803d' }}>
                    📍 {pt.name || `${tr?.puntoAnadido || 'Punto'} ${i + 1}`}
                  </p>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: '800' }}>
                    🟢 Distancia: {formatDistance(distToPt)}
                  </p>
                  {onRemovePoint && (
                    <button
                      onClick={() => onRemovePoint(i)}
                      style={{
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      🗑️ {tr?.eliminar || 'Eliminar'}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

const RouteMap = ({ routePath, routePoints, currentPos, tr }) => {
  const safePath = getSafePath({ path: routePath });
  const safePoints = getSafePoints({ points: routePoints });

  if (safePath.length === 0) return null;
  const positions = safePath.map(p => [p.lat, p.lon]);
  const center = positions[Math.floor(positions.length / 2)] || [28.0048, -15.4158];

  return (
    <div style={{ height: '220px', width: '100%', borderRadius: '1rem', overflow: 'hidden', marginTop: '0.8rem', zIndex: 0 }}>
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
        <Polyline positions={positions} color="#22c55e" weight={5} opacity={0.9} />
        
        {/* Start and End Markers */}
        <Marker position={positions[0]} icon={startMarkerIcon}>
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 0.2rem', fontWeight: 'bold', color: '#16a34a' }}>🚩 {tr?.inicioRuta || 'Inicio de la ruta'}</p>
              {currentPos && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#16a34a', fontWeight: '700' }}>
                  Distancia: {formatDistance(haversineDist(currentPos, positions[0]))}
                </p>
              )}
            </div>
          </Popup>
        </Marker>

        <Marker position={positions[positions.length - 1]} icon={endMarkerIcon}>
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 0.2rem', fontWeight: 'bold', color: '#0f172a' }}>🏁 {tr?.finRuta || 'Fin de la ruta'}</p>
              {currentPos && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#16a34a', fontWeight: '700' }}>
                  Distancia: {formatDistance(haversineDist(currentPos, positions[positions.length - 1]))}
                </p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Checkpoint Markers */}
        {safePoints.map((pt, i) => {
          const dist = currentPos ? haversineDist(currentPos, pt) : 0;
          return (
            <Marker key={i} position={[pt.lat, pt.lon]} icon={createPointMarker(i + 1)}>
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 0.2rem', fontWeight: 'bold', color: '#15803d' }}>📍 {pt.name || `Punto ${i+1}`}</p>
                  {currentPos && (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#16a34a', fontWeight: '700' }}>
                      Distancia: {formatDistance(dist)}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

const EditRouteModal = ({ route, onClose, onSave, tr }) => {
  const [name, setName] = useState(route?.name || '');
  const [points, setPoints] = useState(getSafePoints(route));
  
  const positions = getSafePath(route).map(p => [p.lat, p.lon]);
  const center = positions.length > 0 ? positions[Math.floor(positions.length / 2)] : [28.0048, -15.4158];

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        setPoints(prev => [...prev, { lat: e.latlng.lat, lon: e.latlng.lng, name: `Punto ${prev.length + 1}` }]);
      }
    });
    return null;
  };

  const removePoint = (index) => {
    setPoints(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-text)', marginBottom: '1rem' }}>{tr?.editar || 'Editar'} {tr?.navRutas || 'Ruta'}</h3>
        
        <label style={{ color: 'var(--color-detail)', fontSize: '0.85rem', marginBottom: '0.3rem', display: 'block' }}>{tr?.nombreRuta || 'Nombre de la ruta'}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: '0.9rem', borderRadius: '1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', marginBottom: '1.5rem', fontSize: '1rem', outline: 'none' }}
        />

        <label style={{ color: 'var(--color-detail)', fontSize: '0.85rem', marginBottom: '0.3rem', display: 'block' }}>{tr?.puntosInteres || 'Puntos de control'} (Toca el mapa para añadir)</label>
        <div style={{ height: '250px', width: '100%', borderRadius: '1rem', overflow: 'hidden', marginBottom: '1.5rem', zIndex: 0 }}>
          <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapEvents />
            {positions.length > 0 && <Polyline positions={positions} color="#22c55e" weight={4} opacity={0.8} />}
            
            {points.map((pt, i) => (
              <Marker 
                key={i} 
                position={[pt.lat, pt.lon]} 
                icon={createPointMarker(i + 1)}
                eventHandlers={{
                  click: () => removePoint(i)
                }}
              >
                <Popup>{pt.name || `Punto ${i+1}`} (Toca para borrar)</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: 'none', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', fontWeight: '600', cursor: 'pointer' }}>{tr?.cancelar || 'Cancelar'}</button>
          <button onClick={() => onSave(route.id, { name, points })} style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: '700', cursor: 'pointer' }}>{tr?.guardar || 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
};

const RutasPage = () => {
  const {
    isAuthenticated,
    savedRoutes,
    recommendedRoutes,
    saveRoute,
    deleteRoute,
    updateRoute,
    ganarLatidos,
    updateSteps,
    steps: totalSteps,
    tr,
    isRouteActive,
    isRouteTracking,
    routeElapsed,
    routeDistanceM,
    routePath,
    routePoints,
    replicatedRoute,
    isVehicleDetected,
    currentSpeedKmh,
    currentPosition,
    startRouteSession,
    pauseRouteSession,
    resumeRouteSession,
    discardRouteSession,
    addRouteCheckpoint,
    removeRouteCheckpoint,
    finishRouteSession
  } = useLatidos();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('recommended'); // 'recommended' | 'my_routes'
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showAddPointModal, setShowAddPointModal] = useState(false);
  const [newPointName, setNewPointName] = useState('');
  const [editingRoute, setEditingRoute] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [routeName, setRouteName] = useState('');
  const [expandedRouteId, setExpandedRouteId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const speedKmh = currentSpeedKmh || (routeElapsed > 0 ? ((routeDistanceM / 1000) / (routeElapsed / 3600)) : 0);
  const routeSteps = Math.round(routeDistanceM * 1.312);
  const earnedLatidos = Math.floor(routeSteps / 100);
  const currentPos = currentPosition || { lat: 28.0048, lon: -15.4158 };

  const handleStartRoute = () => {
    startRouteSession();
  };

  const handleOpenAddPoint = () => {
    setNewPointName(`Punto ${(routePoints?.length || 0) + 1}`);
    setShowAddPointModal(true);
  };

  const handleConfirmAddPoint = (e) => {
    e?.preventDefault?.();
    const finalPtName = newPointName.trim() || `Punto ${(routePoints?.length || 0) + 1}`;
    addRouteCheckpoint(finalPtName, currentPos);
    setShowAddPointModal(false);
    setNewPointName('');
  };

  const handleFinish = () => {
    pauseRouteSession();
    const defaultName = replicatedRoute ? `Re: ${replicatedRoute.name}` : `Paseo ${new Date().toLocaleDateString('es-ES')}`;
    setRouteName(defaultName);
    setShowSaveModal(true);
  };

  const handleDiscardRoute = () => {
    discardRouteSession();
    setShowDiscardConfirm(false);
  };

  const handleSaveRoute = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      await finishRouteSession(routeName);
      setShowSaveModal(false);
    } catch (err) {
      console.error('Error guardando la ruta:', err);
      alert('Hubo un error al guardar la ruta: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReplicar = (rt) => {
    startRouteSession(rt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteRoute(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleEditSave = (id, data) => {
    updateRoute(id, data);
    setEditingRoute(null);
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        padding: '3rem 1.5rem 6rem 1.5rem',
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: 'var(--color-card)',
          borderRadius: '1.8rem',
          padding: '2.5rem 1.8rem',
          maxWidth: '380px',
          width: '100%',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '1.4rem',
            backgroundColor: 'var(--color-card-alt)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.2rem',
            border: '1px solid var(--color-border)'
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: 'var(--color-text)',
            margin: '0 0 0.5rem 0'
          }}>
            Rutas y Caminatas
          </h2>

          <p style={{
            fontFamily: 'var(--font-main)',
            fontSize: '0.9rem',
            color: 'var(--color-text-muted)',
            lineHeight: '1.5',
            margin: '0 0 1.8rem 0'
          }}>
            Inicia sesión o crea una cuenta para trazar tus rutas, registrar tus pasos en el mapa y ganar Latidos caminando por tu barrio.
          </p>

          <button
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              padding: '0.95rem 1.8rem',
              borderRadius: '2rem',
              fontFamily: 'var(--font-main)',
              fontWeight: '700',
              fontSize: '0.95rem',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              boxShadow: 'var(--shadow-card)',
              transition: 'transform 0.15s ease'
            }}
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  // Calculate sorted active checkpoints with real-time distance
  const activeCheckpoints = useMemo(() => {
    const list = [];
    
    // Add points from replicated route if active
    if (replicatedRoute) {
      const repPoints = getSafePoints(replicatedRoute);
      repPoints.forEach((p, idx) => {
        list.push({
          id: `rep-${idx}`,
          name: p.name || `Punto ${idx + 1}`,
          lat: p.lat,
          lon: p.lon,
          distance: haversineDist(currentPos, p),
          isReplicated: true
        });
      });
    }

    // Add live points added by user
    (routePoints || []).forEach((p, idx) => {
      list.push({
        id: `live-${idx}`,
        name: p.name || `Punto ${idx + 1}`,
        lat: p.lat,
        lon: p.lon,
        distance: haversineDist(currentPos, p),
        isReplicated: false
      });
    });

    return list.sort((a, b) => a.distance - b.distance);
  }, [replicatedRoute, routePoints, currentPos]);

  return (
    <div style={{ paddingBottom: '6rem', paddingTop: '0.5rem' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--color-header-bg)',
        color: 'var(--color-header-text)',
        padding: '1.8rem 1.8rem 2rem',
        borderRadius: '1.5rem',
        margin: '1rem 1rem 0.75rem',
        textAlign: 'left',
        border: isRouteTracking ? '2px solid rgba(34, 197, 94, 0.4)' : 'none',
        boxShadow: isRouteTracking ? '0 4px 20px rgba(34, 197, 94, 0.2)' : 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.95rem', fontWeight: '400', marginBottom: '0.4rem', opacity: 0.85 }}>
              {replicatedRoute ? `Replicando ruta: ${replicatedRoute.name}` : (tr?.misRutas || 'Mis Rutas')}
            </p>
            {/* Live Distance in Green when active */}
            <div style={{
              fontSize: '2.8rem',
              fontWeight: '700',
              fontStyle: 'italic',
              lineHeight: '1',
              marginBottom: '0.3rem',
              color: isRouteTracking ? '#22c55e' : 'var(--color-header-text)',
              transition: 'color 0.3s ease',
              textShadow: isRouteTracking ? '0 0 16px rgba(34, 197, 94, 0.4)' : 'none'
            }}>
              {formatDistance(routeDistanceM)}
            </div>
            <p style={{ fontSize: '0.95rem', opacity: 0.9, fontWeight: '600', color: isRouteTracking ? '#86efac' : 'inherit' }}>
              👟 {routeSteps.toLocaleString('es-ES')} {tr?.pasos || 'pasos'}
            </p>
          </div>

          {/* Heart Badge with potential latidos */}
          <div style={{
            backgroundColor: isRouteTracking ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.18)',
            border: isRouteTracking ? '1.5px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(255,255,255,0.3)',
            borderRadius: '1.2rem',
            padding: '0.6rem 0.9rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '75px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <span style={{ fontSize: '1.6rem', lineHeight: '1' }}>❤</span>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '0.2rem', color: isRouteTracking ? '#22c55e' : 'inherit' }}>
              +{earnedLatidos}
            </span>
            <span style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: '600', textTransform: 'uppercase' }}>
              Latidos
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>
          {isRouteTracking ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#22c55e', fontWeight: '700' }}>
              <span style={{ width: '9px', height: '9px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'inline-block', animation: 'pulseGreenDot 1.2s infinite' }}></span>
              {tr?.rutaGrabando || tr?.registrarRuta || 'Grabando ruta activa'}...
            </span>
          ) : isRouteActive ? (
            `⏸️ ${tr?.rutaEnPausa || 'Ruta en pausa / detenida'}`
          ) : (
            tr?.iniciarRuta || 'Inicia una ruta para comenzar'
          )}
        </p>
      </div>

      {/* Vehicle Detected Warning Banner (No emojis, exact text) */}
      {isVehicleDetected && (
        <div style={{
          margin: '0 1rem 0.75rem',
          backgroundColor: '#e74c3c',
          color: 'white',
          padding: '0.75rem 1rem',
          borderRadius: '1rem',
          textAlign: 'center',
          fontFamily: 'var(--font-main)',
          fontWeight: '700',
          fontSize: '0.9rem',
          boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)'
        }}>
          (Vehículo detectado, pasos pausados)
        </div>
      )}

      {/* Live Map */}
      <LiveMap
        position={currentPos}
        route={routePath}
        points={routePoints}
        targetRoute={replicatedRoute ? getSafePath(replicatedRoute) : null}
        targetPoints={replicatedRoute ? getSafePoints(replicatedRoute) : null}
        onRemovePoint={removeRouteCheckpoint}
        tr={tr}
      />

      {/* Stats row during active recording */}
      {isRouteActive && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', margin: '0 1rem 0.75rem' }}>
          <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1.2rem', padding: '0.85rem 0.5rem', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-detail)', marginBottom: '0.2rem' }}>⏱ {tr?.tiempo || 'Tiempo'}</p>
            <p style={{ fontSize: '1.35rem', fontWeight: '700', fontStyle: 'italic', color: 'var(--color-text)' }}>{formatTime(routeElapsed)}</p>
          </div>
          <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1.2rem', padding: '0.85rem 0.5rem', textAlign: 'center', boxShadow: 'var(--shadow-card)', border: isRouteTracking ? '1.5px solid rgba(34, 197, 94, 0.3)' : 'none' }}>
            <p style={{ fontSize: '0.72rem', color: isRouteTracking ? '#16a34a' : 'var(--color-detail)', marginBottom: '0.2rem', fontWeight: '600' }}>👟 {tr?.pasos || 'Pasos'}</p>
            <p style={{ fontSize: '1.35rem', fontWeight: '700', fontStyle: 'italic', color: isRouteTracking ? '#22c55e' : 'var(--color-accent)' }}>
              {routeSteps.toLocaleString('es-ES')}
            </p>
          </div>
          <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1.2rem', padding: '0.85rem 0.5rem', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-detail)', marginBottom: '0.2rem' }}>⚡ {tr?.velocidad || 'Velocidad'}</p>
            <p style={{ fontSize: '1.35rem', fontWeight: '700', fontStyle: 'italic', color: 'var(--color-text)' }}>
              {speedKmh.toFixed(1).replace('.', ',')}<span style={{ fontSize: '0.75rem', fontStyle: 'normal', fontWeight: '400' }}> km/h</span>
            </p>
          </div>
        </div>
      )}

      {/* Checkpoints & Real-time Distance Panel */}
      {activeCheckpoints.length > 0 && (
        <div style={{ margin: '0 1rem 0.75rem', backgroundColor: 'var(--color-card)', borderRadius: '1.2rem', padding: '0.85rem 1rem', boxShadow: 'var(--shadow-card)', border: '1.5px solid rgba(34, 197, 94, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span>📍</span> Puntos de control y distancia ({activeCheckpoints.length}):
            </p>
            <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '700' }}>En tiempo real</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.3rem' }}>
            {activeCheckpoints.map((pt, idx) => (
              <div
                key={pt.id || idx}
                style={{
                  backgroundColor: 'var(--color-card-alt)',
                  border: '1.5px solid #22c55e',
                  borderRadius: '1rem',
                  padding: '0.5rem 0.85rem',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)'
                }}
              >
                <span style={{ backgroundColor: '#22c55e', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800' }}>
                  {idx + 1}
                </span>
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-text)', margin: 0, maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pt.name}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '800', margin: 0 }}>
                    a {formatDistance(pt.distance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ margin: '0 1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {!isRouteActive ? (
          <button 
            onClick={handleStartRoute} 
            style={{ backgroundColor: '#22c55e', color: 'white', padding: '1rem', borderRadius: '2.5rem', width: '100%', fontSize: '1.05rem', fontWeight: '700', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            ▶ {tr?.iniciarRuta || 'Iniciar ruta'}
          </button>
        ) : (
          <>
            {isRouteTracking ? (
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button 
                  onClick={pauseRouteSession} 
                  style={{ flex: 1, backgroundColor: '#f39c12', color: 'white', padding: '0.85rem', borderRadius: '2.5rem', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.95rem' }}
                >
                  ⏸ {tr?.detenerRuta || tr?.detener || 'Detener'}
                </button>
                <button 
                  onClick={handleOpenAddPoint} 
                  style={{ flex: 1, backgroundColor: '#22c55e', color: 'white', padding: '0.85rem', borderRadius: '2.5rem', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)' }}
                >
                  📍 {tr?.anadirPunto || 'Añadir Punto'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button 
                  onClick={resumeRouteSession} 
                  style={{ flex: 1, backgroundColor: '#22c55e', color: 'white', padding: '0.85rem', borderRadius: '2.5rem', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)' }}
                >
                  ▶ {tr?.reanudarRuta || tr?.reanudar || 'Reanudar'}
                </button>
                <button 
                  onClick={() => setShowDiscardConfirm(true)} 
                  style={{ flex: 1, backgroundColor: '#e74c3c', color: 'white', padding: '0.85rem', borderRadius: '2.5rem', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.95rem' }}
                >
                  🗑️ {tr?.eliminarRutaActual || 'Eliminar ruta'}
                </button>
                <button 
                  onClick={handleOpenAddPoint} 
                  style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '2.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: '0.9rem' }}
                >
                  📍 {tr?.anadirPunto || 'Punto'}
                </button>
              </div>
            )}

            <button 
              onClick={handleFinish} 
              style={{ backgroundColor: 'var(--color-accent)', color: 'white', padding: '0.95rem', borderRadius: '2.5rem', width: '100%', fontWeight: '700', border: 'none', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 12px rgba(212, 96, 122, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              🏁 {tr?.finalizarRuta || 'Finalizar y guardar'}
            </button>
          </>
        )}
      </div>

      {/* Modal para Añadir Punto de Interés en el momento (Requerimiento 4) */}
      {showAddPointModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: '380px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📍</span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--color-text)', margin: 0 }}>
                Añadir Punto de Interés
              </h3>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
              Nombra este punto de control en tu ubicación GPS actual:
            </p>
            <form onSubmit={handleConfirmAddPoint}>
              <input 
                type="text"
                autoFocus
                value={newPointName}
                onChange={e => setNewPointName(e.target.value)}
                placeholder="Ej: Plaza de San Juan, Fuente..."
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  marginBottom: '1.2rem'
                }}
              />
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button 
                  type="button"
                  onClick={() => setShowAddPointModal(false)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '2rem', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '2rem', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)' }}
                >
                  Guardar Punto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selector de pestañas: Rutas recomendadas / Mis rutas */}
      <div style={{ margin: '0 1rem 1rem' }}>
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--color-card)',
          borderRadius: '2rem',
          padding: '0.35rem',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--color-border)',
          gap: '0.3rem'
        }}>
          <button
            onClick={() => setActiveTab('recommended')}
            style={{
              flex: 1,
              padding: '0.75rem 0.5rem',
              borderRadius: '1.8rem',
              border: 'none',
              backgroundColor: activeTab === 'recommended' ? 'var(--color-header-bg)' : 'transparent',
              color: activeTab === 'recommended' ? 'var(--color-header-text)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-main)',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: activeTab === 'recommended' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <span>🌟</span> {tr?.rutasRecomendadas || 'Rutas recomendadas'} ({recommendedRoutes?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('my_routes')}
            style={{
              flex: 1,
              padding: '0.75rem 0.5rem',
              borderRadius: '1.8rem',
              border: 'none',
              backgroundColor: activeTab === 'my_routes' ? 'var(--color-header-bg)' : 'transparent',
              color: activeTab === 'my_routes' ? 'var(--color-header-text)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-main)',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: activeTab === 'my_routes' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <span>📌</span> {tr?.misRutas || 'Mis rutas'} ({savedRoutes?.length || 0})
          </button>
        </div>
      </div>

      {/* Lista de Rutas según la pestaña activa */}
      <div style={{ margin: '0 1rem' }}>
        {activeTab === 'recommended' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--color-text)', margin: 0 }}>
                {tr?.rutasRecomendadas || 'Rutas Recomendadas'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Oficiales de la comunidad
              </span>
            </div>

            {(!recommendedRoutes || recommendedRoutes.length === 0) ? (
              <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1.2rem', padding: '2rem', textAlign: 'center', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)' }}>
                <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>
                  {tr?.sinRutasRecomendadas || 'Aún no hay rutas recomendadas disponibles.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {recommendedRoutes.map((rt) => {
                  const rtPoints = getSafePoints(rt);
                  const rtPath = getSafePath(rt);
                  const isExpanded = expandedRouteId === rt.id;
                  const distanceNum = typeof rt.distance === 'number' ? rt.distance : parseFloat(rt.distance) || 0;
                  const stepsCount = Math.round(distanceNum * 1312);

                  return (
                    <div 
                      key={rt.id} 
                      style={{ backgroundColor: 'var(--color-card)', borderRadius: '1.2rem', padding: '1.2rem', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                      onClick={() => setExpandedRouteId(isExpanded ? null : rt.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                            <h4 style={{ color: 'var(--color-text)', fontSize: '1.1rem', fontFamily: 'var(--font-main)', margin: 0, fontWeight: '700' }}>{rt.name}</h4>
                            <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', padding: '0.15rem 0.5rem', borderRadius: '0.8rem', fontWeight: '700' }}>
                              ⭐ Recomendada
                            </span>
                          </div>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                            {distanceNum.toFixed(2).replace('.', ',')} km • {stepsCount.toLocaleString('es-ES')} {tr?.pasos || 'pasos'} • {formatTime(rt.duration)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '0.4rem 0.8rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: '800' }}>
                            +{rt.latidos_earned || 0} ❤
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: '1rem' }}>
                          {/* Route points preview with distances */}
                          {rtPoints.length > 0 && (
                            <div style={{ marginBottom: '0.8rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {rtPoints.map((p, idx) => (
                                <span key={idx} style={{ fontSize: '0.75rem', backgroundColor: 'var(--color-card-alt)', border: '1px solid rgba(34,197,94,0.3)', padding: '0.3rem 0.6rem', borderRadius: '0.8rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <span>📍</span> {p.name || `Punto ${idx + 1}`} <strong style={{ color: '#16a34a' }}>(a {formatDistance(haversineDist(currentPos, p))})</strong>
                                </span>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleReplicar(rt); }} 
                              style={{ flex: '1 1 100%', padding: '0.75rem', borderRadius: '0.8rem', border: 'none', backgroundColor: '#22c55e', color: 'white', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 10px rgba(34, 197, 94, 0.3)' }}
                            >
                              ▶ {tr?.repetirRuta || 'Comenzar esta ruta'}
                            </button>
                          </div>
                          <RouteMap routePath={rtPath} routePoints={rtPoints} currentPos={currentPos} tr={tr} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--color-text)', margin: 0 }}>
                {tr?.misRutas || 'Mis Rutas'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Tus recorridos grabados
              </span>
            </div>

            {(!savedRoutes || savedRoutes.length === 0) ? (
              <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1.2rem', padding: '2rem 1.5rem', textAlign: 'center', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)' }}>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {tr?.sinRutas || 'Aún no tienes rutas guardadas. ¡Sal a caminar y graba tu primera ruta!'}
                </p>
                <button
                  onClick={handleStartRoute}
                  style={{
                    backgroundColor: '#22c55e',
                    color: 'white',
                    padding: '0.75rem 1.4rem',
                    borderRadius: '2rem',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                  }}
                >
                  ▶ {tr?.iniciarRuta || 'Iniciar ruta ahora'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {savedRoutes.map((rt) => {
                  const rtPoints = getSafePoints(rt);
                  const rtPath = getSafePath(rt);
                  const isExpanded = expandedRouteId === rt.id;
                  const distanceNum = typeof rt.distance === 'number' ? rt.distance : parseFloat(rt.distance) || 0;
                  const stepsCount = Math.round(distanceNum * 1312);

                  return (
                    <div 
                      key={rt.id} 
                      style={{ backgroundColor: 'var(--color-card)', borderRadius: '1.2rem', padding: '1.2rem', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                      onClick={() => setExpandedRouteId(isExpanded ? null : rt.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ color: 'var(--color-text)', fontSize: '1.1rem', fontFamily: 'var(--font-main)', margin: '0 0 0.2rem 0', fontWeight: '700' }}>{rt.name}</h4>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                            {distanceNum.toFixed(2).replace('.', ',')} km • {stepsCount.toLocaleString('es-ES')} {tr?.pasos || 'pasos'} • {formatTime(rt.duration)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '0.4rem 0.8rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: '800' }}>
                            +{rt.latidos_earned || 0} ❤
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: '1rem' }}>
                          {/* Route points preview with distances */}
                          {rtPoints.length > 0 && (
                            <div style={{ marginBottom: '0.8rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {rtPoints.map((p, idx) => (
                                <span key={idx} style={{ fontSize: '0.75rem', backgroundColor: 'var(--color-card-alt)', border: '1px solid rgba(34,197,94,0.3)', padding: '0.3rem 0.6rem', borderRadius: '0.8rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <span>📍</span> {p.name || `Punto ${idx + 1}`} <strong style={{ color: '#16a34a' }}>(a {formatDistance(haversineDist(currentPos, p))})</strong>
                                </span>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleReplicar(rt); }} 
                              style={{ flex: '1 1 100%', padding: '0.75rem', borderRadius: '0.8rem', border: 'none', backgroundColor: '#22c55e', color: 'white', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 10px rgba(34, 197, 94, 0.3)' }}
                            >
                              ▶ {tr?.repetirRuta || 'Comenzar esta ruta'}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingRoute(rt); }} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.8rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                              ✏️ {tr?.editar || 'Editar'}
                            </button>
                            <button onClick={(e) => handleDelete(e, rt.id)} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.8rem', border: 'none', backgroundColor: '#e74c3c', color: 'white', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                              🗑️ {tr?.eliminar || 'Eliminar'}
                            </button>
                          </div>
                          <RouteMap routePath={rtPath} routePoints={rtPoints} currentPos={currentPos} tr={tr} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showSaveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>{tr?.guardarRuta || 'Guardar Ruta'}</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{formatDistance(distanceM)}</span> • {routeSteps.toLocaleString('es-ES')} {tr?.pasos || 'pasos'} • +{earnedLatidos} ❤
            </p>
            <input 
              type="text" 
              value={routeName} 
              onChange={(e) => setRouteName(e.target.value)} 
              placeholder={tr?.nombreRutaPlaceholder || 'Nombre de la ruta'} 
              style={{ width: '100%', padding: '0.9rem', borderRadius: '1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', marginBottom: '1.5rem', fontSize: '1rem', outline: 'none' }} 
            />
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button 
                disabled={isSaving}
                onClick={() => setShowSaveModal(false)} 
                style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: 'none', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', fontWeight: '600', cursor: isSaving ? 'not-allowed' : 'pointer' }}
              >
                {tr?.cancelar || 'Cancelar'}
              </button>
              <button 
                disabled={isSaving}
                onClick={handleSaveRoute} 
                style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: '700', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
              >
                {isSaving ? 'Guardando...' : (tr?.guardar || 'Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingRoute && (
        <EditRouteModal route={editingRoute} onClose={() => setEditingRoute(null)} onSave={handleEditSave} tr={tr} />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: '350px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗑️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>{tr?.eliminar || 'Eliminar'} {tr?.navRutas || 'Ruta'}</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              ¿Estás seguro de que deseas eliminar esta ruta guardada?
            </p>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={cancelDelete} style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', fontWeight: '600', cursor: 'pointer' }}>{tr?.cancelar || 'Cancelar'}</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: 'none', backgroundColor: '#e74c3c', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{tr?.eliminar || 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Discard in-progress route modal */}
      {showDiscardConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: '350px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🗑️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>{tr?.eliminarRutaActual || 'Eliminar ruta'}</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {tr?.confirmarDescartar || '¿Deseas descartar y eliminar la ruta actual?'}
            </p>
            
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={() => setShowDiscardConfirm(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', fontWeight: '600', cursor: 'pointer' }}>{tr?.cancelar || 'Cancelar'}</button>
              <button onClick={handleDiscardRoute} style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: 'none', backgroundColor: '#e74c3c', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{tr?.eliminar || 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RutasPage;
