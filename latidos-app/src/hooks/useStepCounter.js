import { useState, useEffect, useRef, useCallback } from 'react';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Step detection algorithm using accelerometer
// Detects realistic human walking cadence (300ms - 1100ms) and rejects vehicular road vibrations
const STEP_THRESHOLD_MIN = 1.15;   // minimum g-force delta
const STEP_THRESHOLD_MAX = 3.20;   // maximum g-force delta (car potholes / drops exceed this)
const MIN_STEP_INTERVAL_MS = 300; // minimum ms between steps (~200 steps/min sprint limit)
const MAX_STEP_INTERVAL_MS = 1200; // maximum ms between steps to maintain walking cadence

export const useStepCounter = (initialSteps = 0, options = {}) => {
  const [steps, setSteps] = useState(initialSteps);
  const [isTracking, setIsTracking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionState, setPermissionState] = useState('idle');
  const [alertMsg, setAlertMsg] = useState(null);

  const lastStepTime = useRef(0);
  const lastMag = useRef(0);
  const isRising = useRef(false);
  const stepsRef = useRef(initialSteps);
  const wakeLockRef = useRef(null);
  
  // Rhythmic step buffer (requires 3 consecutive rhythmic steps before committing to prevent road bumps)
  const candidateStepTimes = useRef([]);

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

    const { x, y, z } = event.accelerationIncludingGravity || {};
    if (x == null || y == null || z == null) return;

    const mag = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();
    const deltaMag = mag - lastMag.current;

    // Detect rising edge crossing threshold within human walking acceleration range
    if (deltaMag > STEP_THRESHOLD_MIN && deltaMag < STEP_THRESHOLD_MAX && !isRising.current) {
      isRising.current = true;
    }

    // Detect falling edge — peak passed, evaluate step candidate
    if (isRising.current && mag < lastMag.current - 0.25) {
      isRising.current = false;
      const interval = now - lastStepTime.current;

      // Reject road noise if too fast (engine vibration < 300ms)
      if (interval >= MIN_STEP_INTERVAL_MS) {
        if (interval <= MAX_STEP_INTERVAL_MS) {
          // Cadence match: consecutive step in rhythmic window
          candidateStepTimes.current.push(now);
          if (candidateStepTimes.current.length >= 3) {
            // Valid continuous walking detected!
            stepsRef.current += (candidateStepTimes.current.length === 3 ? 3 : 1);
            setSteps(stepsRef.current);
          }
        } else {
          // Reset rhythm sequence after pause
          candidateStepTimes.current = [now];
        }
        lastStepTime.current = now;
      }
    }

    lastMag.current = mag;
  }, [options.isVehicleDetected]);

  const startTracking = useCallback(async () => {
    const isDesktopWeb = !Capacitor.isNativePlatform() && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (!isDesktopWeb && typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
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
      } else {
        setAlertMsg('Modo de prueba (Web): En tu ordenador no se minimiza ni hay notificaciones nativas. Simulando pasos...');
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }

    if (!isDesktopWeb && typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined') {
      window.addEventListener('devicemotion', handleMotion);
    } else {
      // Mock step counting for PC without sensors
      window._mockStepInterval = setInterval(() => {
        stepsRef.current += 1;
        setSteps(stepsRef.current);
      }, 1000);
    }
    
    setIsTracking(true);
  }, [handleMotion]);

  const stopTracking = useCallback(async () => {
    const isDesktopWeb = !Capacitor.isNativePlatform() && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (!isDesktopWeb && typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined') {
      window.removeEventListener('devicemotion', handleMotion);
    } else {
      clearInterval(window._mockStepInterval);
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
      const isDesktopWeb = !Capacitor.isNativePlatform() && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      if (!isDesktopWeb && typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined') {
        window.removeEventListener('devicemotion', handleMotion);
      } else {
        clearInterval(window._mockStepInterval);
      }
    };
  }, [handleMotion]);

  return { steps, isTracking, isSupported, permissionState, alertMsg, setAlertMsg, startTracking, stopTracking, resetSteps };
};
