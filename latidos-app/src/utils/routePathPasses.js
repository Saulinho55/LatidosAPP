/**
 * Sistema de detección de pasadas y colores de ruta (Latidos Anti-Farm):
 * - Línea 1 (1ª pasada / calle nueva): Verde (#22c55e)
 * - Línea 2 (2ª pasada / la vuelta): Amarillo (#eab308)
 * - Línea 3 (3ª pasada / repetición): Naranja (#f97316)
 * - Línea 4 (4ª pasada o más): Rojo (#ef4444) -> ¡Pausa el conteo de pasos!
 */

export const MATCH_RADIUS_M = 20.0;

export const PASS_COLORS = {
  1: '#22c55e', // Verde (1ª pasada)
  2: '#eab308', // Amarilla (2ª pasada / vuelta)
  3: '#f97316', // Naranja (3ª pasada)
  4: '#ef4444'  // Roja (4ª pasada / límite alcanzado)
};

/**
 * Distancia Haversine en metros entre dos puntos { lat, lon }.
 */
export function haversineDist(p1, p2) {
  if (!p1 || !p2) return 0;
  const R = 6371000;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcula el rumbo geográfico (bearing en grados 0-360) entre dos puntos.
 */
export function calculateBearing(p1, p2) {
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Calcula la diferencia angular mínima entre dos rumbos (0 a 180 grados).
 */
export function angularDifference(a1, a2) {
  const diff = Math.abs(a1 - a2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Evalúa el número de pasada (1 a 4) para un nuevo punto GPS con respecto al historial de la ruta.
 *
 * @param {Array<{lat: number, lon: number, time?: number, pass?: number}>} existingPath - Puntos ya registrados
 * @param {{lat: number, lon: number, time?: number}} newPoint - Nuevo punto que se va a añadir
 * @returns {{ pass: number, color: string, isLimit: boolean }}
 */
export function evaluatePointPass(existingPath, newPoint) {
  if (!existingPath || existingPath.length === 0) {
    return { pass: 1, color: PASS_COLORS[1], isLimit: false };
  }

  // Rumbo actual de movimiento (del último punto al nuevo punto)
  const lastPt = existingPath[existingPath.length - 1];
  const curHeading = calculateBearing(lastPt, newPoint);

  let maxHistPass = 0;
  let hasMatch = false;

  // Recorrer el camino hacia atrás acumulando distancia recorrida
  let pathDistFromNew = 0;
  for (let i = existingPath.length - 1; i >= 0; i--) {
    const nextPt = (i === existingPath.length - 1) ? newPoint : existingPath[i + 1];
    pathDistFromNew += haversineDist(existingPath[i], nextPt);

    // Si el punto histórico i tiene predecesor, calculamos su rumbo
    let isOppositeDirection = false;
    if (i > 0) {
      const histHeading = calculateBearing(existingPath[i - 1], existingPath[i]);
      if (angularDifference(curHeading, histHeading) >= 120) {
        isOppositeDirection = true;
      }
    }

    // Distancia mínima a lo largo de la traza para considerar repetición:
    // Si camina en dirección opuesta (vuelta / cambio de sentido): 10 metros bastan
    // Si camina en la misma dirección (un bucle / vuelta a la manzana): mínimo 35 metros
    const minPathDist = isOppositeDirection ? 10.0 : 35.0;

    if (pathDistFromNew >= minPathDist) {
      const d = haversineDist(existingPath[i], newPoint);
      if (d <= MATCH_RADIUS_M) {
        hasMatch = true;
        const p = existingPath[i].pass || 1;
        if (p > maxHistPass) {
          maxHistPass = p;
        }
      }
    }
  }

  const pass = hasMatch ? Math.min(4, maxHistPass + 1) : 1;
  const isLimit = pass >= 4;

  return {
    pass,
    color: PASS_COLORS[pass] || PASS_COLORS[4],
    isLimit
  };
}

/**
 * Agrupa los puntos de una ruta en segmentos coloreados según su nivel de pasada (1 a 4).
 * Cada grupo contiene un array de coordenadas de segmentos [[lat, lon], [lat, lon]] para Leaflet.
 */
export function buildColoredSegments(routePoints) {
  const groups = { 1: [], 2: [], 3: [], 4: [] };
  if (!routePoints || routePoints.length < 2) return groups;

  for (let i = 1; i < routePoints.length; i++) {
    const pPrev = routePoints[i - 1];
    const pCur = routePoints[i];
    const pass = Math.min(4, Math.max(1, pCur.pass || 1));
    groups[pass].push([
      [pPrev.lat, pPrev.lon],
      [pCur.lat, pCur.lon]
    ]);
  }

  return groups;
}
