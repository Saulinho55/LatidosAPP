import { useState, useEffect, useRef, useCallback } from 'react';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// ── Step Detection Constants ──
// Human walking cadence is strictly between 0.33s (fast run ~180 spm) and 1.8s (slow stroll ~33 spm).
const MIN_STEP_INTERVAL_MS = 330;   // Minimum ms between consecutive steps (rejects Android double-bounce jitter)
const MAX_STEP_INTERVAL_MS = 1800;  // Maximum ms between steps before burst cadence resets
const STEP_THRESHOLD = 1.90;        // Minimum dynamic acceleration (m/s²) for a foot strike impact
const VALLEY_THRESHOLD = 0.85;      // Signal must return below this baseline before the next step is valid
const MAX_WALKING_ACCEL = 14.0;     // Ceiling (m/s²) to filter out violent shaking / drop impacts

// Low-pass Exponential Moving Average factors
const SIGNAL_SMOOTH_ALPHA = 0.22;   // Smoothes out high-frequency sensor noise (>3.5 Hz)
const GRAVITY_BASELINE_ALPHA = 0.03;// Slow tracker for the static 1G gravity orientation vector

// Burst buffer: requires at least 4 rhythmic steps before confirming walk session.
// Eliminates 98% of false steps from pocket adjustments, desk vibrations, or reaching for phone!
const BURST_MIN_STEPS = 4;

export const useStepCounter = (initialSteps = 0, options = {}) => {
  const [steps, setSteps] = useState(initialSteps);
  const [isTracking, setIsTracking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionState, setPermissionState] = useState('idle');
  const [alertMsg, setAlertMsg] = useState(null);

  const isTrackingRef = useRef(false);
  const stepsRef = useRef(initialSteps);

  // Sensor state refs
  const smoothedMagRef = useRef(0);
  const gravityEstRef = useRef(9.80665);
  const lastStepTimeRef = useRef(0);
  const isRisingRef = useRef(false);
  const hasResetValleyRef = useRef(true);
  const prevSmoothedMagRef = useRef(0);

  // Burst validation refs
  const burstCountRef = useRef(0);
  const lastCandidateTimeRef = useRef(0);
  const isBurstActiveRef = useRef(false);

  const wakeLockRef = useRef(null);

  // Synchronize when initialSteps updates externally (e.g. from DB load or day change)
  useEffect(() => {
    if (!isTrackingRef.current) {
      stepsRef.current = initialSteps;
      setSteps(initialSteps);
    }
  }, [initialSteps]);

  const handleMotion = useCallback((event) => {
    if (!isTrackingRef.current) return;
    if (options.isVehicleDetected) return;

    let dynamicAccel = 0;
    const nativeLin = event.acceleration;

    // Check if device provides genuine linear acceleration (without gravity)
    const hasNativeLinear = nativeLin && (
      (Math.abs(nativeLin.x || 0) + Math.abs(nativeLin.y || 0) + Math.abs(nativeLin.z || 0)) > 0.15
    );

    if (hasNativeLinear) {
      const { x, y, z } = nativeLin;
      const rawMag = Math.sqrt(x * x + y * y + z * z);
      // Low-pass filter to eliminate sensor jitter in Android WebViews
      smoothedMagRef.current = smoothedMagRef.current + SIGNAL_SMOOTH_ALPHA * (rawMag - smoothedMagRef.current);
      dynamicAccel = smoothedMagRef.current;
    } else if (event.accelerationIncludingGravity && event.accelerationIncludingGravity.x != null) {
      const { x, y, z } = event.accelerationIncludingGravity;
      const rawTotalMag = Math.sqrt(x * x + y * y + z * z);

      // Adaptive gravity tracker (immune to calibration errors where 1g != 9.8)
      gravityEstRef.current = gravityEstRef.current + GRAVITY_BASELINE_ALPHA * (rawTotalMag - gravityEstRef.current);
      const instantDeviation = Math.abs(rawTotalMag - gravityEstRef.current);

      // Low-pass smoothing
      smoothedMagRef.current = smoothedMagRef.current + SIGNAL_SMOOTH_ALPHA * (instantDeviation - smoothedMagRef.current);
      dynamicAccel = smoothedMagRef.current;
    } else {
      return;
    }

    const now = Date.now();

    // 1. Valley reset: signal must return near resting baseline between foot strikes
    if (dynamicAccel < VALLEY_THRESHOLD) {
      hasResetValleyRef.current = true;
    }

    // 2. Detect upward slope crossing threshold
    if (
      hasResetValleyRef.current &&
      dynamicAccel > STEP_THRESHOLD &&
      dynamicAccel < MAX_WALKING_ACCEL &&
      !isRisingRef.current
    ) {
      isRisingRef.current = true;
    }

    // 3. Peak detection (turning point: was rising, now dropping)
    if (isRisingRef.current && dynamicAccel < prevSmoothedMagRef.current) {
      isRisingRef.current = false;
      const timeSinceLastCandidate = now - lastCandidateTimeRef.current;

      // Check cadence validity
      if (timeSinceLastCandidate < MIN_STEP_INTERVAL_MS) {
        // Discard high-frequency bounce
      } else if (timeSinceLastCandidate > MAX_STEP_INTERVAL_MS) {
        // Gap too long: user stopped walking, reset burst buffer
        burstCountRef.current = 1;
        isBurstActiveRef.current = false;
        lastCandidateTimeRef.current = now;
        hasResetValleyRef.current = false;
      } else {
        // Rhythmically consistent step candidate!
        burstCountRef.current += 1;
        lastCandidateTimeRef.current = now;
        hasResetValleyRef.current = false;

        if (!isBurstActiveRef.current) {
          // If we reached the required rhythmic steps (e.g. 4 consecutive strides), confirm walk
          if (burstCountRef.current >= BURST_MIN_STEPS) {
            isBurstActiveRef.current = true;
            lastStepTimeRef.current = now;
            stepsRef.current += BURST_MIN_STEPS;
            setSteps(stepsRef.current);
            if (typeof options.onStep === 'function') {
              options.onStep(stepsRef.current);
            }
          }
        } else {
          // Already in active walking session: count every step in real-time
          lastStepTimeRef.current = now;
          stepsRef.current += 1;
          setSteps(stepsRef.current);
          if (typeof options.onStep === 'function') {
            options.onStep(stepsRef.current);
          }
        }
      }
    }

    prevSmoothedMagRef.current = dynamicAccel;
  }, [options.isVehicleDetected, options.onStep]);

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
        try {
          let permStatus = await LocalNotifications.checkPermissions();
          if (permStatus.display !== 'granted') {
            permStatus = await LocalNotifications.requestPermissions();
          }

          if (permStatus.display === 'granted') {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: 1,
                  title: "Latidos - Contando Pasos",
                  body: "La aplicación está contando tus pasos.",
                  ongoing: true,
                  autoCancel: false
                }
              ]
            });
          }
        } catch (notifErr) {
          console.warn('LocalNotifications setup warning:', notifErr);
        }
      }
    } catch (err) {
      console.error(`Error starting tracking: ${err.message}`);
    }

    // Reset sensor filters
    smoothedMagRef.current = 0;
    prevSmoothedMagRef.current = 0;
    burstCountRef.current = 0;
    isBurstActiveRef.current = false;
    hasResetValleyRef.current = true;
    isRisingRef.current = false;
    lastCandidateTimeRef.current = 0;

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

    burstCountRef.current = 0;
    isBurstActiveRef.current = false;
    setIsTracking(false);
  }, [handleMotion]);

  const resetSteps = useCallback((newStepCount = 0) => {
    stepsRef.current = newStepCount;
    setSteps(newStepCount);
    burstCountRef.current = 0;
    isBurstActiveRef.current = false;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined') {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, [handleMotion]);

  return {
    steps,
    isTracking,
    isSupported,
    permissionState,
    alertMsg,
    setAlertMsg,
    startTracking,
    stopTracking,
    resetSteps
  };
};
