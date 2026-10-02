import { useState, useEffect, useRef, useCallback } from 'react';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Step detection parameters
// These values work on Android (native + gravity fallback) and iOS
const STEP_THRESHOLD = 1.75;        // Minimum dynamic acceleration (m/s²) for a foot strike
const VALLEY_THRESHOLD = 1.10;      // Signal must return below this before counting next step
const MAX_WALKING_ACCEL = 14.0;     // Upper ceiling (m/s²) - rejects violent shakes
const MIN_STEP_INTERVAL_MS = 300;   // Minimum ms between steps (~200spm max)
const MAX_STEP_INTERVAL_MS = 2200;  // Maximum ms between steps

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

  // Sync with initialSteps when it arrives from DB (only if not currently tracking)
  useEffect(() => {
    if (!isTrackingRef.current) {
      stepsRef.current = initialSteps;
      setSteps(initialSteps);
    }
  }, [initialSteps]);

  const handleMotion = useCallback((event) => {
    if (!isTrackingRef.current) return;
    if (options.isVehicleDetected) return;

    let linMag = 0;
    const nativeLin = event.acceleration;

    // Android Zero-Trap Fix:
    // Many Android WebViews expose event.acceleration = {x:0, y:0, z:0}
    // Only use native linear if it has real non-zero readings
    const hasNativeLinear = nativeLin && (
      (Math.abs(nativeLin.x || 0) + Math.abs(nativeLin.y || 0) + Math.abs(nativeLin.z || 0)) > 0.12
    );

    if (hasNativeLinear) {
      const { x, y, z } = nativeLin;
      linMag = Math.sqrt(x * x + y * y + z * z);
    } else if (event.accelerationIncludingGravity && event.accelerationIncludingGravity.x != null) {
      // Subtract gravity norm: |sqrt(x²+y²+z²) - 9.80665|
      // Stationary tilt/rotation → ≈0 m/s², walking foot strike → 1.5-3.5 m/s²
      const { x, y, z } = event.accelerationIncludingGravity;
      const totalMag = Math.sqrt(x * x + y * y + z * z);
      linMag = Math.abs(totalMag - 9.80665);
    } else {
      return;
    }

    const now = Date.now();

    // Valley reset: signal must return to baseline between foot strikes
    if (linMag < VALLEY_THRESHOLD) {
      hasResetValley.current = true;
    }

    // Rising edge: signal crossing threshold from below
    if (hasResetValley.current && linMag > STEP_THRESHOLD && linMag < MAX_WALKING_ACCEL && !isRising.current) {
      isRising.current = true;
    }

    // Peak detection: signal turning down after rising past threshold
    if (isRising.current && linMag < lastLinMag.current) {
      isRising.current = false;
      const interval = now - lastStepTime.current;

      if (interval >= MIN_STEP_INTERVAL_MS && interval <= MAX_STEP_INTERVAL_MS && linMag < MAX_WALKING_ACCEL) {
        lastStepTime.current = now;
        hasResetValley.current = false;
        stepsRef.current += 1;
        setSteps(stepsRef.current);
        if (typeof options.onStep === 'function') {
          options.onStep(stepsRef.current);
        }
      } else if (interval > MAX_STEP_INTERVAL_MS) {
        // Long pause: still allow first step after pause
        lastStepTime.current = now;
        hasResetValley.current = false;
        stepsRef.current += 1;
        setSteps(stepsRef.current);
        if (typeof options.onStep === 'function') {
          options.onStep(stepsRef.current);
        }
      }
    }

    lastLinMag.current = linMag;
  }, [options.isVehicleDetected, options.onStep]);

  const startTracking = useCallback(async () => {
    const isMobile = Capacitor.isNativePlatform() || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    // iOS 13+ requires explicit permission for DeviceMotion
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

    // Wake Lock to keep screen on during tracking
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }

      // Capacitor native: try to schedule a persistent notification (non-blocking)
      if (Capacitor.isNativePlatform()) {
        try {
          let permStatus = await LocalNotifications.checkPermissions();
          if (permStatus.display !== 'granted') {
            permStatus = await LocalNotifications.requestPermissions();
          }
          if (permStatus.display === 'granted') {
            await LocalNotifications.schedule({
              notifications: [{
                id: 1,
                title: 'Latidos - Contando Pasos',
                body: 'La aplicación está contando tus pasos.',
                ongoing: true,
                autoCancel: false
              }]
            });
          }
        } catch (notifErr) {
          console.warn('LocalNotifications warning:', notifErr);
          // Do NOT return — we still want to count steps even without notification
        }
      }
    } catch (err) {
      console.warn('startTracking setup warning:', err.message);
    }

    // Reset sensor state
    lastStepTime.current = 0;
    lastLinMag.current = 0;
    isRising.current = false;
    hasResetValley.current = true;

    if (typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined') {
      window.addEventListener('devicemotion', handleMotion, { passive: true });
    } else {
      setIsSupported(false);
      setAlertMsg('Tu dispositivo no soporta el sensor de movimiento.');
      return;
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
      try { wakeLockRef.current.release(); } catch (e) {}
      wakeLockRef.current = null;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
      } catch (err) {
        console.warn('Stop notification warning:', err);
      }
    }

    setIsTracking(false);
  }, [handleMotion]);

  const resetSteps = useCallback((newCount = 0) => {
    stepsRef.current = newCount;
    setSteps(newCount);
  }, []);

  // Clean up listener on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined') {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, [handleMotion]);

  return { steps, isTracking, isSupported, permissionState, alertMsg, setAlertMsg, startTracking, stopTracking, resetSteps };
};
