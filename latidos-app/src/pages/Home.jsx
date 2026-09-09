import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import StepsCard from '../components/Stepcards';
import StreakCard from '../components/Racha';
import StepChart from '../components/StepChart';
import NFCConnection from '../components/NFC';
import { useStepCounter } from '../hooks/useStepCounter';
import { useLatidos } from '../context/LatidosContext';

const STEPS_PER_LATIDO = 100;

const Home = () => {
  const { user, latidos, ganarLatidos, steps: dbSteps, updateSteps, racha, weeklySteps, isAuthenticated, dailyGoal, registrarActividad, currency, tr, isVehicleDetected, isRouteActive } = useLatidos();
  const {
    steps,
    isTracking,
    isSupported,
    startTracking,
    stopTracking,
    alertMsg,
    setAlertMsg
  } = useStepCounter(dbSteps, { isVehicleDetected });
  
  const navigate = useNavigate();

  const effectiveSteps = Math.max(dbSteps || 0, steps || 0);

  React.useEffect(() => {
    if (isAuthenticated && user?.role === 'comercio') {
      navigate('/comercio');
    }
  }, [isAuthenticated, user, navigate]);

  // Create week data for the chart from user's dynamic weeklySteps array
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const todayIndex = (new Date().getDay() + 6) % 7;
  
  const currentWeekData = days.map((day, index) => {
    let daySteps = isAuthenticated && weeklySteps ? (weeklySteps[index] || 0) : 0;
    // For today, use today's live steps if they are higher
    if (index === todayIndex) {
      daySteps = Math.max(daySteps, effectiveSteps);
    }
    return { day, steps: daySteps };
  });

  // Sync pedometer steps back to DB
  React.useEffect(() => {
    if (steps > dbSteps && isAuthenticated && user) {
      updateSteps(steps);
    }
  }, [steps, dbSteps, updateSteps, isAuthenticated, user]);

  // Ensure steps are saved immediately when app is backgrounded or closed
  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && steps > dbSteps) {
        updateSteps(steps);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [steps, dbSteps, updateSteps]);

  // Award latidos ONLY for new steps walked during active tracking.
  // When not tracking (e.g. on load, page refresh, app restart),
  // prevStepsRef is kept in sync with steps so it NEVER awards free latidos.
  const prevStepsRef = React.useRef(steps);
  React.useEffect(() => {
    if (!isTracking) {
      prevStepsRef.current = steps;
      return;
    }

    if (steps > prevStepsRef.current) {
      const newLatidosEarned =
        Math.floor(steps / STEPS_PER_LATIDO) - Math.floor(prevStepsRef.current / STEPS_PER_LATIDO);
      if (newLatidosEarned > 0) {
        ganarLatidos(newLatidosEarned);
        registrarActividad(steps, newLatidosEarned);
      }
      prevStepsRef.current = steps;
    }
  }, [steps, isTracking]);

  return (
    <div style={{ paddingBottom: '6rem' }}>
      <Header latidos={latidos} />

      {/* Vehicle Detected Warning Banner (No emojis, exact text) */}
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
      
      <StepsCard
        pasos={isAuthenticated ? effectiveSteps : 0}
        objetivo={dailyGoal || 10000}
        isTracking={isAuthenticated && (isTracking || isRouteActive)}
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