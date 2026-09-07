import React, { useEffect, useRef, useState, useCallback } from 'react';

// Official Google reCAPTCHA v2 test site key (works on localhost without domain restrictions)
const DEFAULT_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const GoogleReCaptcha = ({ onVerify, theme = 'light' }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [localChecked, setLocalChecked] = useState(false);

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || DEFAULT_SITE_KEY;

  const handleVerifyCallback = useCallback((token) => {
    if (onVerify) onVerify(token || true);
  }, [onVerify]);

  const handleExpiredCallback = useCallback(() => {
    if (onVerify) onVerify(false);
  }, [onVerify]);

  const handleErrorCallback = useCallback(() => {
    if (onVerify) onVerify(false);
  }, [onVerify]);

  useEffect(() => {
    let isMounted = true;

    const renderWidget = () => {
      if (!window.grecaptcha || !window.grecaptcha.render || !containerRef.current) return;
      
      try {
        // Clear previous widget if any
        containerRef.current.innerHTML = '';
        const wid = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme === 'dark' ? 'dark' : 'light',
          callback: handleVerifyCallback,
          'expired-callback': handleExpiredCallback,
          'error-callback': handleErrorCallback
        });
        widgetIdRef.current = wid;
        if (isMounted) setIsLoaded(true);
      } catch (err) {
        console.warn('reCAPTCHA render notice:', err);
      }
    };

    // Check if script already in document
    if (window.grecaptcha && window.grecaptcha.render) {
      renderWidget();
    } else {
      const existingScript = document.getElementById('google-recaptcha-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-recaptcha-script';
        script.src = 'https://www.google.com/recaptcha/api.js?onload=onGoogleReCaptchaLoad&render=explicit';
        script.async = true;
        script.defer = true;

        window.onGoogleReCaptchaLoad = () => {
          if (isMounted) renderWidget();
        };

        script.onerror = () => {
          if (isMounted) setLoadError(true);
        };

        document.head.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if (window.grecaptcha && window.grecaptcha.render) {
            clearInterval(checkInterval);
            if (isMounted) renderWidget();
          }
        }, 150);

        setTimeout(() => clearInterval(checkInterval), 6000);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [siteKey, theme, handleVerifyCallback, handleExpiredCallback, handleErrorCallback]);

  // Fallback in case Google API is blocked (e.g. adblock / offline network)
  if (loadError) {
    return (
      <div 
        onClick={() => {
          const next = !localChecked;
          setLocalChecked(next);
          onVerify(next);
        }}
        style={{
          backgroundColor: 'var(--color-card, #fff)',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          padding: '0.8rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          cursor: 'pointer',
          width: '100%',
          maxWidth: '304px',
          boxSizing: 'border-box',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            width: '24px', height: '24px',
            border: '2px solid #ccc',
            borderRadius: '3px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: localChecked ? '#4caf50' : 'transparent',
            borderColor: localChecked ? '#4caf50' : '#ccc'
          }}>
            {localChecked && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
          </div>
          <span style={{ fontFamily: 'var(--font-main)', fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: '500' }}>
            No soy un robot
          </span>
        </div>
        <img 
          src="https://www.gstatic.com/recaptcha/api2/logo_48.png" 
          alt="reCAPTCHA" 
          style={{ width: '32px', height: '32px', opacity: 0.85 }} 
        />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '1.2rem',
      minHeight: '78px',
      width: '100%'
    }}>
      <div ref={containerRef} style={{ display: 'inline-block' }} />
      {!isLoaded && !loadError && (
        <div style={{
          width: '304px',
          height: '78px',
          backgroundColor: 'var(--color-card-alt, #f9f9f9)',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.8rem',
          fontFamily: 'var(--font-main)'
        }}>
          Cargando Google reCAPTCHA...
        </div>
      )}
    </div>
  );
};

export default GoogleReCaptcha;
