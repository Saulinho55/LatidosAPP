import React, { useState, useEffect, useRef } from 'react';
import { useLatidos } from '../context/LatidosContext';
import splashVideo from '../assets/logolatidosinicio.mp4';

const SplashScreen = ({ minDuration = 2500, maxDuration = 5000 }) => {
  const { loading } = useLatidos() || {};
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    let minTimer;
    let maxTimer;

    // Minimum time the splash is shown to enjoy the animation
    minTimer = setTimeout(() => {
      // If data is already loaded or not blocked, start fade out
      if (!loading) {
        startFadeOut();
      }
    }, minDuration);

    // Safety timeout so user is never stuck if something takes too long
    maxTimer = setTimeout(() => {
      startFadeOut();
    }, maxDuration);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [minDuration, maxDuration, loading]);

  // If loading just finished after minDuration
  useEffect(() => {
    if (!loading && videoLoaded) {
      const t = setTimeout(() => {
        startFadeOut();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [loading, videoLoaded]);

  const startFadeOut = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
    }, 550);
  };

  // Attempt to play video immediately
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback: still proceed
        setVideoLoaded(true);
      });
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      onClick={startFadeOut}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: '#FDFBF7', // Clean app background
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: fading ? 'none' : 'auto',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '420px',
        maxHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}>
        <video
          ref={videoRef}
          src={splashVideo}
          autoPlay
          muted
          playsInline
          loop
          onLoadedData={() => setVideoLoaded(true)}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '70vh',
            objectFit: 'contain',
            borderRadius: '1.5rem'
          }}
        />
      </div>
    </div>
  );
};

export default SplashScreen;
