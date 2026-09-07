import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLatidos } from '../context/LatidosContext';
import GoogleReCaptcha from '../components/GoogleReCaptcha';
import latidosIcon from '../assets/latidos_icon.png';

const Login = () => {
  const navigate = useNavigate();
  const { loginUser, registerUser, isAuthenticated, theme } = useLatidos();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
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
    
    if (!captchaVerified) {
      setError('Por favor, completa la verificación de Google reCAPTCHA.');
      return;
    }

    if (isRegistering) {
      if (!nombre.trim() || !email.trim() || !password) {
        setError('Por favor, rellena todos los campos.');
        return;
      }
      if (!termsAccepted) {
        setError('Debes aceptar los Términos y Condiciones para crear una cuenta.');
        return;
      }
    } else {
      if (!email.trim() || !password) {
        setError('Introduce tu correo y contraseña.');
        return;
      }
    }

    setIsLoading(true);
    
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (isRegistering) {
        await registerUser(nombre.trim(), cleanEmail, password);
      } else {
        await loginUser(cleanEmail, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Ha ocurrido un error al procesar tu solicitud.');
      setIsLoading(false);
    }
  };

  const toggleTab = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setCaptchaVerified(false);
  };

  const InputStyle = {
    width: '100%',
    padding: '0.95rem 1.1rem',
    borderRadius: '1rem',
    backgroundColor: 'var(--color-input-bg, rgba(255, 255, 255, 0.05))',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-main)',
    fontSize: '0.95rem',
    marginBottom: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div style={{
      padding: '2rem 1.5rem 4rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
    }}>
      {/* Logo Container */}
      <div style={{
        width: '64px',
        height: '64px',
        backgroundColor: 'var(--color-header-bg)',
        borderRadius: '1.35rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
        marginTop: '1.5rem',
        boxShadow: 'var(--shadow-card)',
        padding: '0.35rem'
      }}>
        <img 
          src={latidosIcon} 
          alt="LATIDOS" 
          style={{
            width: '46px',
            height: '52px',
            objectFit: 'contain'
          }}
        />
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
        marginBottom: '1.8rem',
        fontSize: '0.9rem',
        textAlign: 'center',
        maxWidth: '320px'
      }}>
        {isRegistering 
          ? 'Únete a Latidos y convierte tus pasos en recompensas locales.' 
          : 'Bienvenido de nuevo. Accede a tu monedero y pasos.'}
      </p>

      {/* Main Form */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '340px' }}>
        
        {isRegistering && (
          <input 
            type="text" 
            placeholder="Nombre completo" 
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={InputStyle}
            required
          />
        )}
        
        <input 
          type="email" 
          placeholder="Correo electrónico" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={InputStyle}
          required
        />
        
        <input 
          type="password" 
          placeholder="Contraseña" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={InputStyle}
          required
        />

        {/* Google reCAPTCHA v2 */}
        <GoogleReCaptcha 
          key={isRegistering ? 'reg-recaptcha' : 'login-recaptcha'}
          onVerify={setCaptchaVerified} 
          theme={theme || 'light'} 
        />

        {/* Terms & Conditions Checkbox for Register */}
        {isRegistering && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            marginBottom: '1.2rem',
            padding: '0.2rem 0.4rem'
          }}>
            <input
              type="checkbox"
              id="termsCheckbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{
                marginTop: '0.2rem',
                width: '18px',
                height: '18px',
                accentColor: 'var(--color-accent)',
                cursor: 'pointer'
              }}
            />
            <label htmlFor="termsCheckbox" style={{
              fontFamily: 'var(--font-main)',
              fontSize: '0.82rem',
              color: 'var(--color-text-muted)',
              lineHeight: '1.35',
              cursor: 'pointer'
            }}>
              He leído y acepto los{' '}
              <span
                onClick={(e) => {
                  e.preventDefault();
                  setShowTermsModal(true);
                }}
                style={{
                  color: 'var(--color-accent)',
                  textDecoration: 'underline',
                  fontWeight: '600'
                }}
              >
                Términos y Condiciones
              </span>{' '}
              y la{' '}
              <span
                onClick={(e) => {
                  e.preventDefault();
                  setShowTermsModal(true);
                }}
                style={{
                  color: 'var(--color-accent)',
                  textDecoration: 'underline',
                  fontWeight: '600'
                }}
              >
                Política de Privacidad
              </span>.
            </label>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: 'rgba(231, 76, 60, 0.12)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: '0.8rem',
            padding: '0.75rem',
            color: '#e74c3c',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-main)',
            marginBottom: '1.2rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !captchaVerified || (isRegistering && !termsAccepted)}
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            padding: '1.05rem',
            borderRadius: '2rem',
            fontSize: '0.98rem',
            fontWeight: '700',
            fontFamily: 'var(--font-main)',
            width: '100%',
            cursor: (isLoading || !captchaVerified || (isRegistering && !termsAccepted)) ? 'not-allowed' : 'pointer',
            boxShadow: 'var(--shadow-card)',
            opacity: (isLoading || !captchaVerified || (isRegistering && !termsAccepted)) ? 0.6 : 1,
            transition: 'all 0.2s ease',
            marginBottom: '1rem'
          }}
        >
          {isLoading ? 'Procesando...' : (isRegistering ? 'Crear mi cuenta' : 'Iniciar sesión')}
        </button>
      </form>

      {/* Switch between Login and Register */}
      <p style={{
        fontFamily: 'var(--font-main)',
        fontSize: '0.88rem',
        color: 'var(--color-text-muted)',
        marginTop: '0.5rem',
        marginBottom: '2rem'
      }}>
        {isRegistering ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta todavía? '}
        <span 
          onClick={toggleTab}
          style={{ 
            color: 'var(--color-accent)', 
            fontWeight: '700', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          {isRegistering ? 'Inicia sesión' : 'Regístrate gratis'}
        </span>
      </p>

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--color-card, #fff)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            maxWidth: '460px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text)' }}>
                Términos y Condiciones
              </h3>
              <button
                onClick={() => setShowTermsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              overflowY: 'auto',
              flex: 1,
              paddingRight: '0.5rem',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-main)'
            }}>
              <h4 style={{ color: 'var(--color-text)', margin: '0.5rem 0 0.2rem' }}>1. Objeto del Servicio</h4>
              <p>LATIDOS es una plataforma que incentiva la actividad física y el comercio local mediante un sistema de fidelización basado en pasos ("Latidos") canjeables por promociones y descuentos en comercios adheridos.</p>

              <h4 style={{ color: 'var(--color-text)', margin: '0.8rem 0 0.2rem' }}>2. Registro y Seguridad</h4>
              <p>El usuario se compromete a proporcionar información verídica y mantener la confidencialidad de sus credenciales. Queda prohibido el uso de sistemas automatizados, bots o emuladores para falsear el recuento de pasos.</p>

              <h4 style={{ color: 'var(--color-text)', margin: '0.8rem 0 0.2rem' }}>3. Canjes y Promociones</h4>
              <p>Los cupones y descuentos tienen un periodo de validez determinado y están sujetos a disponibilidad del comercio emisor. La validación se realiza de forma presencial o autorizada por el establecimiento.</p>

              <h4 style={{ color: 'var(--color-text)', margin: '0.8rem 0 0.2rem' }}>4. Privacidad y Protección de Datos</h4>
              <p>Tus datos son tratados de acuerdo con la legislación vigente de protección de datos (RGPD). Solo recopilamos los datos estrictamente necesarios para el funcionamiento de la app y la sincronización de recompensas.</p>

              <p style={{ fontStyle: 'italic', marginTop: '1rem' }}>Última actualización: Versión preliminar 2026.</p>
            </div>

            <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.8rem' }}>
              <button
                type="button"
                onClick={() => {
                  setTermsAccepted(true);
                  setShowTermsModal(false);
                }}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.85rem',
                  borderRadius: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Aceptar Términos
              </button>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                style={{
                  backgroundColor: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  padding: '0.85rem 1.2rem',
                  borderRadius: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
