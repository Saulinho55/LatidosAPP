import { useState, useEffect, useRef, useCallback } from 'react';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Step detection parameters (tuned for human walking impact vs orientation changes)
const STEP_THRESHOLD = 2.45;        // Peak acceleration deviation in m/s² (stride impact)
const VALLEY_THRESHOLD = 1.05;      // Hysteresis reset: must return near 1g baseline between strides
const MAX_WALKING_ACCEL = 12.0;     // Upper ceiling in m/s² (filters out violent manual shaking)
const MIN_STEP_INTERVAL_MS = 380;   // Minimum ms between steps (human walking cadence ~400-650ms)
const MAX_STEP_INTERVAL_MS = 2500;  // Maximum ms between steps

export const useStepCounter = (initialSteps = 0, options = {}) => {
  const [steps, setSteps] = useState(initialSteps);
  const [isTracking, setIsTracking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionState, setPermissionState] = useState('idle');
  const [alertMsg, setAlertMsg] = useState(null);

  const isTrackingRef = useRef(false);
  const lastStepTime = useRef(0);
  const lastLinMag = useRef(0);
  const isRising = useRef(false);
  const hasResetValley = useRef(true);
  const stepsRef = useRef(initialSteps);
  const wakeLockRef = useRef(null);

  // Sync with initialSteps when it arrives from DB
  useEffect(() => {
    if (initialSteps > 0 && stepsRef.current === 0) {
      stepsRef.current = initialSteps;
      setSteps(initialSteps);
    }
  }, [initialSteps]);

  const handleMotion = useCallback((event) => {
    // Only count steps when tracking is actively running
    if (!isTrackingRef.current) return;
    if (options.isVehicleDetected) return;

    let linMag = 0;

    // Use native linear acceleration if available
    if (event.acceleration && event.acceleration.x != null) {
      const { x, y, z } = event.acceleration;
      linMag = Math.sqrt(x * x + y * y + z * z);
    } else if (event.accelerationIncludingGravity && event.accelerationIncludingGravity.x != null) {
      // Magnitude of total vector minus 1g gravity norm (9.80665 m/s²)
      // Stationary tilt/rotation produces |sqrt(x²+y²+z²) - 9.8| ≈ 0 m/s², eliminating ghost steps completely!
      const { x, y, z } = event.accelerationIncludingGravity;
      const totalMag = Math.sqrt(x * x + y * y + z * z);
      linMag = Math.abs(totalMag - 9.80665);
    } else {
      return;
    }

    const now = Date.now();

    // Hysteresis valley reset: signal must return to baseline between foot strikes
    if (linMag < VALLEY_THRESHOLD) {
      hasResetValley.current = true;
    }

    // Detect upward slope crossing threshold
    if (hasResetValley.current && linMag > STEP_THRESHOLD && linMag < MAX_WALKING_ACCEL && !isRising.current) {
      isRising.current = true;
    }

    // Detect peak turning point
    if (isRising.current && linMag < lastLinMag.current) {
      isRising.current = false;
      const interval = now - lastStepTime.current;

      if (interval >= MIN_STEP_INTERVAL_MS && linMag < MAX_WALKING_ACCEL) {
        lastStepTime.current = now;
        hasResetValley.current = false;
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
    
    isTrackingRef.current = true;
    setIsTracking(true);
  }, [handleMotion]);

  const stopTracking = useCallback(async () => {
    isTrackingRef.current = false;
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
