import { useState, useEffect, useRef, useCallback } from 'react';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Step detection parameters (tuned for human walking vs stationary/chair movements)
const STEP_THRESHOLD = 2.30;       // Linear acceleration threshold in m/s² (filters out chair movements/desk shifts)
const MIN_STEP_INTERVAL_MS = 320;  // Minimum ms between steps (human walking cadence ~350-600ms)
const MAX_STEP_INTERVAL_MS = 2500; // Maximum ms between steps

export const useStepCounter = (initialSteps = 0, options = {}) => {
  const [steps, setSteps] = useState(initialSteps);
  const [isTracking, setIsTracking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionState, setPermissionState] = useState('idle');
  const [alertMsg, setAlertMsg] = useState(null);

  const lastStepTime = useRef(0);
  const lastLinMag = useRef(0);
  const isRising = useRef(false);
  const stepsRef = useRef(initialSteps);
  const wakeLockRef = useRef(null);
  const gravityRef = useRef({ x: 0, y: 0, z: 9.8 });

  // Sync with initialSteps when it arrives from DB
  useEffect(() => {
    if (initialSteps > 0 && stepsRef.current === 0) {
      stepsRef.current = initialSteps;
      setSteps(initialSteps);
    }
  }, [initialSteps]);

  const handleMotion = useCallback((event) => {
    // If vehicle detected externally, pause step counting
    if (options.isVehicleDetected) return;

    let linX = 0, linY = 0, linZ = 0;

    // Use native linear acceleration (gravity already removed by hardware) if available
    if (event.acceleration && event.acceleration.x != null) {
      linX = event.acceleration.x;
      linY = event.acceleration.y;
      linZ = event.acceleration.z;
    } else if (event.accelerationIncludingGravity && event.accelerationIncludingGravity.x != null) {
      // High-pass filter to remove static gravity vector
      const { x, y, z } = event.accelerationIncludingGravity;
      const alpha = 0.8;
      gravityRef.current.x = alpha * gravityRef.current.x + (1 - alpha) * x;
      gravityRef.current.y = alpha * gravityRef.current.y + (1 - alpha) * y;
      gravityRef.current.z = alpha * gravityRef.current.z + (1 - alpha) * z;

      linX = x - gravityRef.current.x;
      linY = y - gravityRef.current.y;
      linZ = z - gravityRef.current.z;
    } else {
      return;
    }

    const linMag = Math.sqrt(linX * linX + linY * linY + linZ * linZ);
    const now = Date.now();

    // Detect upward slope crossing threshold
    if (linMag > STEP_THRESHOLD && !isRising.current) {
      isRising.current = true;
    }

    // Detect peak turning point
    if (isRising.current && linMag < lastLinMag.current) {
      isRising.current = false;
      const interval = now - lastStepTime.current;

      if (interval >= MIN_STEP_INTERVAL_MS) {
        lastStepTime.current = now;
        stepsRef.current += 1;
        setSteps(stepsRef.current);
      }
    }

    lastLinMag.current = linMag;
  }, [options.isVehicleDetected]);

  const startTracking = useCallback(async () => {
    const isMobile = Capacitor.isNativePlatform() || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isMobile && typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const result = await DeviceMotionEvent.requestPermission();
        if (result !== 'granted') {
          setPermissionState('denied');
          setAlertMsg('Permiso de movimiento denegado. Se necesita para contar los pasos.');
          return;
        }
        setPermissionState('granted');
      } catch {
        setPermissionState('denied');
        setAlertMsg('No se pudo acceder al sensor de movimiento. Revisa tus permisos.');
        return;
      }
    } else {
      setPermissionState('granted');
    }

    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
      
      if (Capacitor.isNativePlatform()) {
        let permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display !== 'granted') {
          permStatus = await LocalNotifications.requestPermissions();
          if (permStatus.display !== 'granted') {
            setAlertMsg('Para mantener la app contando pasos de fondo, por favor acepta las notificaciones.');
            return;
          }
        }

        await LocalNotifications.schedule({
          notifications: [
            {
              id: 1,
              title: "Latidos - Contando Pasos",
              body: "La aplicación está contando tus pasos en segundo plano.",
              ongoing: true,
              autoCancel: false
            }
          ]
        });

        await App.minimizeApp();
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }

    if (typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined') {
      window.addEventListener('devicemotion', handleMotion, { passive: true });
    }
    
    setIsTracking(true);
  }, [handleMotion]);

  const stopTracking = useCallback(async () => {
    if (typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined') {
      window.removeEventListener('devicemotion', handleMotion);
    }
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release().catch(console.error);
      wakeLockRef.current = null;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
      } catch (err) {
        console.error(err);
      }
    }

    setIsTracking(false);
  }, [handleMotion]);

  const resetSteps = useCallback(() => {
    stepsRef.current = 0;
    setSteps(0);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined') {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, [handleMotion]);

  return { steps, isTracking, isSupported, permissionState, alertMsg, setAlertMsg, startTracking, stopTracking, resetSteps };
};
