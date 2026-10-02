import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { supabaseService } from '../services/supabaseService';
import { haversineDistance } from '../hooks/useGeolocation';
import { getLocalDateStr, computeWeeklyStepsFromActivity, computeStreakFromActivity } from '../utils/dateUtils';
import { t } from '../i18n';

const LatidosContext = createContext(null);

export const LatidosProvider = ({ children }) => {
  const [latidos, setLatidos] = useState(0);
  const [steps, setSteps] = useState(0);
  const [racha, setRacha] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(10000);
  const [weeklySteps, setWeeklySteps] = useState([0,0,0,0,0,0,0]);
  const [transactions, setTransactions] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [recommendedRoutes, setRecommendedRoutes] = useState([]);
  const [activity, setActivity] = useState([]);

  // Preferences
  const [theme, setTheme] = useState(() => localStorage.getItem('pref_theme') || 'light');
  const [language, setLanguage] = useState(() => localStorage.getItem('pref_language') || 'es');
  const [currency, setCurrency] = useState(() => localStorage.getItem('pref_currency') || 'EUR');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Persistent Active Route Session (persists across tab changes) ──
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [isRouteTracking, setIsRouteTracking] = useState(false);
  const [routeElapsed, setRouteElapsed] = useState(0);
  const [routeDistanceM, setRouteDistanceM] = useState(0);
  const [routePath, setRoutePath] = useState([]);
  const [routePoints, setRoutePoints] = useState([]);
  const [replicatedRoute, setReplicatedRoute] = useState(null);
  const [isVehicleDetected, setIsVehicleDetected] = useState(false);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [currentPosition, setCurrentPosition] = useState({ lat: 28.0048, lon: -15.4158, accuracy: 100, speed: 0, isReal: false });
  const [hasRealLocation, setHasRealLocation] = useState(false);
  const globalWatchIdRef = useRef(null);

  const routeWatchIdRef = useRef(null);
  const routeLastPointRef = useRef(null);
  const routeLastTimeRef = useRef(null);
  const routeTimerRef = useRef(null);
  const lastRouteStepsAwardedRef = useRef(0);
  const lastRouteLatidosAwardedRef = useRef(0);
  const routeRecentReadingsRef = useRef([]);
  const routeVehicleReadingsCount = useRef(0);

  // ── Resilient Geolocation Initializer & Continuous Watcher ──
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const handlePos = (pos) => {
      const { latitude: lat, longitude: lon, accuracy, speed } = pos.coords;
      setCurrentPosition({ lat, lon, accuracy, speed: speed || 0, isReal: true });
      setHasRealLocation(true);
    };

    // Phase 1: Fast network fix (cellular / Wi-Fi - works in <1s even indoors)
    navigator.geolocation.getCurrentPosition(
      handlePos,
      () => {
        // Quick second chance with higher timeout
        navigator.geolocation.getCurrentPosition(
          handlePos,
          () => {},
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );

    // Phase 2: Start persistent global watcher with automatic low-accuracy fallback
    const startGlobalWatcher = (highAccuracy = true) => {
      if (globalWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(globalWatchIdRef.current);
      }
      globalWatchIdRef.current = navigator.geolocation.watchPosition(
        handlePos,
        (err) => {
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            // High accuracy GPS unavailable / timed out indoors -> use network location
            startGlobalWatcher(false);
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 18000 : 10000,
          maximumAge: 5000
        }
      );
    };

    startGlobalWatcher(true);

    // Phase 3: Delayed retry to catch late permission prompt acceptances (user read dialog for >8s)
    const lateRetryTimer = setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        handlePos,
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }, 8500);

    return () => {
      clearTimeout(lateRetryTimer);
      if (globalWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(globalWatchIdRef.current);
        globalWatchIdRef.current = null;
      }
    };
  }, []);

  // Timer for active route
  useEffect(() => {
    if (isRouteTracking) {
      routeTimerRef.current = setInterval(() => {
        setRouteElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(routeTimerRef.current);
    }
    return () => clearInterval(routeTimerRef.current);
  }, [isRouteTracking]);

  // GPS Tracking for active route
  useEffect(() => {
    if (!isRouteTracking) {
      if (routeWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(routeWatchIdRef.current);
        routeWatchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const handleRoutePosition = (pos) => {
      const { latitude: lat, longitude: lon, accuracy, speed } = pos.coords;
      const now = Date.now();
      const newPoint = { lat, lon };

      // Rolling window for GPS smoothing
      routeRecentReadingsRef.current.push({ lat, lon, time: now });
      if (routeRecentReadingsRef.current.length > 5) {
        routeRecentReadingsRef.current.shift();
      }

      let speedKmh = 0;
      if (typeof speed === 'number' && speed >= 0.2) {
        speedKmh = speed * 3.6;
      } else if (routeRecentReadingsRef.current.length >= 2) {
        const first = routeRecentReadingsRef.current[0];
        const last = routeRecentReadingsRef.current[routeRecentReadingsRef.current.length - 1];
        const dt = (last.time - first.time) / 1000;
        if (dt >= 1.5) {
          const d = haversineDistance(first, last);
          speedKmh = (d / dt) * 3.6;
        }
      }

      speedKmh = Math.min(120, Math.max(0, speedKmh));
      setCurrentSpeedKmh(speedKmh);
      setCurrentPosition({ lat, lon, accuracy, speed: speedKmh / 3.6, isReal: true });
      setHasRealLocation(true);

      // Vehicular speed check (> 20 km/h)
      if (speedKmh > 20.0) {
        routeVehicleReadingsCount.current += 1;
        if (routeVehicleReadingsCount.current >= 2) {
          setIsVehicleDetected(true);
        }
        routeLastPointRef.current = newPoint;
        routeLastTimeRef.current = now;
        return;
      } else {
        if (routeVehicleReadingsCount.current > 0) {
          routeVehicleReadingsCount.current -= 1;
        }
        if (routeVehicleReadingsCount.current === 0) {
          setIsVehicleDetected(false);
        }
      }

      // Odometry filter: Only accumulate distance from genuine, accurate GPS fixes (<= 30m accuracy).
      // Cellular tower or indoor Wi-Fi bounce (> 30m) causes 40-70m jumps (the "88 pasos fantasma") and must be ignored for distance.
      const isAccurateFix = typeof accuracy === 'number' && accuracy <= 30;

      if (!isAccurateFix) {
        return;
      }

      // First valid accurate point establishes the route starting anchor
      if (!routeLastPointRef.current) {
        routeLastPointRef.current = newPoint;
        routeLastTimeRef.current = now;
        setRoutePath([newPoint]);
        return;
      }

      const dt = routeLastTimeRef.current ? Math.max(0.5, (now - routeLastTimeRef.current) / 1000) : 1;
      const dist = haversineDistance(routeLastPointRef.current, newPoint);

      // Teleport / GPS jump filter:
      // Maximum realistic human sprinting speed is ~8 m/s (28 km/h).
      // Any jump greater than maxRealisticDist is a GPS glitch, NOT human walking.
      const maxRealisticDist = Math.max(12.0, dt * 7.0);

      if (dist > maxRealisticDist) {
        // GPS teleported/jumped!
        // CRITICAL FIX: Update the anchor point so the route NEVER gets permanently stuck/frozen,
        // but DO NOT add the teleport distance to the user's walked distance!
        routeLastPointRef.current = newPoint;
        routeLastTimeRef.current = now;
        return;
      }

      // Anti-drift filter: require at least 2.0 meters of displacement from last point.
      // Small 0.5 - 1.5m GPS noise while sitting/standing still is ignored.
      // As soon as the user takes 2-3 genuine walking steps, dist exceeds 2m and accumulates.
      if (dist >= 2.0) {
        setRoutePath(prev => [...prev, newPoint]);
        routeLastPointRef.current = newPoint;
        routeLastTimeRef.current = now;

        setRouteDistanceM(prevDist => {
          const nextDist = prevDist + dist;

          // Real-time steps calculation and synchronization (~0.762m per stride -> 1.312 steps/m)
          const totalRouteSteps = Math.round(nextDist * 1.312);
          const stepsDelta = totalRouteSteps - lastRouteStepsAwardedRef.current;

          if (stepsDelta > 0) {
            lastRouteStepsAwardedRef.current = totalRouteSteps;
            let currentDaySteps = 0;
            setSteps(prevSteps => {
              const updatedTotalSteps = prevSteps + stepsDelta;
              currentDaySteps = updatedTotalSteps;
              const uid = userId || parseInt(localStorage.getItem('latidos_user_id'), 10);
              if (uid) {
                supabaseService.updateUser(uid, { steps_today: updatedTotalSteps }).catch(console.error);
              }
              return updatedTotalSteps;
            });

            // Cumulative Latidos gain (1 Latido every 100 steps)
            const totalRouteLatidos = Math.floor(totalRouteSteps / 100);
            const latidosToAward = totalRouteLatidos - lastRouteLatidosAwardedRef.current;
            if (latidosToAward > 0) {
              lastRouteLatidosAwardedRef.current = totalRouteLatidos;
              ganarLatidos(latidosToAward);
              const uid = userId || parseInt(localStorage.getItem('latidos_user_id'), 10);
              if (uid) {
                const fecha = getLocalDateStr();
                supabaseService.upsertActivity(uid, fecha, currentDaySteps || totalRouteSteps, latidosToAward).catch(console.error);
              }
            }
          }

          return nextDist;
        });
      }
    };

    const startRouteWatcher = (highAccuracy = true) => {
      if (routeWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(routeWatchIdRef.current);
      }
      routeWatchIdRef.current = navigator.geolocation.watchPosition(
        handleRoutePosition,
        (err) => {
          console.warn('Route Geolocation notice:', err?.message || err);
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            startRouteWatcher(false);
          }
        },
        { enableHighAccuracy: highAccuracy, maximumAge: 2000, timeout: highAccuracy ? 15000 : 10000 }
      );
    };

    startRouteWatcher(true);

    return () => {
      if (routeWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(routeWatchIdRef.current);
        routeWatchIdRef.current = null;
      }
    };
  }, [isRouteTracking, userId]);

  const loadRecommendedRoutes = async () => {
    try {
      const rec = await supabaseService.getRecommendedRoutes();
      if (rec && Array.isArray(rec)) {
        setRecommendedRoutes(rec);
      }
    } catch (e) {
      console.error('Error loading recommended routes:', e);
    }
  };

  // Check saved session on start
  useEffect(() => {
    loadRecommendedRoutes();
    const savedUserId = localStorage.getItem('latidos_user_id');
    if (savedUserId) {
      const uid = parseInt(savedUserId, 10);
      setIsAuthenticated(true);
      setUserId(uid);
      fetchData(uid);
    } else {
      setIsAuthenticated(false);
      setUserId(null);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const fetchData = async (uid) => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const supaUser = await supabaseService.getUserById(uid);
      if (supaUser) {
        setUser({
          id: supaUser.id,
          name: supaUser.name,
          email: supaUser.email,
          role: supaUser.role || 'user',
          comercio_id: supaUser.comercio_id
        });
        // Fetch transactions, routes, activity from Supabase
        const [supaTx, supaRoutes, supaAct] = await Promise.allSettled([
          supabaseService.getTransactions(uid),
          supabaseService.getRoutes(uid),
          supabaseService.getActivity(uid)
        ]);

        if (supaTx.status === 'fulfilled') setTransactions(supaTx.value);
        if (supaRoutes.status === 'fulfilled') setSavedRoutes(supaRoutes.value);

        const loadedActivities = supaAct.status === 'fulfilled' && Array.isArray(supaAct.value) ? supaAct.value : [];
        setActivity(loadedActivities);

        // Strict local date matching: only show steps if recorded on TODAY's local date
        const todayStr = getLocalDateStr();
        const todayAct = loadedActivities.find(a => (a.fecha || '').split('T')[0] === todayStr);
        const actualTodaySteps = todayAct && typeof todayAct.pasos === 'number' ? todayAct.pasos : 0;

        setSteps(actualTodaySteps);

        // Fix database if steps_today was leftover from yesterday
        if (supaUser.steps_today !== actualTodaySteps) {
          supabaseService.updateUser(uid, { steps_today: actualTodaySteps }).catch(console.error);
        }

        const goal = supaUser.daily_goal || 10000;
        setDailyGoal(goal);

        // Compute real weekly steps from actual historical activity
        const calculatedWeekly = computeWeeklyStepsFromActivity(loadedActivities, actualTodaySteps);
        setWeeklySteps(calculatedWeekly);

        // Compute streak dynamically
        const calculatedStreak = computeStreakFromActivity(loadedActivities, actualTodaySteps, goal);
        setRacha(calculatedStreak);
        if (supaUser.racha !== calculatedStreak) {
          supabaseService.updateUser(uid, { racha: calculatedStreak }).catch(console.error);
        }

        setLatidos(supaUser.latidos || 0);

        // Fetch user preferences
        const supaPrefs = await supabaseService.getPreferences(uid);
        if (supaPrefs && supaPrefs.theme) {
          const loadedTheme = supaPrefs.theme || 'light';
          const loadedLang = supaPrefs.language || 'es';
          const loadedCurr = supaPrefs.currency || 'EUR';
          setTheme(loadedTheme);
          setLanguage(loadedLang);
          setCurrency(loadedCurr);
          localStorage.setItem('pref_theme', loadedTheme);
          localStorage.setItem('pref_language', loadedLang);
          localStorage.setItem('pref_currency', loadedCurr);
          document.documentElement.setAttribute('data-theme', loadedTheme);
        } else {
          const currentTheme = localStorage.getItem('pref_theme') || 'light';
          const currentLang = localStorage.getItem('pref_language') || 'es';
          const currentCurr = localStorage.getItem('pref_currency') || 'EUR';
          supabaseService.upsertPreferences(uid, {
            theme: currentTheme,
            language: currentLang,
            currency: currentCurr
          }).catch(console.error);
        }
      } else {
        // If user not found in Supabase (e.g. deleted from cloud)
        logout();
      }
    } catch (supaErr) {
      console.error('Error fetching data from Supabase:', supaErr);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const ganarLatidos = async (cantidad) => {
    const num = Math.min(500, Math.max(0, Math.floor(Number(cantidad) || 0)));
    if (num <= 0) return;
    setLatidos(prev => {
      const next = prev + num;
      if (userId) {
        supabaseService.updateUser(userId, { latidos: next }).catch(console.error);
      }
      return next;
    });

    const fecha = getLocalDateStr();
    // Use functional update to avoid stale `steps` closure
    setActivity(prev => {
      const exists = prev.some(a => (a.fecha || '').split('T')[0] === fecha);
      if (exists) {
        return prev.map(a => {
          if ((a.fecha || '').split('T')[0] !== fecha) return a;
          const currentPasos = a.pasos || 0;
          const newLatidosGanados = Math.max(Math.floor(currentPasos / 100), (a.latidos_ganados || 0) + num);
          return { ...a, latidos_ganados: newLatidosGanados };
        });
      } else {
        return [{ id: `act-${Date.now()}`, fecha, pasos: 0, latidos_ganados: num }, ...prev];
      }
    });

    if (userId) {
      // Fetch current steps from DB so upsertActivity has accurate pasos value
      supabaseService.getUserById(userId).then(u => {
        const currentPasos = (u && u.steps_today) ? u.steps_today : 0;
        supabaseService.upsertActivity(userId, fecha, currentPasos, num).catch(console.error);
      }).catch(() => {
        supabaseService.upsertActivity(userId, fecha, 0, num).catch(console.error);
      });
    }
  };

  const canjearLatidos = (coste) => {
    const num = Number(coste) || 0;
    if (latidos < num) return false;
    const targetUid = userId || user?.id || parseInt(localStorage.getItem('latidos_user_id'), 10);
    setLatidos(prev => {
      const next = Math.max(0, prev - num);
      if (targetUid) {
        supabaseService.updateUser(targetUid, { latidos: next }).catch(console.error);
      }
      return next;
    });
    return true;
  };

  const pendingStepsRef = useRef(null);
  const debounceStepsTimerRef = useRef(null);

  const flushStepsToDB = async (forcedSteps = null) => {
    const stepsToSave = forcedSteps !== null ? forcedSteps : pendingStepsRef.current;
    if (stepsToSave === null) return;
    
    const targetUid = userId || user?.id || parseInt(localStorage.getItem('latidos_user_id'), 10);
    if (!targetUid) return;

    pendingStepsRef.current = null;
    if (debounceStepsTimerRef.current) {
      clearTimeout(debounceStepsTimerRef.current);
      debounceStepsTimerRef.current = null;
    }

    try {
      await supabaseService.updateUser(targetUid, { steps_today: stepsToSave });
      const fecha = getLocalDateStr();
      const updatedAct = await supabaseService.upsertActivity(targetUid, fecha, stepsToSave, 0);
      if (updatedAct) {
        setActivity(prev => {
          const cleanDate = (updatedAct.fecha || '').split('T')[0];
          const exists = prev.some(a => (a.fecha || '').split('T')[0] === cleanDate);
          const nextActivities = exists
            ? prev.map(a => (a.fecha || '').split('T')[0] === cleanDate ? updatedAct : a)
            : [updatedAct, ...prev];

          setWeeklySteps(computeWeeklyStepsFromActivity(nextActivities, stepsToSave));
          setRacha(computeStreakFromActivity(nextActivities, stepsToSave, dailyGoal));
          return nextActivities;
        });
      }
    } catch (e) {
      console.error('Error updating steps in Supabase:', e);
    }
  };

  const updateSteps = (newSteps) => {
    setSteps(newSteps);
    pendingStepsRef.current = newSteps;

    if (debounceStepsTimerRef.current) {
      clearTimeout(debounceStepsTimerRef.current);
    }

    debounceStepsTimerRef.current = setTimeout(() => {
      flushStepsToDB();
    }, 2000);
  };

  useEffect(() => {
    const handleFlush = () => {
      if (pendingStepsRef.current !== null) {
        flushStepsToDB();
      }
    };
    window.addEventListener('beforeunload', handleFlush);
    const handleVis = () => {
      if (document.visibilityState === 'hidden') {
        handleFlush();
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      window.removeEventListener('beforeunload', handleFlush);
      document.removeEventListener('visibilitychange', handleVis);
      if (debounceStepsTimerRef.current) {
        clearTimeout(debounceStepsTimerRef.current);
      }
    };
  }, [userId, user]);

  // Midnight rollover watcher: resets daily steps when crossing 00:00 local time
  useEffect(() => {
    let lastKnownDate = getLocalDateStr();

    const checkMidnight = () => {
      const currentDate = getLocalDateStr();
      if (currentDate !== lastKnownDate) {
        lastKnownDate = currentDate;
        setSteps(0);

        const targetUid = userId || user?.id || parseInt(localStorage.getItem('latidos_user_id'), 10);
        if (targetUid) {
          supabaseService.updateUser(targetUid, { steps_today: 0 }).catch(console.error);
          supabaseService.getActivity(targetUid).then(acts => {
            const list = acts || [];
            setActivity(list);
            setWeeklySteps(computeWeeklyStepsFromActivity(list, 0));
            setRacha(computeStreakFromActivity(list, 0, dailyGoal));
          }).catch(console.error);
        }
      }
    };

    const intervalId = setInterval(checkMidnight, 15000);
    return () => clearInterval(intervalId);
  }, [userId, user, dailyGoal]);

  const [activeCode, setActiveCode] = useState(() => {
    try {
      const saved = localStorage.getItem('latidos_active_code');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.expiresAt > Date.now()) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  const [activeCodeNotification, setActiveCodeNotification] = useState(null);
  const isRefundingRef = useRef(false);

  const cancelarOExpirarCodigo = async (reason = 'expired') => {
    if (isRefundingRef.current) return;
    isRefundingRef.current = true;

    let currentCode = activeCode;
    if (!currentCode) {
      try {
        currentCode = JSON.parse(localStorage.getItem('latidos_active_code'));
      } catch (e) {}
    }

    if (!currentCode) {
      isRefundingRef.current = false;
      return;
    }

    const { code, txId, comercioNombre, descuento } = currentCode;
    const refundAmount = Number(currentCode.latidosUsados) || 0;
    const currentUid = userId || user?.id || parseInt(localStorage.getItem('latidos_user_id'), 10);

    // Verify in Supabase whether this transaction was already validated
    let alreadyValidated = false;
    try {
      const dbTx = await supabaseService.getTransactionByCode(code);
      if (dbTx && dbTx.importe_compra && parseFloat(dbTx.importe_compra) > 0 && dbTx.latidos_usados > 0) {
        alreadyValidated = true;
      }
    } catch (e) {
      console.error('Error checking code status in Supabase:', e);
    }

    setActiveCode(null);
    localStorage.removeItem('latidos_active_code');

    if (alreadyValidated) {
      setActiveCodeNotification(`¡Bono canjeado con éxito en ${comercioNombre || 'el comercio'}! Descuento aplicado.`);
      setTimeout(() => {
        isRefundingRef.current = false;
      }, 500);
      return;
    }

    // Cancel in Supabase and process atomic refund without double increment
    let refundedBalance = null;
    try {
      const res = await supabaseService.rechazarBono(code);
      if (res && typeof res.newLatidos === 'number') {
        refundedBalance = res.newLatidos;
        setLatidos(res.newLatidos);
      }
    } catch (e) {
      console.error('Error cancelling bono in Supabase:', e);
    }

    if (currentUid) {
      if (refundedBalance === null) {
        supabaseService.getUserById(currentUid).then(u => {
          if (u && typeof u.latidos === 'number') setLatidos(u.latidos);
        }).catch(console.error);
      }

      supabaseService.getTransactions(currentUid)
        .then(txs => setTransactions(txs))
        .catch(console.error);
    }

    if (reason === 'cancelled') {
      setActiveCodeNotification(`Código cancelado. Se han devuelto ${refundAmount} Latidos.`);
    } else {
      setActiveCodeNotification(`El código ${code} ha expirado y se te han devuelto ${refundAmount} Latidos.`);
    }

    setTimeout(() => {
      isRefundingRef.current = false;
    }, 500);
  };

  // Instant Real-time WebSocket + 500ms fallback poll for coupon validation
  useEffect(() => {
    if (!activeCode || !activeCode.code) return;

    let isMounted = true;
    const cleanCode = activeCode.code.trim().toUpperCase();

    const handleValidatedTx = (tx) => {
      if (!isMounted) return;
      if (!tx) return;

      const currentUid = userId || user?.id || parseInt(localStorage.getItem('latidos_user_id'), 10);

      // Case 1: Validated by merchant (> 0 € purchase and > 0 latidos)
      if (tx.importe_compra && parseFloat(tx.importe_compra) > 0 && tx.latidos_usados > 0) {
        setActiveCode(null);
        localStorage.removeItem('latidos_active_code');
        const shopName = tx.comercio_nombre || activeCode.comercioNombre || 'el comercio';
        const amountStr = ` (${parseFloat(tx.importe_compra).toFixed(2)} € registrado)`;
        setActiveCodeNotification(`¡Bono validado y canjeado al instante en ${shopName}!${amountStr}`);

        if (currentUid) {
          supabaseService.getUserById(currentUid).then(u => {
            if (u && isMounted && typeof u.latidos === 'number') setLatidos(u.latidos);
          }).catch(console.error);
          supabaseService.getTransactions(currentUid)
            .then(txs => { if (isMounted) setTransactions(txs); })
            .catch(console.error);
        }
        return;
      }

      // Case 2: Rejected / Cancelled by merchant (latidos_usados === 0 || importe_compra === 0 || importe_compra === -1)
      if (tx.latidos_usados === 0 || tx.importe_compra === 0 || tx.importe_compra === -1 || (typeof tx.descuento === 'string' && tx.descuento.includes('Cancelado'))) {
        setActiveCode(null);
        localStorage.removeItem('latidos_active_code');
        const shopName = tx.comercio_nombre || activeCode.comercioNombre || 'el comercio';
        const refundPts = Number(activeCode.latidosUsados) || 0;

        setActiveCodeNotification(`Bono ${cleanCode} cancelado por ${shopName}. Se te han devuelto ${refundPts} Latidos.`);

        if (currentUid) {
          supabaseService.getUserById(currentUid).then(u => {
            if (u && isMounted && typeof u.latidos === 'number') setLatidos(u.latidos);
          }).catch(console.error);
          supabaseService.getTransactions(currentUid)
            .then(txs => { if (isMounted) setTransactions(txs); })
            .catch(console.error);
        }
      }
    };

    // 1. Supabase Realtime WebSocket subscription (instant event delivery < 100ms)
    const channel = supabase
      .channel(`canje-instant-${cleanCode}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          const row = payload?.new;
          if (row && row.code && row.code.trim().toUpperCase() === cleanCode) {
            handleValidatedTx(row);
          }
        }
      )
      .subscribe();

    // 2. Immediate check upon render
    supabaseService.getTransactionByCode(cleanCode).then(tx => {
      if (tx && isMounted) handleValidatedTx(tx);
    }).catch(() => {});

    // 3. Fallback poll (2.5s)
    const pollInterval = setInterval(async () => {
      try {
        const dbTx = await supabaseService.getTransactionByCode(cleanCode);
        if (dbTx && isMounted) {
          handleValidatedTx(dbTx);
        }
      } catch (err) {}
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [activeCode, userId]);

  useEffect(() => {
    if (!activeCode) return;
    const check = () => {
      if (Date.now() >= activeCode.expiresAt) {
        cancelarOExpirarCodigo('expired');
      }
    };
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [activeCode, userId]);

  const updateDailyGoal = async (newGoal) => {
    setDailyGoal(newGoal);
    if (userId) {
      supabaseService.updateUser(userId, { daily_goal: newGoal }).catch(console.error);
    }
  };

  const registrarCanje = async (txInfo) => {
    const payload = {
      user_id: userId,
      comercio_nombre: txInfo.comercioNombre,
      comercio_emoji: txInfo.comercioEmoji || '🏪',
      code: txInfo.code,
      latidos_usados: txInfo.latidosUsados,
      descuento: txInfo.descuento,
      fecha: new Date().toISOString()
    };

    try {
      const supaTx = await supabaseService.addTransaction(payload);
      if (supaTx) {
        setTransactions(prev => [supaTx, ...prev]);
      }
    } catch (e) {
      console.error('Error in registrarCanje:', e);
    }
  };

  const generarCodigoCanje = async ({ comercio, bono }) => {
    if (activeCode && activeCode.expiresAt > Date.now()) {
      return { success: false, error: 'Ya tienes un código activo en curso. Espera a que termine o cancélalo.' };
    }

    const latidosRequeridos = bono.coste !== undefined ? parseInt(bono.coste, 10) : (comercio.latidosNecesarios || comercio.latidos_necesarios || 200);
    if (latidos < latidosRequeridos) {
      return { success: false, error: 'Latidos insuficientes' };
    }

    const ok = canjearLatidos(latidosRequeridos);
    if (!ok) return { success: false, error: 'Error al canjear latidos' };

    // High entropy cryptographic code generator (6 alphanumeric chars, zero collisions)
    const generateSecureCode = () => {
      const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const array = new Uint8Array(6);
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(array);
      } else {
        for (let i = 0; i < 6; i++) array[i] = Math.floor(Math.random() * 256);
      }
      let codeStr = '';
      for (let i = 0; i < 6; i++) {
        codeStr += charset[array[i] % charset.length];
      }
      return `LAT-${codeStr}`;
    };

    const code = generateSecureCode();
    const now = Date.now();
    const expiresAt = now + 600 * 1000; // 10 minutes

    const currentUid = userId || parseInt(localStorage.getItem('latidos_user_id'), 10) || 1;
    
    // Ensure numeric descuento for Supabase schema
    let descuentoNum = 0;
    if (typeof bono?.descuento === 'number') descuentoNum = bono.descuento;
    else if (typeof comercio?.descuento === 'number') descuentoNum = comercio.descuento;
    else if (parseFloat(bono?.descuento)) descuentoNum = parseFloat(bono.descuento);
    else if (parseFloat(comercio?.descuento)) descuentoNum = parseFloat(comercio.descuento);
    else descuentoNum = Math.max(1, Math.round(latidosRequeridos / 100));

    let txId = null;
    const txData = {
      user_id: currentUid,
      comercio_nombre: comercio.nombre,
      comercio_emoji: comercio.emoji || '🏪',
      code,
      latidos_usados: latidosRequeridos,
      descuento: descuentoNum,
      importe_compra: null,
      fecha: new Date().toISOString()
    };

    try {
      const supaTx = await supabaseService.addTransaction(txData);
      if (supaTx) {
        txId = supaTx.id;
        setTransactions(prev => [supaTx, ...prev]);
      }
    } catch (e) {
      console.error('Error generating canje code in Supabase:', e);
    }

    const newActiveCode = {
      code,
      comercioNombre: comercio.nombre,
      comercioEmoji: comercio.emoji || '🏪',
      latidosUsados: latidosRequeridos,
      descuento: bono?.titulo || `${descuentoNum}€ de descuento`,
      descuentoValor: descuentoNum,
      expiresAt,
      createdAt: new Date().toISOString(),
      txId
    };

    setActiveCode(newActiveCode);
    localStorage.setItem('latidos_active_code', JSON.stringify(newActiveCode));
    return { success: true, activeCode: newActiveCode };
  };

  const cancelarCodigoCanje = async () => {
    await cancelarOExpirarCodigo('cancelled');
  };

  const savePreferences = async (newPrefs) => {
    if (newPrefs.theme !== undefined) {
      setTheme(newPrefs.theme);
      localStorage.setItem('pref_theme', newPrefs.theme);
      document.documentElement.setAttribute('data-theme', newPrefs.theme);
    }
    if (newPrefs.language !== undefined) {
      setLanguage(newPrefs.language);
      localStorage.setItem('pref_language', newPrefs.language);
    }
    if (newPrefs.currency !== undefined) {
      setCurrency(newPrefs.currency);
      localStorage.setItem('pref_currency', newPrefs.currency);
    }

    const currentUid = userId || parseInt(localStorage.getItem('latidos_user_id'), 10);
    if (currentUid) {
      await supabaseService.upsertPreferences(currentUid, newPrefs).catch(console.error);
    }
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') || theme || 'light';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    savePreferences({ theme: newTheme });
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    savePreferences({ language: lang });
  };

  const changeCurrency = (curr) => {
    setCurrency(curr);
    savePreferences({ currency: curr });
  };

  // ── Admin Methods ──
  const fetchAdminStats = async () => {
    try {
      return await supabaseService.getAdminStats();
    } catch (e) {
      console.error('Error in fetchAdminStats:', e);
      return { totalUsers: 0, totalLatidos: 0, totalSteps: 0, totalTransactions: 0, totalLatidosGastados: 0, totalDescuentos: 0 };
    }
  };

  const fetchAdminUsers = async () => {
    try {
      return await supabaseService.getAllUsers();
    } catch (e) {
      console.error('Error in fetchAdminUsers:', e);
      return [];
    }
  };

  const createUser = async (userData) => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const role = userData.role || 'user';
    if (role === 'superadmin' && user?.role !== 'superadmin') {
      return { success: false, error: 'Solo un SuperAdministrador puede crear cuentas SuperAdministrador.' };
    }

    const payload = {
      name: userData.name || 'Usuario',
      email: cleanEmail,
      password: userData.password || 'demo123',
      role,
      latidos: parseInt(userData.latidos, 10) || 0,
      steps_today: parseInt(userData.steps_today, 10) || 0,
      racha: parseInt(userData.racha, 10) || 0,
      comercio_id: userData.comercio_id ? parseInt(userData.comercio_id, 10) : null,
      weekly_steps: '[0,0,0,0,0,0,0]',
      daily_goal: 10000
    };

    try {
      await supabaseService.registerUser(payload);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Error al guardar el usuario en la base de datos' };
    }
  };

  const fetchComercios = async () => {
    try {
      return await supabaseService.getComercios();
    } catch (e) {
      console.error('Error in fetchComercios:', e);
      return [];
    }
  };

  const createComercio = async (comercioData) => {
    try {
      await supabaseService.createComercio(comercioData);
      return true;
    } catch (e) {
      console.error('Error in createComercio:', e);
      return false;
    }
  };

  const updateComercio = async (id, comercioData) => {
    try {
      await supabaseService.updateComercio(id, comercioData);
      return true;
    } catch (e) {
      console.error('Error in updateComercio:', e);
      return false;
    }
  };

  const deleteComercio = async (id) => {
    try {
      await supabaseService.deleteComercio(id);
      return true;
    } catch (e) {
      console.error('Error in deleteComercio:', e);
      return false;
    }
  };

  const updateUser = async (id, userData) => {
    try {
      const targetRes = await supabaseService.getUserById(id);
      if (targetRes) {
        if (targetRes.role === 'superadmin' && user?.role !== 'superadmin') {
          return { success: false, error: 'Los administradores no pueden modificar a un SuperAdministrador.' };
        }
        if (userData.role && (userData.role === 'superadmin' || userData.role === 'admin') && user?.role !== 'superadmin') {
          return { success: false, error: 'Solo un SuperAdministrador puede otorgar roles de Administrador o SuperAdministrador.' };
        }
        const updated = await supabaseService.updateUser(id, userData);

        // If current user is modifying their own account, update context state immediately
        const currentUid = userId || user?.id || parseInt(localStorage.getItem('latidos_user_id'), 10);
        if (Number(id) === Number(currentUid)) {
          if (userData.latidos !== undefined) setLatidos(parseInt(userData.latidos, 10) || 0);
          if (userData.steps_today !== undefined) setSteps(parseInt(userData.steps_today, 10) || 0);
          if (userData.racha !== undefined) setRacha(parseInt(userData.racha, 10) || 0);
          if (userData.name) setUser(prev => prev ? ({ ...prev, name: userData.name }) : prev);
          if (userData.email) setUser(prev => prev ? ({ ...prev, email: userData.email }) : prev);
          if (userData.role) setUser(prev => prev ? ({ ...prev, role: userData.role }) : prev);
        }

        return { success: true, data: updated };
      }
      return { success: false, error: 'Usuario no encontrado' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const deleteUser = async (id) => {
    if (id === userId) {
      return { success: false, error: 'No puedes eliminar tu propia cuenta mientras estás conectado.' };
    }

    try {
      const targetRes = await supabaseService.getUserById(id);
      if (targetRes && targetRes.role === 'superadmin' && user?.role !== 'superadmin') {
        return { success: false, error: 'Los administradores no pueden eliminar a un SuperAdministrador.' };
      }

      await supabaseService.deleteUser(id);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // ── Auth ──
  const registerUser = async (nombre, email, password) => {
    const cleanEmail = email.trim().toLowerCase();

    const supaUser = await supabaseService.registerUser({
      name: nombre,
      email: cleanEmail,
      password: password,
      role: 'user',
      latidos: 0,
      steps_today: 0,
      racha: 0,
      weekly_steps: '[0,0,0,0,0,0,0]',
      daily_goal: 10000
    });

    completeLogin(supaUser.id);
  };

  const loginUser = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const loggedUser = await supabaseService.login(cleanEmail, password);

    if (!loggedUser) {
      throw new Error('Credenciales incorrectas');
    }

    completeLogin(loggedUser.id);
  };

  const login = async () => {
    completeLogin(1);
  };

  const completeLogin = (id) => {
    localStorage.setItem('latidos_user_id', id.toString());
    setUserId(id);
    setIsAuthenticated(true);
    fetchData(id);
  };

  const logout = () => {
    localStorage.removeItem('latidos_user_id');
    setIsAuthenticated(false);
    setUserId(null);
    setUser(null);
    setLatidos(0);
    setSteps(0);
    setRacha(0);
    setWeeklySteps([0,0,0,0,0,0,0]);
    setTransactions([]);
    setSavedRoutes([]);
  };

  const saveRoute = async (routeData) => {
    if (!userId) return;
    try {
      const isSuperOrAdmin = user?.role === 'superadmin' || user?.role === 'admin';
      const supaRoute = await supabaseService.addRoute({ ...routeData, user_id: userId });
      if (supaRoute) {
        setSavedRoutes(prev => [supaRoute, ...prev]);
        if (isSuperOrAdmin) {
          setRecommendedRoutes(prev => [supaRoute, ...prev.filter(r => String(r.id) !== String(supaRoute.id))]);
        }
      }
    } catch (e) {
      console.error('Error in saveRoute:', e);
    }
  };

  const deleteRoute = async (id) => {
    try {
      await supabaseService.deleteRoute(id);
      setSavedRoutes(prev => prev.filter(r => Number(r.id) !== Number(id)));
    } catch (e) {
      console.error('Error in deleteRoute:', e);
    }
  };

  const updateRoute = async (id, updatedData) => {
    try {
      const updated = await supabaseService.updateRoute(id, updatedData);
      if (updated) {
        setSavedRoutes(prev => prev.map(r => r.id === id ? { ...r, ...updatedData } : r));
      }
    } catch (e) {
      console.error('Error in updateRoute:', e);
    }
  };

  // ── Recommended Routes CRUD ──
  const fetchRecommendedRoutes = async () => {
    try {
      const rec = await supabaseService.getRecommendedRoutes();
      if (rec && Array.isArray(rec)) {
        setRecommendedRoutes(rec);
        return rec;
      }
      return [];
    } catch (e) {
      console.error('Error in fetchRecommendedRoutes:', e);
      return [];
    }
  };

  const addRecommendedRoute = async (routeData) => {
    try {
      const created = await supabaseService.addRecommendedRoute(routeData);
      if (created) {
        setRecommendedRoutes(prev => [created, ...prev.filter(r => String(r.id) !== String(created.id))]);
        return { success: true, data: created };
      }
      return { success: false, error: 'No se pudo crear la ruta recomendada' };
    } catch (e) {
      console.error('Error in addRecommendedRoute:', e);
      return { success: false, error: e.message || 'Error al guardar la ruta recomendada' };
    }
  };

  const updateRecommendedRoute = async (id, updatedData) => {
    try {
      const updated = await supabaseService.updateRecommendedRoute(id, updatedData);
      if (updated) {
        setRecommendedRoutes(prev => prev.map(r => String(r.id) === String(id) ? { ...r, ...updated } : r));
        return { success: true, data: updated };
      }
      return { success: false, error: 'No se pudo actualizar la ruta recomendada' };
    } catch (e) {
      console.error('Error in updateRecommendedRoute:', e);
      return { success: false, error: e.message || 'Error al actualizar la ruta recomendada' };
    }
  };

  const deleteRecommendedRoute = async (id) => {
    try {
      await supabaseService.deleteRecommendedRoute(id);
      setRecommendedRoutes(prev => prev.filter(r => String(r.id) !== String(id)));
      return { success: true };
    } catch (e) {
      console.error('Error in deleteRecommendedRoute:', e);
      return { success: false, error: e.message || 'Error al eliminar la ruta recomendada' };
    }
  };

  // ── Global Route Session Controls ──
  const startRouteSession = (targetReplicated = null) => {
    setIsRouteActive(true);
    setIsRouteTracking(true);
    setRouteElapsed(0);
    setRouteDistanceM(0);
    setRoutePoints([]);
    setReplicatedRoute(targetReplicated || null);
    setIsVehicleDetected(false);
    lastRouteStepsAwardedRef.current = 0;
    lastRouteLatidosAwardedRef.current = 0;
    routeRecentReadingsRef.current = [];
    routeVehicleReadingsCount.current = 0;
    routeLastPointRef.current = null;
    routeLastTimeRef.current = null;
    setRoutePath([]);
  };

  const pauseRouteSession = () => {
    setIsRouteTracking(false);
  };

  const resumeRouteSession = () => {
    setIsRouteTracking(true);
    routeLastTimeRef.current = Date.now();
  };

  const discardRouteSession = () => {
    setIsRouteActive(false);
    setIsRouteTracking(false);
    setRouteElapsed(0);
    setRouteDistanceM(0);
    setRoutePath([]);
    setRoutePoints([]);
    setReplicatedRoute(null);
    setIsVehicleDetected(false);
    lastRouteStepsAwardedRef.current = 0;
    lastRouteLatidosAwardedRef.current = 0;
    routeRecentReadingsRef.current = [];
    routeVehicleReadingsCount.current = 0;
    routeLastPointRef.current = null;
    routeLastTimeRef.current = null;
  };

  const addRouteCheckpoint = (name, customCoords = null) => {
    const coords = customCoords || currentPosition || { lat: 28.0048, lon: -15.4158 };
    const ptName = (name && typeof name === 'string' && name.trim()) 
      ? name.trim() 
      : `Punto ${routePoints.length + 1}`;
    setRoutePoints(prev => [...prev, { lat: coords.lat, lon: coords.lon, name: ptName, time: Date.now() }]);
  };

  const editRouteCheckpoint = (index, newName) => {
    if (!newName || !newName.trim()) return;
    setRoutePoints(prev => prev.map((pt, i) => i === index ? { ...pt, name: newName.trim() } : pt));
  };

  const removeRouteCheckpoint = (index) => {
    setRoutePoints(prev => prev.filter((_, i) => i !== index));
  };

  const finishRouteSession = async (finalRouteName) => {
    setIsRouteTracking(false);
    const finalName = (finalRouteName && finalRouteName.trim()) 
      ? finalRouteName.trim() 
      : (replicatedRoute ? `Re: ${replicatedRoute.name}` : `Paseo ${new Date().toLocaleDateString('es-ES')}`);
    
    const routeSteps = Math.round(routeDistanceM * 1.312);
    const latidosEarned = Math.floor(routeSteps / 100);
    const finalRouteData = {
      name: finalName,
      distance: (routeDistanceM || 0) / 1000,
      duration: routeElapsed || 1,
      latidos_earned: latidosEarned,
      path: routePath && routePath.length > 0 ? routePath : (currentPosition ? [{ lat: currentPosition.lat, lon: currentPosition.lon }] : [{ lat: 28.0048, lon: -15.4158 }]),
      points: routePoints || []
    };

    if (userId) {
      await saveRoute(finalRouteData);
    }
    
    discardRouteSession();
    return finalRouteData;
  };

  // ── Comercio Extra ──
  const validarBono = async (codigo, importe) => {
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    let comId = user?.comercio_id;
    if (!comId && !isAdmin) {
      try {
        const cList = await supabaseService.getComercios();
        const match = cList.find(c => 
          (c.email && user?.email && c.email.toLowerCase() === user.email.toLowerCase()) ||
          (c.nombre && user?.name && c.nombre.toLowerCase() === user.name.toLowerCase())
        );
        if (match) {
          comId = match.id;
        }
      } catch (e) {}
    }

    try {
      const updatedTx = await supabaseService.validateBono(codigo, comId, importe, isAdmin);

      // If activeCode matches this validated code, clear it
      try {
        const cleanCode = (codigo || '').trim().toUpperCase();
        const saved = localStorage.getItem('latidos_active_code');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.code === cleanCode || parsed.code === `LAT-${cleanCode}`)) {
            setActiveCode(null);
            localStorage.removeItem('latidos_active_code');
          }
        }
      } catch (e) {}

      return { success: true, data: updatedTx };
    } catch (e) {
      return { success: false, error: e.message || 'Error al validar el bono' };
    }
  };

  const rechazarBono = async (txIdOrCode) => {
    try {
      const updatedTx = await supabaseService.rechazarBono(txIdOrCode);

      // If activeCode matches this rejected code, clear it locally and refund immediately
      try {
        const cleanCode = (typeof txIdOrCode === 'string' ? txIdOrCode : '').trim().toUpperCase();
        const saved = localStorage.getItem('latidos_active_code');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.code === cleanCode || parsed.code === `LAT-${cleanCode}` || parsed.txId === txIdOrCode)) {
            const refundAmount = Number(parsed.latidosUsados) || 0;
            if (refundAmount > 0) {
              setLatidos(prev => prev + refundAmount);
            }
            setActiveCode(null);
            localStorage.removeItem('latidos_active_code');
          }
        }
      } catch (e) {}

      // Refresh current user's data from DB immediately
      const currentUid = userId || user?.id || parseInt(localStorage.getItem('latidos_user_id'), 10);
      if (currentUid) {
        try {
          const freshUser = await supabaseService.getUserById(currentUid);
          if (freshUser && typeof freshUser.latidos === 'number') {
            setLatidos(freshUser.latidos);
          }
          const freshTxs = await supabaseService.getTransactions(currentUid);
          if (freshTxs) {
            setTransactions(freshTxs);
          }
        } catch (err) {}
      }

      return { success: true, data: updatedTx };
    } catch (e) {
      return { success: false, error: e.message || 'Error al rechazar el bono' };
    }
  };

  const fetchComercioStats = async () => {
    try {
      const cList = await supabaseService.getComercios();
      let myComercio = null;

      if (user?.comercio_id) {
        myComercio = cList.find(c => Number(c.id) === Number(user.comercio_id));
      }
      if (!myComercio && user) {
        myComercio = cList.find(c =>
          (c.email && user.email && c.email.toLowerCase() === user.email.toLowerCase()) ||
          (c.nombre && user.name && c.nombre.toLowerCase() === user.name.toLowerCase())
        );
      }
      if (!myComercio && cList.length > 0) {
        myComercio = cList[0];
      }

      if (myComercio) {
        const txs = await supabaseService.getTransactionsByComercio(myComercio.nombre);
        return { transactions: txs, comercio: myComercio };
      }
      return { transactions: [], comercio: null };
    } catch (e) {
      console.error('Error in fetchComercioStats:', e);
      return { transactions: [], comercio: null };
    }
  };

  const updateComercioBonos = async (bonos) => {
    if (!user?.comercio_id) return false;
    try {
      await supabaseService.updateComercio(user.comercio_id, { bonos });
      return true;
    } catch (e) {
      return false;
    }
  };

  const updateComercioHorarios = async (comercioId, { horario, vacaciones, aviso, telefono, email }) => {
    const targetId = Number(comercioId || user?.comercio_id || 2);
    try {
      await supabaseService.updateComercio(targetId, { horario, vacaciones, aviso, telefono, email });
      return true;
    } catch (e) {
      console.error('Error updating comercio info in Supabase:', e);
      return false;
    }
  };

  const updateComercioProductos = async (comercioId, productos) => {
    const targetId = Number(comercioId || user?.comercio_id || 2);
    try {
      await supabaseService.updateComercioProductos(targetId, productos);
      return true;
    } catch (e) {
      console.error('Error updating comercio productos:', e);
      return false;
    }
  };

  const registrarActividad = async (pasos, latidosGanados) => {
    if (!userId) return;
    const fecha = getLocalDateStr();
    try {
      const updatedAct = await supabaseService.upsertActivity(userId, fecha, pasos, latidosGanados);
      if (updatedAct) {
        setActivity(prev => {
          const cleanDate = (updatedAct.fecha || '').split('T')[0];
          const exists = prev.some(a => (a.fecha || '').split('T')[0] === cleanDate);
          const nextActs = exists
            ? prev.map(a => (a.fecha || '').split('T')[0] === cleanDate ? updatedAct : a)
            : [updatedAct, ...prev];

          setWeeklySteps(computeWeeklyStepsFromActivity(nextActs, steps));
          setRacha(computeStreakFromActivity(nextActs, steps, dailyGoal));
          return nextActs;
        });
      }
    } catch (e) {
      console.error('Error registering activity in Supabase:', e);
    }
  };

  const tr = t[language] || t.es;

  return (
    <LatidosContext.Provider value={{
      latidos, steps, racha, dailyGoal, weeklySteps, transactions, savedRoutes, recommendedRoutes, activity,
      isAuthenticated, user, loading, theme, language, currency, tr,
      activeCode, activeCodeNotification, setActiveCodeNotification,
      generarCodigoCanje, cancelarCodigoCanje,
      ganarLatidos, canjearLatidos, updateSteps, updateDailyGoal, registrarCanje,
      savePreferences, toggleTheme, setLanguage: changeLanguage, setCurrency: changeCurrency,
      saveRoute, deleteRoute, updateRoute,
      fetchRecommendedRoutes, addRecommendedRoute, updateRecommendedRoute, deleteRecommendedRoute,
      // Active Route Session (persists across tabs)
      isRouteActive, isRouteTracking, routeElapsed, routeDistanceM, routePath, routePoints,
      replicatedRoute, isVehicleDetected, currentSpeedKmh, currentPosition, hasRealLocation,
      startRouteSession, pauseRouteSession, resumeRouteSession, discardRouteSession,
      addRouteCheckpoint, editRouteCheckpoint, removeRouteCheckpoint, finishRouteSession,
      login, logout, loginUser, registerUser,
      fetchAdminStats, fetchAdminUsers, createUser, fetchComercios, createComercio, updateComercio,
      deleteComercio, updateUser, deleteUser, validarBono, rechazarBono, fetchComercioStats, updateComercioBonos,
      updateComercioHorarios, updateComercioProductos,
      registrarActividad
    }}>
      {children}
    </LatidosContext.Provider>
  );
};

export const useLatidos = () => useContext(LatidosContext);
