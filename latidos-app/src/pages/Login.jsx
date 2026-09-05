import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLatidos } from '../context/LatidosContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, loginUser, registerUser, isAuthenticated } = useLatidos();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated, go home
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isRegistering) {
      if (!nombre || !email || !password) {
        setError('Por favor, rellena todos los campos.');
        return;
      }
      if (!captchaVerified) {
        setError('Por favor, verifica que no eres un robot.');
        return;
      }
    } else {
      if (!email || !password) {
        setError('Introduce tu correo y contraseña.');
        return;
      }
    }

    setIsLoading(true);
    
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (isRegistering) {
        await registerUser(nombre, cleanEmail, password);
      } else {
        await loginUser(cleanEmail, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    await login();
    navigate('/');
  };

  const InputStyle = {
    width: '100%',
    padding: '1rem',
    borderRadius: '1rem',
    backgroundColor: 'var(--color-input-bg, rgba(255, 255, 255, 0.05))',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-main)',
    fontSize: '0.95rem',
    marginBottom: '1rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div style={{
      padding: '2.5rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
    }}>
      {/* Logo */}
      <div style={{
        width: '60px', height: '60px',
        backgroundColor: 'var(--color-header-bg)',
        borderRadius: '1.2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.2rem',
        marginTop: '2rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--color-header-text)" strokeWidth="1.8">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '2rem',
        color: 'var(--color-text)',
        marginBottom: '0.3rem',
        textAlign: 'center'
      }}>
        {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
      </h1>
      
      <p style={{
        fontFamily: 'var(--font-main)',
        color: 'var(--color-text-muted)',
        marginBottom: '2rem',
        fontSize: '0.9rem',
        textAlign: 'center'
      }}>
        {isRegistering 
          ? 'Únete a Latidos y convierte tus pasos en recompensas.' 
          : 'Bienvenido de nuevo. Accede a tu cuenta.'}
      </p>

      {/* Main Form */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '320px' }}>
        
        {isRegistering && (
          <input 
            type="text" 
            placeholder="Nombre completo" 
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={InputStyle}
          />
        )}
        
        <input 
          type="email" 
          placeholder="Correo electrónico" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={InputStyle}
        />
        
        <input 
          type="password" 
          placeholder="Contraseña" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={InputStyle}
        />

        {/* Basic CAPTCHA simulation for Register */}
        {isRegistering && (
          <div 
            onClick={() => setCaptchaVerified(!captchaVerified)}
            style={{
              backgroundColor: 'var(--color-card-alt)',
              border: '1px solid var(--color-border)',
              padding: '1rem',
              borderRadius: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{
                width: '24px', height: '24px',
                border: '2px solid #ccc',
                borderRadius: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: captchaVerified ? '#4caf50' : 'transparent',
                borderColor: captchaVerified ? '#4caf50' : '#ccc'
              }}>
                {captchaVerified && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-main)', fontSize: '0.9rem', color: 'var(--color-text)' }}>
                No soy un robot
              </span>
            </div>
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/ad/RecaptchaLogo.svg" alt="reCAPTCHA" height="30" style={{ opacity: 0.6 }} />
          </div>
        )}

        {error && (
          <p style={{ color: '#e74c3c', fontSize: '0.85rem', fontFamily: 'var(--font-main)', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            padding: '1.1rem',
            borderRadius: '2rem',
            fontSize: '0.95rem',
            fontWeight: '600',
            fontFamily: 'var(--font-main)',
            width: '100%',
            cursor: isLoading ? 'wait' : 'pointer',
            boxShadow: 'var(--shadow-card)',
            opacity: isLoading ? 0.7 : 1,
            transition: 'opacity 0.2s',
            marginBottom: '1rem'
          }}
        >
          {isLoading ? 'Cargando...' : (isRegistering ? 'Registrarse' : 'Entrar')}
        </button>
      </form>

      {/* Switch between Login and Register */}
      <p style={{
        fontFamily: 'var(--font-main)',
        fontSize: '0.85rem',
        color: 'var(--color-text-muted)',
        marginTop: '0.5rem',
        marginBottom: '2.5rem'
      }}>
        {isRegistering ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
        <span 
          onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
          style={{ 
            color: 'var(--color-accent)', 
            fontWeight: '600', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          {isRegistering ? 'Inicia sesión' : 'Regístrate'}
        </span>
      </p>

      {/* Divider */}
      <div style={{
        width: '100%', maxWidth: '320px',
        height: '1px', backgroundColor: 'var(--color-border)',
        marginBottom: '2rem', position: 'relative'
      }}>
        <span style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--color-primary)', // Background color to mask line
          padding: '0 0.8rem',
          color: 'var(--color-text-muted)',
          fontSize: '0.8rem',
          fontFamily: 'var(--font-main)'
        }}>O accede directamente</span>
      </div>

      {/* Demo Shortcut */}
      <button
        onClick={handleDemoLogin}
        disabled={isLoading}
        style={{
          backgroundColor: 'transparent',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          padding: '0.9rem',
          borderRadius: '2rem',
          fontSize: '0.9rem',
          fontWeight: '500',
          fontFamily: 'var(--font-main)',
          width: '100%',
          maxWidth: '320px',
          cursor: isLoading ? 'wait' : 'pointer',
          opacity: isLoading ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>🚀</span>
        Entrar con la cuenta Demo
      </button>

    </div>
  );
};

export default Login;
