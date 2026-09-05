import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RutasPage from './pages/Rutas';
import Wallet from './pages/Cartera';
import Shops from './pages/Tiendas';
import ProfilePage from './pages/Perfil';
import Login from './pages/Login';
import Actividad from './pages/Actividad';
import BottomNav from './components/BottomNav';
import { LatidosProvider } from './context/LatidosContext';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminComercios from './pages/admin/AdminComercios';

import ComercioLayout from './pages/comercio/ComercioLayout';
import ComercioHoy from './pages/comercio/ComercioHoy';
import ComercioValidar from './pages/comercio/ComercioValidar';
import ComercioBonos from './pages/comercio/ComercioBonos';
import ComercioInforme from './pages/comercio/ComercioInforme';

const PermissionsModal = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('permissions_requested')) {
      setShow(true);
    }
  }, []);

  const requestPermissions = async () => {
    // Request DeviceMotion (iOS 13+ requires this)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        await DeviceMotionEvent.requestPermission();
      } catch (err) {
        console.error(err);
      }
    }
    
    // Request Geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {});
    }

    localStorage.setItem('permissions_requested', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ backgroundColor: 'var(--color-card)', padding: '2rem', borderRadius: '1.5rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📱</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-text)', marginBottom: '1rem' }}>Permisos Necesarios</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
          Para que Latidos pueda contar tus pasos y registrar tus rutas en el mapa, necesitamos acceso a los sensores de movimiento y a la ubicación de tu dispositivo.
        </p>
        <button onClick={requestPermissions} style={{ backgroundColor: 'var(--color-accent)', color: 'white', padding: '1rem', borderRadius: '2.5rem', width: '100%', fontSize: '1rem', fontWeight: '700', border: 'none' }}>
          Conceder Permisos
        </button>
      </div>
    </div>
  );
};

function App() {
  return (
    <LatidosProvider>
      <Router>
        <div style={{
          maxWidth: '500px',
          margin: '0 auto',
          minHeight: '100vh',
          position: 'relative'
        }}>
          <PermissionsModal />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rutas" element={<RutasPage />} />
            <Route path="/cartera" element={<Wallet />} />
            <Route path="/comercios" element={<Shops />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/actividad" element={<Actividad />} />
            <Route path="/login" element={<Login />} />
            
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="comercios" element={<AdminComercios />} />
            </Route>

            <Route path="/comercio" element={<ComercioLayout />}>
              <Route index element={<ComercioHoy />} />
              <Route path="validar" element={<ComercioValidar />} />
              <Route path="bonos" element={<ComercioBonos />} />
              <Route path="informe" element={<ComercioInforme />} />
            </Route>
          </Routes>
          <BottomNav />
        </div>
      </Router>
    </LatidosProvider>
  );
}

export default App;