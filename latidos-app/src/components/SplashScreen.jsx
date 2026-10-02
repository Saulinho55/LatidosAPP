import React, { useState, useEffect, useRef } from 'react';
import { useLatidos } from '../context/LatidosContext';
import splashVideo from '../assets/logolatidosinicio.mp4';

const SplashScreen = ({ minDuration = 4000, maxDuration = 7000 }) => {
  const { loading } = useLatidos() || {};
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const startTimeRef = useRef(Date.now());
  const videoRef = useRef(null);

  const startFadeOut = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
    }, 550);
  };

  useEffect(() => {
    // Strictly wait at least minDuration (4000ms minimum) before allowing fade out
    const checkTimer = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= minDuration) {
        if (!loading || elapsed >= maxDuration) {
          clearInterval(checkTimer);
          startFadeOut();
        }
      }
    }, 150);

    return () => clearInterval(checkTimer);
  }, [minDuration, maxDuration, loading]);


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
