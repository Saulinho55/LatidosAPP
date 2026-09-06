import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-recover if an outdated cached bundle chunk fails to load after a new deployment
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

// Auto update PWA Service Worker caches immediately
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.update();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
