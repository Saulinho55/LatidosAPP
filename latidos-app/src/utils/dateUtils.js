/**
 * Date and time utilities tailored for local device time.
 * Avoids any UTC offset bugs that shift dates forward or backward.
 */

/**
 * Returns the current date (or provided date) as 'YYYY-MM-DD' in the user's local timezone.
 */
export const getLocalDateStr = (d = new Date()) => {
  const date = d instanceof Date ? d : new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses 'YYYY-MM-DD' into a local Date object at 00:00:00 local time.
 * Prevents native Date("YYYY-MM-DD") from treating it as UTC midnight and shifting backwards.
 */
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (typeof dateStr !== 'string') return new Date(dateStr);
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, monthIndex, day, 0, 0, 0, 0);
  }
  return new Date(dateStr);
};

/**
 * Formats a 'YYYY-MM-DD' string for display:
 * - "Hoy, 1 oct 2026"
 * - "Ayer, 30 sep 2026"
 * - "Mié, 29 sep 2026"
 */
export const formatDisplayDate = (fechaStr, tr = {}) => {
  if (!fechaStr) return tr?.hoy || 'Hoy';
  const todayStr = getLocalDateStr();
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);

  const cleanDateStr = fechaStr.split('T')[0];
  const d = parseLocalDate(cleanDateStr);

  if (cleanDateStr === todayStr) {
    return `${tr?.hoy || 'Hoy'}, ${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  if (cleanDateStr === yesterdayStr) {
    return `${tr?.ayer || 'Ayer'}, ${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }

  return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Returns the Date object representing Monday (00:00:00) of the current week for a given date.
 */
export const getMondayOfWeek = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return date;
};

/**
 * Returns an array of 7 'YYYY-MM-DD' strings for Monday..Sunday of the week of `d`.
 */
export const getWeekDates = (d = new Date()) => {
  const monday = getMondayOfWeek(d);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    dates.push(getLocalDateStr(day));
  }
  return dates;
};

/**
 * Computes weekly steps [L, M, X, J, V, S, D] by matching real activity records
 * with the dates of the current week, including live steps for today.
 */
export const computeWeeklyStepsFromActivity = (activityList = [], liveStepsToday = 0) => {
  const weekDates = getWeekDates();
  const todayStr = getLocalDateStr();

  return weekDates.map((dateStr) => {
    let daySteps = 0;
    const act = (activityList || []).find(a => (a.fecha || '').split('T')[0] === dateStr);
    if (act && typeof act.pasos === 'number') {
      daySteps = act.pasos;
    }
    if (dateStr === todayStr) {
      daySteps = Math.max(daySteps, liveStepsToday || 0);
    }
    return daySteps;
  });
};

/**
 * Computes the consecutive daily streak based on whether the dailyGoal was reached.
 */
export const computeStreakFromActivity = (activityList = [], liveStepsToday = 0, dailyGoal = 10000) => {
  const goal = Number(dailyGoal) || 10000;
  const todayStr = getLocalDateStr();

  // Map of date string -> total steps
  const stepsByDate = new Map();
  (activityList || []).forEach(a => {
    if (a && a.fecha) {
      const d = a.fecha.split('T')[0];
      stepsByDate.set(d, Math.max(stepsByDate.get(d) || 0, a.pasos || 0));
    }
  });

  // Include today live
  const effectiveToday = Math.max(stepsByDate.get(todayStr) || 0, liveStepsToday || 0);
  stepsByDate.set(todayStr, effectiveToday);

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Check today first
  const todayReached = effectiveToday >= goal;
  if (todayReached) {
    streak++;
  }

  // Check backwards day by day starting from yesterday
  cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const dStr = getLocalDateStr(cursor);
    const daySteps = stepsByDate.get(dStr) || 0;
    if (daySteps >= goal) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};
