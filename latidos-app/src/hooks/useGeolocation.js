import { useState, useEffect, useRef, useCallback } from 'react';

// Haversine formula — distance in meters between two coords
const haversineDistance = (a, b) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c =
    2 * Math.asin(
      Math.sqrt(
        sinLat * sinLat +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLon * sinLon
      )
    );
  return R * c;
};

export const useGeolocation = () => {
  const [position, setPosition] = useState(null);    // { lat, lon, accuracy }
  const [route, setRoute] = useState([]);            // array of { lat, lon }
  const [points, setPoints] = useState([]);          // array of { lat, lon, time }
  const [distanceM, setDistanceM] = useState(0);    // meters traveled
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('idle');

  const watchIdRef = useRef(null);
  const lastPointRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Get initial location immediately on mount so the map and GPS point load right away
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lon, accuracy } = pos.coords;
          setPosition({ lat, lon, accuracy });
        },
        (err) => {
          // Fallback default coordinates (Telde / Gran Canaria)
          setPosition({ lat: 28.0048, lon: -15.4158, accuracy: 100 });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      setPosition({ lat: 28.0048, lon: -15.4158, accuracy: 100 });
    }
  }, []);

  const handlePosition = useCallback((pos) => {
    const { latitude: lat, longitude: lon, accuracy } = pos.coords;
    const newPoint = { lat, lon };

    setPosition({ lat, lon, accuracy });
    setRoute((prev) => [...prev, newPoint]);

    if (lastPointRef.current) {
      const dist = haversineDistance(lastPointRef.current, newPoint);
      // Ignore micro-jitter below 3 meters
      if (dist > 3) {
        setDistanceM((prev) => prev + dist);
        lastPointRef.current = newPoint;
      }
    } else {
      lastPointRef.current = newPoint;
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Tu dispositivo no soporta geolocalización.');
      return;
    }
    setError(null);
    setPermissionState('requesting');

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
  }, [handlePosition]);

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

  const addPoint = useCallback(() => {
    if (position) {
      setPoints(prev => [...prev, { lat: position.lat, lon: position.lon, time: Date.now() }]);
    }
  }, [position]);

  const removePoint = useCallback((index) => {
    setPoints(prev => prev.filter((_, i) => i !== index));
  }, []);

  const resetRoute = useCallback(() => {
    lastPointRef.current = null;
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
    error,
    permissionState,
    startTracking,
    stopTracking,
    addPoint,
    removePoint,
    resetRoute
  };
};
