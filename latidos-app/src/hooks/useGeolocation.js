import { useState, useEffect, useRef, useCallback } from 'react';

// Haversine formula — distance in meters between two coords
export const haversineDistance = (a, b) => {
  if (!a || !b) return 0;
  const lat1 = a.lat !== undefined ? a.lat : a[0];
  const lon1 = a.lon !== undefined ? a.lon : a[1];
  const lat2 = b.lat !== undefined ? b.lat : b[0];
  const lon2 = b.lon !== undefined ? b.lon : b[1];
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;

  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c =
    2 * Math.asin(
      Math.sqrt(
        sinLat * sinLat +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLon * sinLon
      )
    );
  return R * c;
};

// Pedestrian speed limit in km/h (above 20 km/h is vehicular motion: car, scooter, bike, etc.)
const MAX_PEDESTRIAN_SPEED_KMH = 20.0;
const MAX_PEDESTRIAN_SPEED_MS = MAX_PEDESTRIAN_SPEED_KMH / 3.6; // ~5.56 m/s

export const useGeolocation = () => {
  const [position, setPosition] = useState(null);    // { lat, lon, accuracy, speed }
  const [route, setRoute] = useState([]);            // array of { lat, lon }
  const [points, setPoints] = useState([]);          // array of { lat, lon, name, time }
  const [distanceM, setDistanceM] = useState(0);     // meters traveled on foot
  const [isTracking, setIsTracking] = useState(false);
  const [isVehicleDetected, setIsVehicleDetected] = useState(false);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('idle');

  const watchIdRef = useRef(null);
  const lastPointRef = useRef(null);
  const lastTimeRef = useRef(null);
  const wakeLockRef = useRef(null);
  const vehicleReadingsCount = useRef(0);

  // Get initial location immediately on mount so the map and GPS point load right away
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lon, accuracy, speed } = pos.coords;
          setPosition({ lat, lon, accuracy, speed: speed || 0 });
        },
        (err) => {
          // Fallback default coordinates (Telde / Gran Canaria)
          setPosition({ lat: 28.0048, lon: -15.4158, accuracy: 100, speed: 0 });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      setPosition({ lat: 28.0048, lon: -15.4158, accuracy: 100, speed: 0 });
    }
  }, []);

  const recentReadingsRef = useRef([]);

  const handlePosition = useCallback((pos) => {
    const { latitude: lat, longitude: lon, accuracy, speed } = pos.coords;
    const now = Date.now();
    const newPoint = { lat, lon };

    // Discard inaccurate GPS readings (> 40 meters error)
    if (typeof accuracy === 'number' && accuracy > 40) {
      return;
    }

    // Maintain a rolling window of recent GPS fixes for smooth speed estimation
    recentReadingsRef.current.push({ lat, lon, time: now });
    if (recentReadingsRef.current.length > 5) {
      recentReadingsRef.current.shift();
    }

    let speedKmh = 0;
    if (typeof speed === 'number' && speed >= 0.2) {
      speedKmh = speed * 3.6;
    } else if (recentReadingsRef.current.length >= 2) {
      const first = recentReadingsRef.current[0];
      const last = recentReadingsRef.current[recentReadingsRef.current.length - 1];
      const dt = (last.time - first.time) / 1000;
      if (dt >= 1.5) {
        const d = haversineDistance(first, last);
        speedKmh = (d / dt) * 3.6;
      }
    }

    speedKmh = Math.min(120, Math.max(0, speedKmh));
    setCurrentSpeedKmh(speedKmh);
    setPosition({ lat, lon, accuracy, speed: speedKmh / 3.6 });

    // Vehicle detection check: speed > 20 km/h over consecutive readings
    if (speedKmh > MAX_PEDESTRIAN_SPEED_KMH) {
      vehicleReadingsCount.current += 1;
      if (vehicleReadingsCount.current >= 2) {
        setIsVehicleDetected(true);
      }
      lastPointRef.current = newPoint;
      lastTimeRef.current = now;
      return;
    } else {
      if (vehicleReadingsCount.current > 0) {
        vehicleReadingsCount.current -= 1;
      }
      if (vehicleReadingsCount.current === 0) {
        setIsVehicleDetected(false);
      }
    }

    setRoute((prev) => [...prev, newPoint]);

    if (lastPointRef.current) {
      const dist = haversineDistance(lastPointRef.current, newPoint);
      // Realistic pedestrian displacement (between 2.0m and 50m)
      if (dist >= 2.0 && dist < 50) {
        setDistanceM((prev) => prev + dist);
        lastPointRef.current = newPoint;
        lastTimeRef.current = now;
      }
    } else {
      lastPointRef.current = newPoint;
      lastTimeRef.current = now;
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Tu dispositivo no soporta geolocalización.');
      return;
    }
    setError(null);
    setPermissionState('requesting');

    if (position) {
      setRoute(prev => prev.length === 0 ? [{ lat: position.lat, lon: position.lon }] : prev);
      if (!lastPointRef.current) {
        lastPointRef.current = { lat: position.lat, lon: position.lon };
        lastTimeRef.current = Date.now();
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPermissionState('granted');
        handlePosition(pos);
      },
      (err) => {
        setPermissionState('denied');
        setError(
          err.code === 1
            ? 'Permiso de ubicación denegado.'
            : 'No se pudo obtener la ubicación.'
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000
      }
    );
    
    // Request WakeLock to prevent device from sleeping while tracking route
    try {
      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(lock => {
          wakeLockRef.current = lock;
        }).catch(err => console.error(`WakeLock error: ${err.message}`));
      }
    } catch (err) {
      console.error(err);
    }

    setIsTracking(true);
  }, [handlePosition, position]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release().catch(console.error);
      wakeLockRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const addPoint = useCallback((customName) => {
    if (position) {
      const ptName = (customName && typeof customName === 'string' && customName.trim()) 
        ? customName.trim() 
        : `Punto ${points.length + 1}`;
      setPoints(prev => [...prev, { lat: position.lat, lon: position.lon, name: ptName, time: Date.now() }]);
    }
  }, [position, points.length]);

  const removePoint = useCallback((index) => {
    setPoints(prev => prev.filter((_, i) => i !== index));
  }, []);

  const editPoint = useCallback((index, newName) => {
    if (!newName || !newName.trim()) return;
    setPoints(prev => prev.map((pt, i) => i === index ? { ...pt, name: newName.trim() } : pt));
  }, []);

  const resetRoute = useCallback(() => {
    lastPointRef.current = null;
    lastTimeRef.current = null;
    vehicleReadingsCount.current = 0;
    setIsVehicleDetected(false);
    setCurrentSpeedKmh(0);
    setRoute([]);
    setPoints([]);
    setDistanceM(0);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    position,
    route,
    points,
    distanceM,
    isTracking,
    isVehicleDetected,
    currentSpeedKmh,
    error,
    permissionState,
    startTracking,
    stopTracking,
    addPoint,
    editPoint,
    removePoint,
    resetRoute,
    setRoute,
    setPoints,
    setDistanceM
  };
};
