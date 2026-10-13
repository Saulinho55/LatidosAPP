// ─────────────────────────────────────────────────────────────────────────────
// outdoorDetector.js — Clasificador Interior/Exterior "desde el segundo uno"
// ─────────────────────────────────────────────────────────────────────────────
// Funciona en iOS y Android (Capacitor WebView + PWA) usando SOLO APIs web
// estándar, sin plugins nativos nuevos y sin permisos adicionales:
//
//   1. GNSS     : precisión del fix (coords.accuracy). En interior la precisión
//                 de red/celda es casi siempre >30-50m; en calle el chip GPS
//                 baja a 3-15m en pocos segundos.
//   2. Luz      : AmbientLightSensor si existe (algunos Android). En iOS no
//                 existe -> se ignora (peso 0), nunca penaliza al usuario.
//   3. Barómetro: DeviceMotionEvent.rotationRate.alpha reporta presión hPa en
//                 Chrome Android. En casa es plana; en la calle oscila con el
//                 viento. En iOS devuelve 0 -> se ignora (peso 0).
//   4. Wi-Fi/BLE: fingerprint de escaneo pasivo. Las apps NATIVAS (iOS/Android)
//                 tienen una clase Capacitor registrada que inyecta las redes
//                 visibles en window.__latidosScan (sin permisos extra: la app
//                 ya tiene LOCATION). En la web/PWA simplemente no hay datos.
//
// FILOSOFÍA CLAVE (anti-fricción):
//   - El clasificador NUNCA bloquea ni descuenta pasos por sí solo.
//   - Solo produce una probabilidad p ∈ [0,1] de "estar en la calle".
//   - La decisión de confianza es GLOBAL de la sesión (ventana deslizante),
//     no punto a punto: un mal fix aislado no castiga al usuario.
//   - Todas las señales ausentes o no soportadas reciben peso 0 => neutral.
//     Un iPhone sin barómetro ni sensor de luz sigue clasificando bien con
//     GNSS + Wi-Fi fingerprint + coherencia paso-GPS.
// ─────────────────────────────────────────────────────────────────────────────

const EVIDENCE_WINDOW_MS = 60 * 1000;   // ventana deslizante de evidencia
const MIN_SAMPLES_FOR_DECISION = 8;     // no decidir con menos de 8 muestras

// home BSSID guardado tras confirmar "estoy en casa" (el usuario lo valida una vez)
const HOME_KEY = 'latidos_home_bssids';

const getHomeBssids = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(HOME_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

export const saveHomeBssids = (bssids) => {
  try {
    localStorage.setItem(HOME_KEY, JSON.stringify([...new Set(bssids)]));
  } catch {}
};

// ── Colectores de señal (todos best-effort, jamás lanzan) ────────────────────

class OutdoorEvidence {
  constructor() {
    this.samples = [];        // { t, gnssScore, lightScore, baroDelta, wifiScore }
    this.baroBuffer = [];     // últimas lecturas de presión
    this.lastBaroT = 0;
    this.scanSeen = false;    // ¿el puente nativo nos ha dado datos alguna vez?
  }

  // Se llama con cada fix de GPS (global watcher o route watcher)
  addGnssSample(accuracy) {
    if (typeof accuracy !== 'number' || !isFinite(accuracy)) return;
    // mapeo logarítmico suave: <=8m => 1.0 ; 30m => ~0.7 ; 60m => ~0.4 ; >=120m => 0
    let score;
    if (accuracy <= 8) score = 1.0;
    else if (accuracy >= 120) score = 0.0;
    else score = Math.max(0, Math.min(1, 1 - (Math.log2(accuracy / 8)) / Math.log2(120 / 8)));
    this._push({ gnssScore: score });
  }

  // Se llama ~1Hz desde startSensors()
  addLightSample(lux) {
    if (typeof lux !== 'number' || !isFinite(lux)) return;
    // Interior típico < 500 lux; calle nublada > 2000; soleado > 10000
    let score = 0;
    if (lux >= 2000) score = 1.0;
    else if (lux >= 800) score = 0.5;
    else score = 0.0;
    this._push({ lightScore: score });
  }

  // Se llama desde devicemotion cuando rotationRate.alpha es presión válida
  addBaroSample(hpa, now) {
    if (typeof hpa !== 'number' || hpa < 850 || hpa > 1100) return;
    this.baroBuffer.push(hpa);
    if (this.baroBuffer.length > 60) this.baroBuffer.shift();
    this.lastBaroT = now;
    // Si hace >20s sin presión nueva, el barómetro desapareció (app cerrada/iOS)
    if (this.baroBuffer.length >= 10 && now - this.lastBaroT < 20000) {
      const mean = this.baroBuffer.reduce((s, v) => s + v, 0) / this.baroBuffer.length;
      const variance = this.baroBuffer.reduce((s, v) => s + (v - mean) ** 2, 0) / this.baroBuffer.length;
      const std = Math.sqrt(variance);
      // desviación > 0.25 hPa en ~10s => aire en movimiento => exterior
      const delta = Math.min(1, std / 0.25);
      this._push({ baroDelta: delta }, true); // actualiza en sitio, no duplica
    }
  }

  // Se llama cuando el bridge nativo publica window.__latidosScan
  addWifiSample(networks) {
    if (!Array.isArray(networks) || networks.length === 0) return;
    this.scanSeen = true;
    const home = getHomeBssids();
    const strong = networks.filter(n => n.rssi > -70); // descartamos ecos lejanos
    const atHome = strong.some(n => home.has(n.bssid));
    // En casa: pocas APs con señal muy fuerte (-40dBm) dominantes + BSSID conocido
    const veryStrong = networks.filter(n => n.rssi > -45).length;
    let score;
    if (atHome) score = 0.0;                       // huella conocida = interior (casa)
    else if (veryStrong >= 3) score = 0.15;        // saturación típica de edificio
    else if (strong.length >= 12) score = 0.45;    // muchas APs = zona urbana densa
    else score = 0.7;                              // cielo abierto: pocas APs cercanas
    this._push({ wifiScore: score });
  }

  _push(partial, replaceLastSameKind = false) {
    const t = Date.now();
    if (replaceLastSameKind && this.samples.length) {
      const last = this.samples[this.samples.length - 1];
      if ('baroDelta' in partial && 'baroDelta' in last) {
        Object.assign(last, partial);
        this._prune(t);
        return;
      }
    }
    this.samples.push({ t, ...partial });
    this._prune(t);
  }

  _prune(t) {
    const cutoff = t - EVIDENCE_WINDOW_MS;
    while (this.samples.length && this.samples[0].t < cutoff) this.samples.shift();
  }

  // ── Decisión: probabilidad de EXTERIOR sobre la ventana completa ──────────
  evaluate() {
    const t = Date.now();
    this._prune(t);
    const samples = this.samples;

    const agg = (key) => {
      const vals = samples.map(s => s[key]).filter(v => typeof v === 'number');
      if (!vals.length) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const gnss = agg('gnssScore');
    const light = agg('lightScore');
    const baro = agg('baroDelta');
    const wifi = agg('wifiScore');

    // Ponderación: GNSS manda, Wi-Fi confirma, luz/barómetro refuerzan.
    // Las señales no disponibles pesan 0 (neutral) => nunca falsan "interior".
    let num = 0, den = 0;
    const add = (v, w) => { if (v !== null) { num += v * w; den += w; } };
    add(gnss, 0.55);
    add(wifi, 0.30);
    add(light, 0.10);
    add(baro, 0.05);

    const p = den > 0 ? num / den : 0.5; // sin datos => duda razonable (neutro)

    const enough = samples.length >= MIN_SAMPLES_FOR_DECISION && den > 0;
    return {
      ready: enough,
      pOutdoor: Number(p.toFixed(3)),
      label: !enough ? 'calibrando' : p >= 0.60 ? 'exterior' : p <= 0.35 ? 'interior' : 'dudoso',
      signals: { gnss, light, baro, wifi },
      samples: samples.length
    };
  }

  reset() {
    this.samples = [];
    this.baroBuffer = [];
  }
}

// Singleton por app: Home, Rutas y Context comparten la misma evidencia
export const outdoorEvidence = new OutdoorEvidence();

// ── Sensores auxiliares (luz + barómetro vía devicemotion) ───────────────────
let motionRef = 0;
let lightSensor = null;

export function startAuxSensors() {
  // Barómetro (solo Chrome Android expone presión en rotationRate.alpha)
  if (motionRef === 0 && typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined') {
    const onMotion = (e) => {
      const rr = e.rotationRate;
      if (rr && typeof rr.alpha === 'number' && rr.alpha > 850 && rr.alpha < 1100) {
        outdoorEvidence.addBaroSample(rr.alpha, Date.now());
      }
    };
    window.addEventListener('devicemotion', onMotion, { passive: true });
    motionRef = { off: () => window.removeEventListener('devicemotion', onMotion) };
  }

  // Sensor de luz ambiental (experimental en Android; inexistente en iOS)
  try {
    if (typeof AmbientLightSensor !== 'undefined' && !lightSensor) {
      lightSensor = new AmbientLightSensor({ frequency: 1 });
      lightSensor.addEventListener('reading', () => outdoorEvidence.addLightSample(lightSensor.illuminance));
      lightSensor.start();
    }
  } catch { /* permiso/sensor no disponible: neutro */ }
}

export function stopAuxSensors() {
  if (motionRef && motionRef.off) { motionRef.off(); motionRef = 0; }
  try { if (lightSensor) { lightSensor.stop(); lightSensor = null; } } catch {}
}

// ── Puente con el escaneo Wi-Fi/BLE nativo (window.__latidosScan) ────────────
// La clase Capacitor nativa (ver MainActivity.java) escribe ahí las redes
// visibles. Aquí solo las consumimos; si no existe el puente, somos neutrales.
if (typeof window !== 'undefined') {
  let lastScanTs = 0;
  const drain = () => {
    const s = window.__latidosScan;
    if (s && s.ts && s.ts !== lastScanTs) {
      lastScanTs = s.ts;
      outdoorEvidence.addWifiSample(s.networks || []);
    }
  };
  setInterval(drain, 2000);
}
