import React, { useEffect, useRef, useState } from 'react';
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

// Custom icon for points (green)
const pointIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Live pulsing green user GPS icon
const userGreenMarker = L.divIcon({
  className: '',
  html: `
    <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; inset: 0; background: rgba(34, 197, 94, 0.45); border-radius: 50%; animation: pulseRing 1.5s infinite ease-out;"></div>
      <div style="position: relative; width: 16px; height: 16px; background: #22c55e; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const formatDistance = (meters) => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2).replace('.', ',')} km`;
  return `${Math.round(meters)} m`;
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const Recenter = ({ lat, lon }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon]);
  }, [lat, lon, map]);
  return null;
};

const LiveMap = ({ position, route, points, targetRoute, onRemovePoint, tr }) => {
  if (!position) return null;
  const positions = route.map(p => [p.lat, p.lon]);
  const targetPositions = targetRoute ? targetRoute.map(p => [p.lat, p.lon]) : [];
  
  return (
    <div style={{ height: '280px', width: 'calc(100% - 2rem)', borderRadius: '1.5rem', overflow: 'hidden', margin: '0 1rem 0.75rem', boxShadow: 'var(--shadow-card)', zIndex: 0 }}>
      <MapContainer center={[position.lat, position.lon]} zoom={17} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
        <Recenter lat={position.lat} lon={position.lon} />

        {/* Replicated target route guide (blue dashed) */}
        {targetPositions.length > 0 && (
          <Polyline positions={targetPositions} color="#3b82f6" weight={5} opacity={0.65} dashArray="8, 8" />
        )}

        {/* Live user walked route (bright emerald green) */}
        {positions.length > 0 && (
          <Polyline positions={positions} color="#22c55e" weight={6} opacity={0.95} />
        )}
        
        {/* User GPS Live Marker in Green */}
        <Marker position={[position.lat, position.lon]} icon={userGreenMarker}>
          <Popup>{tr?.tuEstasAqui || 'Tú estás aquí'}</Popup>
        </Marker>
        
        {points.map((pt, i) => (
          <Marker key={i} position={[pt.lat, pt.lon]} icon={pointIcon}>
            <Popup>
              <div style={{ textAlign: 'center', padding: '0.2rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontWeight: 'bold', color: '#15803d' }}>📍 {tr?.puntoAnadido || 'Punto'} {i+1}</p>
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
                  🗑️ {tr?.eliminar || 'Eliminar punto'}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

const RouteMap = ({ routePath, routePoints, tr }) => {
  if (!routePath || routePath.length === 0) return null;
  const positions = routePath.map(p => [p.lat, p.lon]);
  const center = positions[Math.floor(positions.length / 2)];

  return (
    <div style={{ height: '200px', width: '100%', borderRadius: '1rem', overflow: 'hidden', marginTop: '1rem', zIndex: 0 }}>
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
        <Polyline positions={positions} color="#22c55e" weight={5} opacity={0.9} />
        
        <Marker position={positions[0]} icon={pointIcon}><Popup>{tr?.inicioRuta || 'Inicio de la ruta'}</Popup></Marker>
        <Marker position={positions[positions.length - 1]} icon={pointIcon}><Popup>{tr?.finRuta || 'Fin de la ruta'}</Popup></Marker>

        {routePoints && routePoints.map((pt, i) => (
          <Marker key={i} position={[pt.lat, pt.lon]} icon={pointIcon}>
            <Popup>{tr?.puntoAnadido || 'Punto añadido'} {i+1}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

const EditRouteModal = ({ route, onClose, onSave, tr }) => {
  const [name, setName] = useState(route.name);
  const [points, setPoints] = useState(route.points || []);
  
  const positions = route.path.map(p => [p.lat, p.lon]);
  const center = positions.length > 0 ? positions[Math.floor(positions.length / 2)] : [0,0];

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        setPoints(prev => [...prev, { lat: e.latlng.lat, lon: e.latlng.lng }]);
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

        <label style={{ color: 'var(--color-detail)', fontSize: '0.85rem', marginBottom: '0.3rem', display: 'block' }}>{tr?.puntosInteres || 'Puntos de interés'} (Toca para añadir, toca el marcador para borrarlo)</label>
        <div style={{ height: '250px', width: '100%', borderRadius: '1rem', overflow: 'hidden', marginBottom: '1.5rem', zIndex: 0 }}>
          <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapEvents />
            <Polyline positions={positions} color="#22c55e" weight={4} opacity={0.8} />
            
            {points.map((pt, i) => (
              <Marker 
                key={i} 
                position={[pt.lat, pt.lon]} 
                icon={pointIcon}
                eventHandlers={{
                  click: () => removePoint(i)
                }}
              >
                <Popup>Punto {i+1} (Toca para borrar)</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: 'none', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', fontWeight: '600', cursor: 'pointer' }}>{tr?.cancelar || 'Cancelar'}</button>
          <button onClick={() => onSave(route.id, { name, points })} style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: 'none', backgroundColor: 'var(--color-accent)', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{tr?.guardar || 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
};

const RutasPage = () => {
  const { isAuthenticated, savedRoutes, saveRoute, deleteRoute, updateRoute, ganarLatidos, updateSteps, steps: totalSteps, tr } = useLatidos();
  const navigate = useNavigate();

  const {
    position,
    route,
    points,
    distanceM,
    isTracking,
    error,
    permissionState,
    startTracking,
    stopTracking,
    addPoint,
    removePoint,
    resetRoute
  } = useGeolocation();

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [routeName, setRouteName] = useState('');
  const [expandedRouteId, setExpandedRouteId] = useState(null);
  const [replicatedRoute, setReplicatedRoute] = useState(null);

  useEffect(() => {
    if (isTracking) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTracking]);

  const speedKmh = elapsed > 0 ? ((distanceM / 1000) / (elapsed / 3600)) : 0;
  const routeSteps = Math.round(distanceM * 1.312);
  const earnedLatidos = Math.floor(routeSteps / 100);

  const handleStartRoute = () => {
    setIsSessionActive(true);
    startTracking();
  };

  const handleFinish = () => {
    stopTracking();
    const defaultName = replicatedRoute ? `Re: ${replicatedRoute.name}` : `Paseo ${new Date().toLocaleDateString('es-ES')}`;
    setRouteName(defaultName);
    setShowSaveModal(true);
  };

  const handleDiscardRoute = () => {
    stopTracking();
    resetRoute();
    setElapsed(0);
    setReplicatedRoute(null);
    setIsSessionActive(false);
    setShowDiscardConfirm(false);
  };

  const handleSaveRoute = async () => {
    const latidosEarned = Math.floor(routeSteps / 100);
    const finalRoute = route.length > 0 
      ? route 
      : (position ? [{ lat: position.lat, lon: position.lon }] : [{ lat: 28.0048, lon: -15.4158 }]);

    await saveRoute({
      name: (routeName && routeName.trim()) || `Paseo ${new Date().toLocaleDateString('es-ES')}`,
      distance: (distanceM || 0) / 1000,
      duration: elapsed || 1,
      latidos_earned: latidosEarned,
      path: finalRoute,
      points: points
    });

    if (latidosEarned > 0) {
      await ganarLatidos(latidosEarned);
    }
    if (routeSteps > 0) {
      await updateSteps((totalSteps || 0) + routeSteps);
    }

    setShowSaveModal(false);
    setReplicatedRoute(null);
    resetRoute();
    setElapsed(0);
    setIsSessionActive(false);
  };

  const handleReplicar = (rt) => {
    resetRoute();
    setElapsed(0);
    setReplicatedRoute(rt);
    setIsSessionActive(true);
    startTracking();
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
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem', color: 'var(--color-text)' }}>{tr?.cuenta || 'Debes iniciar sesión'}</h2>
        <button onClick={() => navigate('/login')} style={{ backgroundColor: 'var(--color-accent)', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '2rem', fontFamily: 'var(--font-main)', fontWeight: '600', border: 'none', cursor: 'pointer' }}>Ir a Iniciar Sesión</button>
      </div>
    );
  }

  const isRouteActive = isSessionActive || isTracking || route.length > 0 || replicatedRoute !== null;

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
        border: isTracking ? '2px solid rgba(34, 197, 94, 0.4)' : 'none',
        boxShadow: isTracking ? '0 4px 20px rgba(34, 197, 94, 0.2)' : 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.95rem', fontWeight: '400', marginBottom: '0.4rem', opacity: 0.85 }}>
              {replicatedRoute ? `🧭 ${tr?.replicandoRuta || 'Replicando ruta'}: ${replicatedRoute.name}` : (tr?.misRutas || 'Mis Rutas')}
            </p>
            {/* Live Distance in Green when active */}
            <div style={{
              fontSize: '2.8rem',
              fontWeight: '700',
              fontStyle: 'italic',
              lineHeight: '1',
              marginBottom: '0.3rem',
              color: isTracking ? '#22c55e' : 'var(--color-header-text)',
              transition: 'color 0.3s ease',
              textShadow: isTracking ? '0 0 16px rgba(34, 197, 94, 0.4)' : 'none'
            }}>
              {formatDistance(distanceM)}
            </div>
            <p style={{ fontSize: '0.95rem', opacity: 0.9, fontWeight: '600', color: isTracking ? '#86efac' : 'inherit' }}>
              👟 {routeSteps.toLocaleString('es-ES')} {tr?.pasos || 'pasos'}
            </p>
          </div>

          {/* Heart Badge with potential latidos */}
          <div style={{
            backgroundColor: isTracking ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.18)',
            border: isTracking ? '1.5px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(255,255,255,0.3)',
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
            <span style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '0.2rem', color: isTracking ? '#22c55e' : 'inherit' }}>
              +{earnedLatidos}
            </span>
            <span style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: '600', textTransform: 'uppercase' }}>
              Latidos
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>
          {isTracking ? (
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

      {/* Live Map with green user marker and green polyline */}
      {isRouteActive && position && (
        <LiveMap
          position={position}
          route={route}
          points={points}
          targetRoute={replicatedRoute ? replicatedRoute.path : null}
          onRemovePoint={removePoint}
          tr={tr}
        />
      )}

      {/* Stats row during active recording */}
      {isRouteActive && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', margin: '0 1rem 0.75rem' }}>
          <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1.2rem', padding: '0.85rem 0.5rem', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-detail)', marginBottom: '0.2rem' }}>⏱ {tr?.tiempo || 'Tiempo'}</p>
            <p style={{ fontSize: '1.35rem', fontWeight: '700', fontStyle: 'italic', color: 'var(--color-text)' }}>{formatTime(elapsed)}</p>
          </div>
          <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1.2rem', padding: '0.85rem 0.5rem', textAlign: 'center', boxShadow: 'var(--shadow-card)', border: isTracking ? '1.5px solid rgba(34, 197, 94, 0.3)' : 'none' }}>
            <p style={{ fontSize: '0.72rem', color: isTracking ? '#16a34a' : 'var(--color-detail)', marginBottom: '0.2rem', fontWeight: '600' }}>👟 {tr?.pasos || 'Pasos'}</p>
            <p style={{ fontSize: '1.35rem', fontWeight: '700', fontStyle: 'italic', color: isTracking ? '#22c55e' : 'var(--color-accent)' }}>
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

      {/* Points chips during active recording */}
      {isRouteActive && points.length > 0 && (
        <div style={{ margin: '0 1rem 0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '700', fontFamily: 'var(--font-main)' }}>🟢 Puntos verdes:</span>
          {points.map((pt, i) => (
            <span
              key={i}
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                borderRadius: '1rem',
                padding: '0.2rem 0.6rem',
                fontSize: '0.75rem',
                color: '#15803d',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              📍 Punto {i+1}
              <button
                onClick={() => removePoint(i)}
                style={{
                  background: 'none', border: 'none', color: '#e74c3c',
                  cursor: 'pointer', fontWeight: 'bold', padding: 0, fontSize: '0.85rem'
                }}
                title="Eliminar punto"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ margin: '0 1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {!isRouteActive ? (
          <button 
            onClick={handleStartRoute} 
            style={{ backgroundColor: '#22c55e', color: 'white', padding: '0.95rem', borderRadius: '2.5rem', width: '100%', fontSize: '1rem', fontWeight: '700', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            ▶ {tr?.iniciarRuta || 'Iniciar ruta'}
          </button>
        ) : (
          <>
            {isTracking ? (
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button 
                  onClick={stopTracking} 
                  style={{ flex: 1, backgroundColor: '#f39c12', color: 'white', padding: '0.85rem', borderRadius: '2.5rem', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.95rem' }}
                >
                  ⏸ {tr?.detenerRuta || tr?.detener || 'Detener'}
                </button>
                <button 
                  onClick={addPoint} 
                  style={{ flex: 1, backgroundColor: '#22c55e', color: 'white', padding: '0.85rem', borderRadius: '2.5rem', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)' }}
                >
                  📍 {tr?.anadirPunto || 'Añadir Punto'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button 
                  onClick={startTracking} 
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
                  onClick={addPoint} 
                  style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '2.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: '0.9rem' }}
                >
                  📍 {tr?.anadirPunto || 'Punto'}
                </button>
              </div>
            )}

            <button 
              onClick={handleFinish} 
              style={{ backgroundColor: 'var(--color-accent)', color: 'white', padding: '0.9rem', borderRadius: '2.5rem', width: '100%', fontWeight: '700', border: 'none', cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(212, 96, 122, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              🏁 {tr?.finalizarRuta || 'Finalizar y guardar'}
            </button>
          </>
        )}
      </div>

      {/* Historial de Rutas */}
      <div style={{ margin: '0 1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-text)', marginBottom: '1rem' }}>{tr?.rutasGuardadas || 'Rutas Guardadas'}</h3>
        
        {savedRoutes.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>{tr?.sinRutas || 'Aún no has guardado ninguna ruta.'}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {savedRoutes.map((rt) => (
              <div 
                key={rt.id} 
                style={{ backgroundColor: 'var(--color-card)', borderRadius: '1.2rem', padding: '1.2rem', boxShadow: 'var(--shadow-card)', cursor: 'pointer' }}
                onClick={() => setExpandedRouteId(expandedRouteId === rt.id ? null : rt.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ color: 'var(--color-text)', fontSize: '1.1rem', marginBottom: '0.2rem', fontFamily: 'var(--font-main)' }}>{rt.name}</h4>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      {rt.distance.toFixed(2).replace('.', ',')} km • {Math.round(rt.distance * 1312).toLocaleString('es-ES')} {tr?.pasos || 'pasos'} • {formatTime(rt.duration)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '0.4rem 0.8rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: '700' }}>
                      +{rt.latidos_earned} ❤
                    </div>
                  </div>
                </div>

                {expandedRouteId === rt.id && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleReplicar(rt); }} 
                        style={{ flex: '1 1 100%', padding: '0.65rem', borderRadius: '0.8rem', border: 'none', backgroundColor: '#22c55e', color: 'white', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        ▶ {tr?.repetirRuta || 'Repetir ruta'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingRoute(rt); }} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.8rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                        ✏️ {tr?.editar || 'Editar'}
                      </button>
                      <button onClick={(e) => handleDelete(e, rt.id)} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.8rem', border: 'none', backgroundColor: '#e74c3c', color: 'white', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                        🗑️ {tr?.eliminar || 'Eliminar'}
                      </button>
                    </div>
                    <RouteMap routePath={rt.path} routePoints={rt.points} tr={tr} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showSaveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>{tr?.guardarRuta || 'Guardar Ruta'}</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{formatDistance(distanceM)}</span> • {routeSteps.toLocaleString('es-ES')} {tr?.pasos || 'pasos'} • +{earnedLatidos} ❤
            </p>
            <input type="text" value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder={tr?.nombreRutaPlaceholder || 'Nombre de la ruta'} style={{ width: '100%', padding: '0.9rem', borderRadius: '1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', marginBottom: '1.5rem', fontSize: '1rem', outline: 'none' }} />
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={() => setShowSaveModal(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: 'none', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', fontWeight: '600', cursor: 'pointer' }}>{tr?.cancelar || 'Cancelar'}</button>
              <button onClick={handleSaveRoute} style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: 'none', backgroundColor: '#22c55e', color: 'white', fontWeight: '700', cursor: 'pointer' }}>{tr?.guardar || 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {editingRoute && (
        <EditRouteModal route={editingRoute} onClose={() => setEditingRoute(null)} onSave={handleEditSave} tr={tr} />
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

      {/* Delete Saved Route Confirmation Modal */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: '350px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🗑️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>{tr?.eliminar || 'Eliminar'}</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {tr?.confirmarEliminarRuta || '¿Estás seguro de que deseas eliminar esta ruta de forma permanente?'}
            </p>
            
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={cancelDelete} style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', fontWeight: '600', cursor: 'pointer' }}>{tr?.cancelar || 'Cancelar'}</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '0.8rem', borderRadius: '2rem', border: 'none', backgroundColor: '#e74c3c', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{tr?.eliminar || 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes pulseGreenDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

export default RutasPage;
