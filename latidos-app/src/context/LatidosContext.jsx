import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { initDB, getDB } from '../data/db';
import { t } from '../i18n';

const LatidosContext = createContext(null);

export const LatidosProvider = ({ children }) => {
  const [latidos, setLatidos] = useState(0);
  const [steps, setSteps] = useState(0);
  const [racha, setRacha] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(10000);
  const [weeklySteps, setWeeklySteps] = useState([0,0,0,0,0,0,0]);
  const [transactions, setTransactions] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [activity, setActivity] = useState([]);

  // Load preferences from localStorage immediately (fast cache) —
  // they will be overwritten by DB values once the DB is ready.
  const [theme, setTheme] = useState(() => localStorage.getItem('pref_theme') || 'light');
  const [language, setLanguage] = useState(() => localStorage.getItem('pref_language') || 'es');
  const [currency, setCurrency] = useState(() => localStorage.getItem('pref_currency') || 'EUR');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);

  // Initialize Local SQLite Database
  useEffect(() => {
    const setup = async () => {
      await initDB();
      setDbReady(true);
    };
    setup();
  }, []);

  // Check auth
  useEffect(() => {
    if (!dbReady) return;
    const savedUserId = localStorage.getItem('latidos_user_id');
    if (savedUserId) {
      setIsAuthenticated(true);
      setUserId(parseInt(savedUserId, 10));
    } else {
      setIsAuthenticated(false);
      setUserId(null);
      setUser(null);
      setLoading(false);
    }
  }, [dbReady]);

  // Fetch data
  useEffect(() => {
    if (isAuthenticated && userId && dbReady) {
      fetchData(userId);
    }
  }, [isAuthenticated, userId, dbReady]);

  const fetchData = async (uid) => {
    setLoading(true);
    const db = getDB();
    if (!db) { setLoading(false); return; }

    try {
      const userRes = await db.query('SELECT * FROM users WHERE id = ?', [uid]);
      const prefRes = await db.query('SELECT * FROM preferences WHERE user_id = ?', [uid]);
      const txRes = await db.query('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC', [uid]);
      const routesRes = await db.query('SELECT * FROM routes WHERE user_id = ? ORDER BY id DESC', [uid]);
      const actRes = await db.query('SELECT * FROM activity WHERE user_id = ? ORDER BY fecha DESC', [uid]);
      
      if (userRes.values && userRes.values.length > 0) {
        const u = userRes.values[0];
        const p = (prefRes.values && prefRes.values.length > 0) ? prefRes.values[0] : {};

        setUser({ 
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role || 'user',
          comercio_id: u.comercio_id
        });
        setLatidos(u.latidos || 0);
        setSteps(u.steps_today || 0);
        setRacha(u.racha || 0);
        setDailyGoal(u.daily_goal || 10000);
        setWeeklySteps(typeof u.weekly_steps === 'string' ? JSON.parse(u.weekly_steps) : (u.weekly_steps || [0,0,0,0,0,0,0]));

        // Apply and persist preferences to localStorage cache
        const loadedTheme = p.theme || 'light';
        const loadedLang = p.language || 'es';
        const loadedCurrency = p.currency || 'EUR';
        setTheme(loadedTheme);
        setLanguage(loadedLang);
        setCurrency(loadedCurrency);
        localStorage.setItem('pref_theme', loadedTheme);
        localStorage.setItem('pref_language', loadedLang);
        localStorage.setItem('pref_currency', loadedCurrency);
      }
      
      if (txRes.values) {
        setTransactions(txRes.values);
      }
      
      if (routesRes.values) {
        const parsedRoutes = routesRes.values.map(r => {
          let p = [];
          let pts = [];
          try { p = typeof r.path === 'string' ? JSON.parse(r.path) : (r.path || []); } catch (e) { p = []; }
          try { pts = typeof r.points === 'string' ? JSON.parse(r.points) : (r.points || []); } catch (e) { pts = []; }
          return { ...r, path: p, points: pts };
        });
        setSavedRoutes(parsedRoutes);
      }

      if (actRes.values) {
        setActivity(actRes.values);
      }
    } catch (err) {
      console.error('Failed to fetch from local SQLite:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const ganarLatidos = async (cantidad) => {
    const num = Number(cantidad) || 0;
    if (num <= 0) return;
    setLatidos(prev => {
      const next = prev + num;
      const db = getDB();
      if (db && userId) db.run('UPDATE users SET latidos = ? WHERE id = ?', [next, userId]).catch(console.error);
      return next;
    });
  };

  const canjearLatidos = (coste) => {
    const num = Number(coste) || 0;
    if (latidos < num) return false;
    setLatidos(prev => {
      const next = Math.max(0, prev - num);
      const db = getDB();
      if (db && userId) db.run('UPDATE users SET latidos = ? WHERE id = ?', [next, userId]).catch(console.error);
      return next;
    });
    return true;
  };

  const updateSteps = async (newSteps) => {
    setSteps(newSteps);
    const db = getDB();
    if (!db || !userId) return;

    try {
      await db.run('UPDATE users SET steps_today = ? WHERE id = ?', [newSteps, userId]);

      const fecha = new Date().toISOString().slice(0, 10);
      const existing = await db.query('SELECT id, pasos, latidos_ganados FROM activity WHERE user_id = ? AND fecha = ?', [userId, fecha]);
      if (existing.values && existing.values.length > 0) {
        const row = existing.values[0];
        const nextPasos = Math.max(row.pasos || 0, newSteps);
        await db.run('UPDATE activity SET pasos = ? WHERE id = ?', [nextPasos, row.id]);
        setActivity(prev => prev.map(a => a.id === row.id ? { ...a, pasos: nextPasos } : a));
      } else {
        await db.run('INSERT INTO activity (user_id, fecha, pasos, latidos_ganados) VALUES (?, ?, ?, 0)', [userId, fecha, newSteps]);
        const newRec = await db.query('SELECT * FROM activity WHERE user_id = ? AND fecha = ?', [userId, fecha]);
        if (newRec.values) setActivity(prev => [newRec.values[0], ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [activeCode, setActiveCode] = useState(() => {
    try {
      const saved = localStorage.getItem('latidos_active_code');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.expiresAt > Date.now()) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  const [activeCodeNotification, setActiveCodeNotification] = useState(null);
  const isRefundingRef = useRef(false);

  const cancelarOExpirarCodigo = async (reason = 'expired') => {
    if (isRefundingRef.current) return;
    isRefundingRef.current = true;

    let currentCode = activeCode;
    if (!currentCode) {
      try {
        currentCode = JSON.parse(localStorage.getItem('latidos_active_code'));
      } catch (e) {}
    }

    if (!currentCode) {
      isRefundingRef.current = false;
      return;
    }

    // Immediately remove from localStorage and state to prevent multiple executions
    setActiveCode(null);
    localStorage.removeItem('latidos_active_code');

    const refundAmount = Number(currentCode.latidosUsados) || 0;
    const { code, txId, descuento } = currentCode;

    if (refundAmount > 0) {
      // Refund atomically using functional update
      setLatidos(prev => {
        const next = prev + refundAmount;
        const db = getDB();
        if (db && userId) {
          db.run('UPDATE users SET latidos = ? WHERE id = ?', [next, userId]).catch(console.error);
        }
        return next;
      });

      const db = getDB();
      if (db && userId) {
        const tag = reason === 'cancelled' ? '(Cancelado - Devuelto)' : '(Caducado - Devuelto)';
        if (txId) {
          await db.run('UPDATE transactions SET descuento = ? WHERE id = ?', [`${descuento} ${tag}`, txId]).catch(() => {});
        } else if (code) {
          await db.run('UPDATE transactions SET descuento = ? WHERE code = ?', [`${descuento} ${tag}`, code]).catch(() => {});
        }
        const txRes = await db.query('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC', [userId]);
        if (txRes.values) setTransactions(txRes.values);
      }
    }

    if (reason === 'cancelled') {
      setActiveCodeNotification(`Código cancelado. Se han devuelto ${refundAmount} Latidos.`);
    } else {
      setActiveCodeNotification(`El código ${code} ha expirado y se te han devuelto ${refundAmount} Latidos.`);
    }

    setTimeout(() => {
      isRefundingRef.current = false;
    }, 500);
  };

  // Check expiration of activeCode every second & auto-refund
  useEffect(() => {
    if (!activeCode) return;

    const check = () => {
      if (Date.now() >= activeCode.expiresAt) {
        cancelarOExpirarCodigo('expired');
      }
    };

    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [activeCode, userId]);

  const updateDailyGoal = async (newGoal) => {
    setDailyGoal(newGoal);
    const db = getDB();
    if (db) await db.run('UPDATE users SET daily_goal = ? WHERE id = ?', [newGoal, userId]);
  };

  const registrarCanje = async (txInfo) => {
    const db = getDB();
    if (!db) return;
    try {
      await db.run(`INSERT INTO transactions (user_id, comercio_nombre, comercio_emoji, code, latidos_usados, descuento, fecha)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
         [userId, txInfo.comercioNombre, txInfo.comercioEmoji || '🏪', txInfo.code, txInfo.latidosUsados, txInfo.descuento, new Date().toISOString()]);
      
      const txRes = await db.query('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC', [userId]);
      if (txRes.values) setTransactions(txRes.values);
    } catch (err) { console.error(err); }
  };

  const generarCodigoCanje = async ({ comercio, bono }) => {
    if (activeCode && activeCode.expiresAt > Date.now()) {
      return { success: false, error: 'Ya tienes un código activo en curso. Espera a que termine o cancélalo.' };
    }

    const latidosRequeridos = bono.coste !== undefined ? parseInt(bono.coste, 10) : comercio.latidosNecesarios;
    if (latidos < latidosRequeridos) {
      return { success: false, error: 'Latidos insuficientes' };
    }

    const ok = canjearLatidos(latidosRequeridos);
    if (!ok) return { success: false, error: 'Error al canjear latidos' };

    const num = Math.floor(1000 + Math.random() * 9000);
    const code = `LAT-${num}`;
    const now = Date.now();
    const expiresAt = now + 600 * 1000; // 10 minutes

    let txId = null;
    const db = getDB();
    if (db && userId) {
      const res = await db.run(
        `INSERT INTO transactions (user_id, comercio_nombre, comercio_emoji, code, latidos_usados, descuento, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, comercio.nombre, comercio.emoji || '🏪', code, latidosRequeridos, bono.titulo, new Date().toISOString()]
      );
      if (res?.changes?.lastId) {
        txId = res.changes.lastId;
      }
      const txRes = await db.query('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC', [userId]);
      if (txRes.values) setTransactions(txRes.values);
    }

    const newActiveCode = {
      code,
      comercioNombre: comercio.nombre,
      comercioEmoji: comercio.emoji || '🏪',
      latidosUsados: latidosRequeridos,
      descuento: bono.titulo,
      expiresAt,
      createdAt: new Date().toISOString(),
      txId
    };

    setActiveCode(newActiveCode);
    localStorage.setItem('latidos_active_code', JSON.stringify(newActiveCode));
    return { success: true, activeCode: newActiveCode };
  };

  const cancelarCodigoCanje = async () => {
    await cancelarOExpirarCodigo('cancelled');
  };

  const savePreferences = async (newPrefs) => {
    // Write to localStorage immediately for instant persistence
    if (newPrefs.theme !== undefined) { setTheme(newPrefs.theme); localStorage.setItem('pref_theme', newPrefs.theme); }
    if (newPrefs.language !== undefined) { setLanguage(newPrefs.language); localStorage.setItem('pref_language', newPrefs.language); }
    if (newPrefs.currency !== undefined) { setCurrency(newPrefs.currency); localStorage.setItem('pref_currency', newPrefs.currency); }

    const db = getDB();
    if (!db) return;
    try {
      const updates = [];
      const params = [];
      ['theme', 'language', 'currency'].forEach(key => {
        if (newPrefs[key] !== undefined) {
          updates.push(`${key} = ?`);
          params.push(newPrefs[key]);
        }
      });
      if (updates.length) {
        params.push(userId);
        await db.run(`UPDATE preferences SET ${updates.join(', ')} WHERE user_id = ?`, params);
      }
    } catch (err) { console.error(err); }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    savePreferences({ theme: newTheme });
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    savePreferences({ language: lang });
  };

  const changeCurrency = (curr) => {
    setCurrency(curr);
    savePreferences({ currency: curr });
  };

  // ── Admin & Comercios Methods ──
  const fetchAdminStats = async () => {
    const db = getDB();
    if (!db) return null;
    try {
      const usersCount = await db.query('SELECT count(*) as count FROM users');
      const latidosTotal = await db.query('SELECT SUM(latidos) as total FROM users');
      const txStats = await db.query('SELECT count(*) as count, SUM(latidos_usados) as latidos_gastados, SUM(descuento) as descuentos FROM transactions');

      const usersData = await db.query('SELECT weekly_steps, steps_today FROM users');
      let totalSteps = 0;
      (usersData.values || []).forEach(u => {
        try {
          const weekly = JSON.parse(u.weekly_steps || '[0,0,0,0,0,0,0]');
          totalSteps += weekly.reduce((a, b) => a + b, 0);
        } catch (e) {}
        totalSteps += (u.steps_today || 0);
      });

      return {
        totalUsers: usersCount.values[0]?.count || 0,
        totalLatidos: latidosTotal.values[0]?.total || 0,
        totalSteps,
        totalTransactions: txStats.values[0]?.count || 0,
        totalLatidosGastados: txStats.values[0]?.latidos_gastados || 0,
        totalDescuentos: txStats.values[0]?.descuentos || 0
      };
    } catch (e) {
      console.error(e); return null;
    }
  };

  const fetchAdminUsers = async () => {
    const db = getDB();
    if (!db) return [];
    try {
      const res = await db.query('SELECT id, email, name, role, latidos, steps_today, racha, comercio_id, created_at FROM users ORDER BY created_at DESC');
      return res.values || [];
    } catch (e) {
      console.error(e); return [];
    }
  };

  const createUser = async (userData) => {
    const db = getDB();
    if (!db) return { success: false, error: 'Base de datos no disponible' };
    try {
      const cleanEmail = userData.email.trim().toLowerCase();
      const existing = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (existing.values && existing.values.length > 0) {
        return { success: false, error: 'El correo electrónico ya está registrado.' };
      }

      let role = userData.role || 'user';
      if (role === 'superadmin' && user?.role !== 'superadmin') {
        return { success: false, error: 'Solo un SuperAdministrador puede crear cuentas SuperAdministrador.' };
      }

      const password = userData.password || 'demo123';
      const name = userData.name || 'Usuario';
      const latidosInit = parseInt(userData.latidos, 10) || 0;
      const stepsInit = parseInt(userData.steps_today, 10) || 0;
      const rachaInit = parseInt(userData.racha, 10) || 0;
      const comercioId = userData.comercio_id ? parseInt(userData.comercio_id, 10) : null;

      await db.run(
        `INSERT INTO users (name, email, password, role, latidos, steps_today, racha, comercio_id, weekly_steps, daily_goal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[0,0,0,0,0,0,0]', 10000)`,
        [name, cleanEmail, password, role, latidosInit, stepsInit, rachaInit, comercioId]
      );

      const userRes = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (userRes.values && userRes.values.length > 0) {
        const newId = userRes.values[0].id;
        await db.run('INSERT INTO preferences (user_id, theme, language, currency) VALUES (?, ?, ?, ?)', [newId, 'light', 'es', 'EUR']);
      }

      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  };

  const fetchComercios = async () => {
    const db = getDB();
    if (!db) return [];
    try {
      const res = await db.query('SELECT * FROM comercios');
      if (res.values) {
        return res.values.map(c => {
          let parsedBonos = [];
          let parsedHorario = {};
          let parsedVacaciones = {};
          try { parsedBonos = typeof c.bonos === 'string' ? JSON.parse(c.bonos) : (c.bonos || []); } catch (e) { parsedBonos = []; }
          try { parsedHorario = typeof c.horario === 'string' ? JSON.parse(c.horario) : (c.horario || {}); } catch (e) { parsedHorario = {}; }
          try { parsedVacaciones = typeof c.vacaciones === 'string' ? JSON.parse(c.vacaciones) : (c.vacaciones || {}); } catch (e) { parsedVacaciones = {}; }
          
          return {
            ...c,
            bonos: parsedBonos,
            horario: parsedHorario,
            vacaciones: parsedVacaciones,
            aviso: c.aviso || '',
            telefono: c.telefono || '',
            email: c.email || '',
            latidosNecesarios: c.latidos_necesarios || c.latidosNecesarios
          };
        });
      }
      return [];
    } catch (e) {
      console.error(e); return [];
    }
  };

  const createComercio = async (comercioData) => {
    const db = getDB();
    if (!db) return false;
    try {
      await db.run(`INSERT INTO comercios (nombre, categoria, direccion, lat, lon, descuento, latidos_necesarios, color, emoji, bonos)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [comercioData.nombre, comercioData.categoria, comercioData.direccion, parseFloat(comercioData.lat), parseFloat(comercioData.lon), parseFloat(comercioData.descuento), parseInt(comercioData.latidosNecesarios, 10), comercioData.color || '#000000', comercioData.emoji || '🏪', JSON.stringify(comercioData.bonos || [])]);
      return true;
    } catch (e) { console.error(e); return false; }
  };

  const updateComercio = async (id, comercioData) => {
    const db = getDB();
    if (!db) return false;
    try {
      await db.run(`UPDATE comercios SET nombre = ?, categoria = ?, direccion = ?, lat = ?, lon = ?, descuento = ?, latidos_necesarios = ?, color = ?, emoji = ?, bonos = ? WHERE id = ?`,
         [comercioData.nombre, comercioData.categoria, comercioData.direccion, parseFloat(comercioData.lat), parseFloat(comercioData.lon), parseFloat(comercioData.descuento), parseInt(comercioData.latidosNecesarios, 10), comercioData.color, comercioData.emoji, JSON.stringify(comercioData.bonos || []), id]);
      return true;
    } catch (e) { console.error(e); return false; }
  };

  const deleteComercio = async (id) => {
    const db = getDB();
    if (!db) return false;
    try {
      await db.run('DELETE FROM comercios WHERE id = ?', [id]);
      return true;
    } catch (e) { console.error(e); return false; }
  };

  const updateUser = async (id, userData) => {
    const db = getDB();
    if (!db) return { success: false, error: 'Base de datos no disponible' };
    try {
      const targetRes = await db.query('SELECT role FROM users WHERE id = ?', [id]);
      if (!targetRes.values || targetRes.values.length === 0) {
        return { success: false, error: 'Usuario no encontrado' };
      }
      const targetUser = targetRes.values[0];

      // SuperAdmin is untouchable by regular admins
      if (targetUser.role === 'superadmin' && user?.role !== 'superadmin') {
        return { success: false, error: 'Los administradores no pueden modificar a un SuperAdministrador.' };
      }

      // Only superadmin can promote someone to superadmin
      if (userData.role === 'superadmin' && user?.role !== 'superadmin') {
        return { success: false, error: 'Solo un SuperAdministrador puede otorgar el rol de SuperAdministrador.' };
      }

      const comercioId = userData.comercio_id ? parseInt(userData.comercio_id, 10) : null;

      await db.run(`UPDATE users SET name = ?, email = ?, role = ?, latidos = ?, steps_today = ?, racha = ?, comercio_id = ? WHERE id = ?`,
         [userData.name, userData.email, userData.role, parseInt(userData.latidos, 10) || 0, parseInt(userData.steps_today, 10) || 0, parseInt(userData.racha, 10) || 0, comercioId, id]);
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  };

  const deleteUser = async (id) => {
    const db = getDB();
    if (!db) return { success: false, error: 'Base de datos no disponible' };
    try {
      const targetRes = await db.query('SELECT role FROM users WHERE id = ?', [id]);
      if (!targetRes.values || targetRes.values.length === 0) {
        return { success: false, error: 'Usuario no encontrado' };
      }
      const targetUser = targetRes.values[0];

      // SuperAdmin cannot be deleted by regular admins
      if (targetUser.role === 'superadmin' && user?.role !== 'superadmin') {
        return { success: false, error: 'Los administradores no pueden eliminar a un SuperAdministrador.' };
      }

      if (id === userId) {
        return { success: false, error: 'No puedes eliminar tu propia cuenta mientras estás conectado.' };
      }

      await db.run('DELETE FROM preferences WHERE user_id = ?', [id]);
      await db.run('DELETE FROM routes WHERE user_id = ?', [id]);
      await db.run('DELETE FROM transactions WHERE user_id = ?', [id]);
      await db.run('DELETE FROM activity WHERE user_id = ?', [id]);
      await db.run('DELETE FROM users WHERE id = ?', [id]);
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  };

  // ── Auth & Rutas ──
  const registerUser = async (nombre, email, password) => {
    const db = getDB();
    if (!db) throw new Error('DB not loaded');
    const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.values && existing.values.length > 0) {
      throw new Error('El email ya está registrado');
    }
    await db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [nombre, email, password]);
    const userRes = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    const newId = userRes.values[0].id;
    await db.run('INSERT INTO preferences (user_id, theme, language, currency) VALUES (?, ?, ?, ?)', [newId, 'light', 'es', 'EUR']);
    completeLogin(newId);
  };

  const loginUser = async (email, password) => {
    const db = getDB();
    if (!db) throw new Error('DB not loaded');
    const userRes = await db.query('SELECT id FROM users WHERE email = ? AND password = ?', [email, password]);
    if (!userRes.values || userRes.values.length === 0) {
      throw new Error('Credenciales incorrectas');
    }
    const loginId = userRes.values[0].id;
    if (email === 'usuario@latidos.app') {
       await db.run(`UPDATE users SET latidos = 1130, steps_today = 0, racha = 6, weekly_steps = '[4200,6100,8500,9200,7800,11200,0]' WHERE id = ?`, [loginId]);
    }
    completeLogin(loginId);
  };

  const login = async () => {
    completeLogin(1);
  };

  const completeLogin = (id) => {
    localStorage.setItem('latidos_user_id', id.toString());
    setUserId(id);
    setIsAuthenticated(true);
    fetchData(id);
  };

  const logout = () => {
    localStorage.removeItem('latidos_user_id');
    setIsAuthenticated(false);
    setUserId(null);
    setUser(null);
    setLatidos(0);
    setSteps(0);
    setRacha(0);
    setWeeklySteps([0,0,0,0,0,0,0]);
    setTransactions([]);
    setSavedRoutes([]);
  };

  const saveRoute = async (routeData) => {
    const db = getDB();
    if (!db || !userId) return;
    try {
      await db.run(
        `INSERT INTO routes (user_id, name, distance, duration, latidos_earned, path, points) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          routeData.name,
          routeData.distance,
          routeData.duration,
          routeData.latidos_earned,
          JSON.stringify(routeData.path || []),
          JSON.stringify(routeData.points || [])
        ]
      );
      const routesRes = await db.query('SELECT * FROM routes WHERE user_id = ? ORDER BY id DESC', [userId]);
      if (routesRes.values) {
        const parsedRoutes = routesRes.values.map(r => {
          let p = [];
          let pts = [];
          try { p = typeof r.path === 'string' ? JSON.parse(r.path) : (r.path || []); } catch (e) { p = []; }
          try { pts = typeof r.points === 'string' ? JSON.parse(r.points) : (r.points || []); } catch (e) { pts = []; }
          return { ...r, path: p, points: pts };
        });
        setSavedRoutes(parsedRoutes);
      }
    } catch (e) { console.error('Error saving route:', e); }
  };

  const deleteRoute = async (id) => {
    const db = getDB();
    if (!db) return;
    try {
      await db.run('DELETE FROM routes WHERE id = ?', [Number(id)]);
      setSavedRoutes(prev => prev.filter(r => Number(r.id) !== Number(id)));
    } catch (e) { console.error('Error deleting route:', e); }
  };

  const updateRoute = async (id, updatedData) => {
    const db = getDB();
    if (!db) return;
    try {
      await db.run('UPDATE routes SET name = ?, points = ? WHERE id = ?', [updatedData.name, JSON.stringify(updatedData.points), id]);
      setSavedRoutes(prev => prev.map(r => r.id === id ? { ...r, ...updatedData } : r));
    } catch (e) { console.error(e); }
  };

  // ── Extra Comercio ──
  const validarBono = async (codigo, importe) => {
    const db = getDB();
    if (!db) return { success: false };
    try {
      const txRes = await db.query('SELECT id FROM transactions WHERE code = ? AND comercio_nombre = (SELECT nombre FROM comercios WHERE id = ?)', [codigo, user?.comercio_id]);
      if (!txRes.values || txRes.values.length === 0) return { success: false, error: 'Código inválido' };
      await db.run('UPDATE transactions SET importe_compra = ? WHERE id = ?', [parseFloat(importe), txRes.values[0].id]);

      // If activeCode matches this validated code, clear it
      try {
        const saved = localStorage.getItem('latidos_active_code');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.code === codigo) {
            setActiveCode(null);
            localStorage.removeItem('latidos_active_code');
          }
        }
      } catch (e) {}

      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const fetchComercioStats = async () => {
    const db = getDB();
    if (!db || !user?.comercio_id) return { transactions: [] };
    try {
      const cRes = await db.query('SELECT nombre FROM comercios WHERE id = ?', [user.comercio_id]);
      if (cRes.values && cRes.values.length > 0) {
        const txRes = await db.query('SELECT * FROM transactions WHERE comercio_nombre = ?', [cRes.values[0].nombre]);
        return { transactions: txRes.values || [] };
      }
      return { transactions: [] };
    } catch (e) { return { transactions: [] }; }
  };

  const updateComercioBonos = async (bonos) => {
    const db = getDB();
    if (!db || !user?.comercio_id) return false;
    try {
      await db.run('UPDATE comercios SET bonos = ? WHERE id = ?', [JSON.stringify(bonos), user.comercio_id]);
      return true;
    } catch (e) { return false; }
  };

  const updateComercioHorarios = async (comercioId, { horario, vacaciones, aviso, telefono, email }) => {
    const db = getDB();
    const targetId = Number(comercioId || user?.comercio_id || 2);
    if (!db) return false;
    try {
      const hVal = typeof horario === 'string' ? horario : JSON.stringify(horario || {});
      const vVal = typeof vacaciones === 'string' ? vacaciones : JSON.stringify(vacaciones || {});
      const aVal = typeof aviso === 'string' ? aviso : (aviso || '');
      const telVal = telefono !== undefined ? telefono : '';
      const emailVal = email !== undefined ? email : '';
      
      try {
        await db.run('UPDATE comercios SET horario = ?, vacaciones = ?, aviso = ?, telefono = ?, email = ? WHERE id = ?', [hVal, vVal, aVal, telVal, emailVal, targetId]);
      } catch (colErr) {
        console.warn('Attempting SQLite migration fallback for comercios columns:', colErr);
        try { await db.run('ALTER TABLE comercios ADD COLUMN horario TEXT DEFAULT "{}"'); } catch (e) {}
        try { await db.run('ALTER TABLE comercios ADD COLUMN vacaciones TEXT DEFAULT "{}"'); } catch (e) {}
        try { await db.run('ALTER TABLE comercios ADD COLUMN aviso TEXT DEFAULT ""'); } catch (e) {}
        try { await db.run('ALTER TABLE comercios ADD COLUMN telefono TEXT DEFAULT ""'); } catch (e) {}
        try { await db.run('ALTER TABLE comercios ADD COLUMN email TEXT DEFAULT ""'); } catch (e) {}
        await db.run('UPDATE comercios SET horario = ?, vacaciones = ?, aviso = ?, telefono = ?, email = ? WHERE id = ?', [hVal, vVal, aVal, telVal, emailVal, targetId]);
      }
      return true;
    } catch (e) {
      console.error('Error updating comercio info:', e);
      return false;
    }
  };

  // ── Activity History ──
  const registrarActividad = async (pasos, latidosGanados) => {
    const db = getDB();
    if (!db || !userId) return;
    const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    try {
      // Try to update today's record; if it doesn't exist, insert it
      const existing = await db.query('SELECT id, pasos, latidos_ganados FROM activity WHERE user_id = ? AND fecha = ?', [userId, fecha]);
      if (existing.values && existing.values.length > 0) {
        const row = existing.values[0];
        const newPasos = Math.max(row.pasos, pasos);
        const newLatidos = row.latidos_ganados + latidosGanados;
        await db.run('UPDATE activity SET pasos = ?, latidos_ganados = ? WHERE id = ?', [newPasos, newLatidos, row.id]);
        setActivity(prev => prev.map(a => a.id === row.id ? { ...a, pasos: newPasos, latidos_ganados: newLatidos } : a));
      } else {
        await db.run('INSERT INTO activity (user_id, fecha, pasos, latidos_ganados) VALUES (?, ?, ?, ?)', [userId, fecha, pasos, latidosGanados]);
        const newRec = await db.query('SELECT * FROM activity WHERE user_id = ? AND fecha = ?', [userId, fecha]);
        if (newRec.values) setActivity(prev => [newRec.values[0], ...prev]);
      }
    } catch (e) { console.error(e); }
  };

  // Current translations shortcut
  const tr = t[language] || t.es;

  return (
    <LatidosContext.Provider value={{
      latidos, steps, racha, dailyGoal, weeklySteps, transactions, savedRoutes, activity,
      isAuthenticated, user, loading, theme, language, currency, tr,
      activeCode, activeCodeNotification, setActiveCodeNotification,
      generarCodigoCanje, cancelarCodigoCanje,
      ganarLatidos, canjearLatidos, updateSteps, updateDailyGoal, registrarCanje,
      savePreferences, toggleTheme, setLanguage: changeLanguage, setCurrency: changeCurrency,
      saveRoute, deleteRoute, updateRoute, login, logout, loginUser, registerUser,
      fetchAdminStats, fetchAdminUsers, createUser, fetchComercios, createComercio, updateComercio,
      deleteComercio, updateUser, deleteUser, validarBono, fetchComercioStats, updateComercioBonos,
      updateComercioHorarios,
      registrarActividad
    }}>
      {children}
    </LatidosContext.Provider>
  );
};

export const useLatidos = () => useContext(LatidosContext);
