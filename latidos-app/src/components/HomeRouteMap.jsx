import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { buildColoredSegments } from '../utils/routePathPasses';

// Native SVG / CSS Leaflet Marker Icons
const userGreenMarker = L.divIcon({
  className: 'user-live-marker',
  html: `
    <div style="
      position: relative;
      width: 22px;
      height: 22px;
      background: #22c55e;
      border: 3.5px solid white;
      border-radius: 50%;
      box-shadow: 0 0 14px rgba(34,197,94,0.9), 0 3px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulseGreenGps 1.8s infinite;
    ">
      <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const startMarkerIcon = L.divIcon({
  className: 'start-flag-marker',
  html: `
    <div style="
      background: #16a34a;
      color: white;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      border: 2px solid white;
      font-size: 13px;
    ">
      🚩
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

const Recenter = ({ lat, lon }) => {
  const map = useMap();
  React.useEffect(() => {
    if (lat && lon) {
      map.setView([lat, lon], map.getZoom(), { animate: true });
    }
  }, [lat, lon, map]);
  return null;
};

const HomeRouteMap = ({
  currentPosition,
  routePath = [],
  currentPassLevel = 1,
  isPathLimitPaused = false,
  onClearPath
}) => {
  const navigate = useNavigate();
  const currentPos = currentPosition || { lat: 28.0048, lon: -15.4158 };
  const positions = (routePath || []).map(p => [p.lat, p.lon]);
  const coloredSegments = useMemo(() => buildColoredSegments(routePath), [routePath]);

  return (
    <div style={{
      margin: '0 1rem 1rem',
      backgroundColor: 'var(--color-card)',
      borderRadius: '1.5rem',
      padding: '1rem',
      boxShadow: 'var(--shadow-card)',
      fontFamily: 'var(--font-main)'
    }}>
      {/* Header with Title and Quick Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🗺️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: 'var(--color-text)' }}>
              Mapa de Rutas y Pasos
            </h3>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Sistema de 4 líneas y detección de pasadas
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {positions.length > 0 && onClearPath && (
            <button
              type="button"
              onClick={onClearPath}
              style={{
                backgroundColor: 'rgba(120, 120, 140, 0.12)',
                color: 'var(--color-text)',
                border: 'none',
                borderRadius: '1rem',
                padding: '0.35rem 0.65rem',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Limpiar traza actual"
            >
              🔄 Limpiar
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/rutas')}
            style={{
              backgroundColor: 'var(--color-accent, #22c55e)',
              color: 'white',
              border: 'none',
              borderRadius: '1rem',
              padding: '0.35rem 0.75rem',
              fontSize: '0.72rem',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            Ver en Rutas ➔
          </button>
        </div>
      </div>

      {/* Warning banner when Line 4 is reached */}
      {isPathLimitPaused && (
        <div style={{
          marginBottom: '0.75rem',
          backgroundColor: 'rgba(239, 68, 68, 0.14)',
          border: '1.5px solid rgba(239, 68, 68, 0.45)',
          color: '#b91c1c',
          padding: '0.65rem 0.85rem',
          borderRadius: '1rem',
          fontSize: '0.78rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🛑</span>
            <strong style={{ fontSize: '0.82rem' }}>Línea 4 alcanzada: Pasos pausados</strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
            Has pasado 4 veces por este mismo tramo. Camina hacia una calle nueva para reactivar el conteo de pasos automáticamente.
          </p>
        </div>
      )}

      {/* 4-Pass Indicator Pills */}
      <div style={{
        marginBottom: '0.75rem',
        padding: '0.45rem 0.65rem',
        borderRadius: '0.9rem',
        backgroundColor: 'rgba(120, 120, 140, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.72rem',
        fontWeight: '700'
      }}>
        <span style={{ color: currentPassLevel === 1 ? '#16a34a' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', opacity: currentPassLevel === 1 ? 1 : 0.65 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
          1ª Verde
        </span>
        <span style={{ color: currentPassLevel === 2 ? '#ca8a04' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', opacity: currentPassLevel === 2 ? 1 : 0.65 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#eab308', display: 'inline-block' }}></span>
          2ª Vuelta
        </span>
        <span style={{ color: currentPassLevel === 3 ? '#ea580c' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', opacity: currentPassLevel === 3 ? 1 : 0.65 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f97316', display: 'inline-block' }}></span>
          3ª Repite
        </span>
        <span style={{ color: currentPassLevel === 4 ? '#dc2626' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', opacity: currentPassLevel === 4 ? 1 : 0.65 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
          4ª Pausa
        </span>
      </div>

      {/* Leaflet Map */}
      <div style={{
        height: '240px',
        width: '100%',
        borderRadius: '1.2rem',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.06)',
        position: 'relative'
      }}>
        <MapContainer
          center={[currentPos.lat, currentPos.lon]}
          zoom={16}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <Recenter lat={currentPos.lat} lon={currentPos.lon} />

          {/* 4 Colored Polylines */}
          {coloredSegments[1] && coloredSegments[1].length > 0 && (
            <Polyline positions={coloredSegments[1]} color="#22c55e" weight={6} opacity={0.95} />
          )}
          {coloredSegments[2] && coloredSegments[2].length > 0 && (
            <Polyline positions={coloredSegments[2]} color="#eab308" weight={6} opacity={0.95} />
          )}
          {coloredSegments[3] && coloredSegments[3].length > 0 && (
            <Polyline positions={coloredSegments[3]} color="#f97316" weight={6} opacity={0.95} />
          )}
          {coloredSegments[4] && coloredSegments[4].length > 0 && (
            <Polyline positions={coloredSegments[4]} color="#ef4444" weight={7} opacity={0.95} dashArray="6, 6" />
          )}

          {/* Start Marker */}
          {positions.length > 0 && (
            <Marker position={positions[0]} icon={startMarkerIcon}>
              <Popup>
                <div style={{ textAlign: 'center', padding: '0.2rem' }}>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#15803d', fontSize: '0.85rem' }}>
                    🚩 Inicio del recorrido
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* User GPS Marker */}
          <Marker position={[currentPos.lat, currentPos.lon]} icon={userGreenMarker}>
            <Popup>
              <div style={{ textAlign: 'center', padding: '0.2rem' }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#16a34a', fontSize: '0.85rem' }}>
                  🟢 Tu posición actual
                </p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};

export default HomeRouteMap;
