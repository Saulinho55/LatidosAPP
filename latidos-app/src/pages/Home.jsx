import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import StepsCard from '../components/Stepcards';
import StreakCard from '../components/Racha';
import StepChart from '../components/StepChart';
import NFCConnection from '../components/NFC';
import { useLatidos } from '../context/LatidosContext';
import { useStepCounter } from '../hooks/useStepCounter';

const STEPS_PER_LATIDO = 100;

const Home = () => {
  const {
    user,
    latidos,
    ganarLatidos,
    steps,
    updateSteps,
    racha,
    weeklySteps,
    isAuthenticated,
    dailyGoal,
    registrarActividad,
    currency,
    tr,
    isVehicleDetected,
    isRouteActive,
    isRouteTracking,
    routeDistanceM,
    discardRouteSession
  } = useLatidos();

  const navigate = useNavigate();

  // ── Local pedometer (only counts on this screen) ──
  const {
    steps: pedometerSteps,
    isTracking,
    isSupported,
    alertMsg,
    setAlertMsg,
    startTracking,
    stopTracking,
    resetSteps,
  } = useStepCounter(steps, { isVehicleDetected });

  // Ref to track how many steps we've already synced to DB / awarded latidos for
  const lastSyncedStepsRef = useRef(steps);
  const lastAwardedLatidosRef = useRef(Math.floor(steps / STEPS_PER_LATIDO));
  const latidosAwardPendingRef = useRef(false);

  // When DB steps load (isAuthenticated fires, steps comes from DB), reset pedometer baseline
  const prevAuthRef = useRef(false);
  useEffect(() => {
    if (isAuthenticated && !prevAuthRef.current) {
      prevAuthRef.current = true;
      // Sync pedometer starting point to what DB says today's steps are
      resetSteps(steps);
      lastSyncedStepsRef.current = steps;
      lastAwardedLatidosRef.current = Math.floor(steps / STEPS_PER_LATIDO);
    }
  }, [isAuthenticated, steps]);

  // Main step sync effect: fires when pedometer counts a new step
  useEffect(() => {
    if (!isTracking) return;
    if (pedometerSteps <= lastSyncedStepsRef.current) return;

    const newTotal = pedometerSteps;
    lastSyncedStepsRef.current = newTotal;

    // Update steps in DB (debounced inside updateSteps)
    updateSteps(newTotal);

    // Award latidos: 1 latido per 100 steps, cumulative
    const newLatidosTotal = Math.floor(newTotal / STEPS_PER_LATIDO);
    const latidosToAward = newLatidosTotal - lastAwardedLatidosRef.current;
    if (latidosToAward > 0 && !latidosAwardPendingRef.current) {
      latidosAwardPendingRef.current = true;
      lastAwardedLatidosRef.current = newLatidosTotal;
      ganarLatidos(latidosToAward);
      registrarActividad(newTotal, latidosToAward);
      latidosAwardPendingRef.current = false;
    }
  }, [pedometerSteps, isTracking]);

  // Flush steps to DB on tab hide / app background
  useEffect(() => {
    const handleFlush = () => {
      if (isTracking && pedometerSteps > 0) {
        updateSteps(pedometerSteps);
      }
    };
    const handleVis = () => { if (document.visibilityState === 'hidden') handleFlush(); };
    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('beforeunload', handleFlush);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('beforeunload', handleFlush);
    };
  }, [isTracking, pedometerSteps]);

  // ── Week chart ──
  const effectiveSteps = pedometerSteps || steps || 0;
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const todayIndex = (new Date().getDay() + 6) % 7;

  const currentWeekData = days.map((day, index) => {
    let daySteps = isAuthenticated && weeklySteps ? (weeklySteps[index] || 0) : 0;
    if (index === todayIndex) {
      daySteps = Math.max(daySteps, effectiveSteps);
    }
    return { day, steps: daySteps };
  });

  // Redirect comercio users
  useEffect(() => {
    if (isAuthenticated && user?.role === 'comercio') {
      navigate('/comercio');
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div style={{ paddingBottom: '6rem' }}>
      <Header latidos={latidos} />

      {/* Vehicle Detected Warning Banner */}
      {isVehicleDetected && (
        <div style={{
          margin: '0.8rem 1rem 0.2rem',
          backgroundColor: '#e74c3c',
          color: 'white',
          padding: '0.75rem 1rem',
          borderRadius: '1rem',
          textAlign: 'center',
          fontFamily: 'var(--font-main)',
          fontWeight: '700',
          fontSize: '0.9rem',
          boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)'
        }}>
          (Vehículo detectado, pasos pausados)
        </div>
      )}

      {alertMsg && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ backgroundColor: 'var(--color-card)', padding: '2rem', borderRadius: '1.5rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💬</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-text)', marginBottom: '1rem' }}>Información</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              {alertMsg}
            </p>
            <button onClick={() => setAlertMsg(null)} style={{ backgroundColor: 'var(--color-accent)', color: 'white', padding: '1rem', borderRadius: '2.5rem', width: '100%', fontSize: '1rem', fontWeight: '700', border: 'none' }}>
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* Route in progress notice with quick actions */}
      {isRouteActive && (
        <div style={{
          margin: '0.6rem 1rem 0.2rem',
          backgroundColor: isRouteTracking ? 'rgba(34, 197, 94, 0.12)' : 'rgba(243, 156, 18, 0.12)',
          border: `1.5px solid ${isRouteTracking ? '#22c55e' : '#f39c12'}`,
          borderRadius: '1.2rem',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '0.88rem', color: 'var(--color-text)' }}>
              {isRouteTracking ? '🚶‍♂️ Ruta activa grabando' : '⏸️ Ruta en pausa'}
            </p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              {routeDistanceM ? `${(routeDistanceM / 1000).toFixed(2).replace('.', ',')} km` : '0,00 km'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => navigate('/rutas')}
              style={{
                backgroundColor: isRouteTracking ? '#22c55e' : '#f39c12',
                color: 'white',
                border: 'none',
                borderRadius: '1.5rem',
                padding: '0.4rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Ver ruta
            </button>
            <button
              onClick={() => {
                if (window.confirm('¿Finalizar y descartar la sesión de ruta actual?')) {
                  discardRouteSession();
                }
              }}
              style={{
                backgroundColor: 'transparent',
                color: '#e74c3c',
                border: '1px solid #e74c3c',
                borderRadius: '1.5rem',
                padding: '0.4rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Finalizar
            </button>
          </div>
        </div>
      )}

      <StepsCard
        pasos={isAuthenticated ? effectiveSteps : 0}
        objetivo={dailyGoal || 10000}
        isTracking={isAuthenticated && isTracking}
        isSupported={isSupported}
        onStart={() => isAuthenticated ? startTracking() : navigate('/login')}
        onStop={stopTracking}
      />

      <StreakCard
        dias={isAuthenticated ? racha : 0}
        weekData={currentWeekData}
        objetivo={dailyGoal || 10000}
      />

      <StepChart
        data={currentWeekData}
        objetivo={dailyGoal || 10000}
      />

      <NFCConnection />
    </div>
  );
};

export default Home;