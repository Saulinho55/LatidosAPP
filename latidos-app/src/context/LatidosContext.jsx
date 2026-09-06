import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabaseService } from '../services/supabaseService';
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

  // Preferences
  const [theme, setTheme] = useState(() => localStorage.getItem('pref_theme') || 'light');
  const [language, setLanguage] = useState(() => localStorage.getItem('pref_language') || 'es');
  const [currency, setCurrency] = useState(() => localStorage.getItem('pref_currency') || 'EUR');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check saved session on start
  useEffect(() => {
    const savedUserId = localStorage.getItem('latidos_user_id');
    if (savedUserId) {
      const uid = parseInt(savedUserId, 10);
      setIsAuthenticated(true);
      setUserId(uid);
      fetchData(uid);
    } else {
      setIsAuthenticated(false);
      setUserId(null);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const fetchData = async (uid) => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const supaUser = await supabaseService.getUserById(uid);
      if (supaUser) {
        setUser({
          id: supaUser.id,
          name: supaUser.name,
          email: supaUser.email,
          role: supaUser.role || 'user',
          comercio_id: supaUser.comercio_id
        });
        setLatidos(supaUser.latidos || 0);
        setSteps(supaUser.steps_today || 0);
        setRacha(supaUser.racha || 0);
        setDailyGoal(supaUser.daily_goal || 10000);
        setWeeklySteps(
          typeof supaUser.weekly_steps === 'string'
            ? JSON.parse(supaUser.weekly_steps || '[0,0,0,0,0,0,0]')
            : (supaUser.weekly_steps || [0,0,0,0,0,0,0])
        );

        // Fetch user preferences
        const supaPrefs = await supabaseService.getPreferences(uid);
        if (supaPrefs && supaPrefs.theme) {
          const loadedTheme = supaPrefs.theme || 'light';
          const loadedLang = supaPrefs.language || 'es';
          const loadedCurr = supaPrefs.currency || 'EUR';
          setTheme(loadedTheme);
          setLanguage(loadedLang);
          setCurrency(loadedCurr);
          localStorage.setItem('pref_theme', loadedTheme);
          localStorage.setItem('pref_language', loadedLang);
          localStorage.setItem('pref_currency', loadedCurr);
          document.documentElement.setAttribute('data-theme', loadedTheme);
        } else {
          const currentTheme = localStorage.getItem('pref_theme') || 'light';
          const currentLang = localStorage.getItem('pref_language') || 'es';
          const currentCurr = localStorage.getItem('pref_currency') || 'EUR';
          supabaseService.upsertPreferences(uid, {
            theme: currentTheme,
            language: currentLang,
            currency: currentCurr
          }).catch(console.error);
        }

        // Fetch transactions, routes, activity from Supabase
        const [supaTx, supaRoutes, supaAct] = await Promise.allSettled([
          supabaseService.getTransactions(uid),
          supabaseService.getRoutes(uid),
          supabaseService.getActivity(uid)
        ]);

        if (supaTx.status === 'fulfilled') setTransactions(supaTx.value);
        if (supaRoutes.status === 'fulfilled') setSavedRoutes(supaRoutes.value);
        if (supaAct.status === 'fulfilled') setActivity(supaAct.value);
      } else {
        // If user not found in Supabase (e.g. deleted from cloud)
        logout();
      }
    } catch (supaErr) {
      console.error('Error fetching data from Supabase:', supaErr);
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
      if (userId) {
        supabaseService.updateUser(userId, { latidos: next }).catch(console.error);
      }
      return next;
    });
  };

  const canjearLatidos = (coste) => {
    const num = Number(coste) || 0;
    if (latidos < num) return false;
    setLatidos(prev => {
      const next = Math.max(0, prev - num);
      if (userId) {
        supabaseService.updateUser(userId, { latidos: next }).catch(console.error);
      }
      return next;
    });
    return true;
  };

  const updateSteps = async (newSteps) => {
    setSteps(newSteps);
    if (!userId) return;

    try {
      await supabaseService.updateUser(userId, { steps_today: newSteps });
      const fecha = new Date().toISOString().slice(0, 10);
      const updatedAct = await supabaseService.upsertActivity(userId, fecha, newSteps, 0);
      if (updatedAct) {
        setActivity(prev => {
          const exists = prev.some(a => a.id === updatedAct.id);
          if (exists) {
            return prev.map(a => a.id === updatedAct.id ? updatedAct : a);
          }
          return [updatedAct, ...prev];
        });
      }
    } catch (e) {
      console.error('Error updating steps in Supabase:', e);
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

    setActiveCode(null);
    localStorage.removeItem('latidos_active_code');

    const refundAmount = Number(currentCode.latidosUsados) || 0;
    const { code, txId, descuento } = currentCode;

    if (refundAmount > 0 && userId) {
      setLatidos(prev => {
        const next = prev + refundAmount;
        supabaseService.updateUser(userId, { latidos: next }).catch(console.error);
        return next;
      });

      const tag = reason === 'cancelled' ? '(Cancelado - Devuelto)' : '(Caducado - Devuelto)';
      if (txId) {
        supabaseService.updateTransaction(txId, { descuento: `${descuento} ${tag}` })
          .then(() => supabaseService.getTransactions(userId))
          .then(txs => setTransactions(txs))
          .catch(console.error);
      } else if (code) {
        supabaseService.updateTransactionByCode(code, { descuento: `${descuento} ${tag}` })
          .then(() => supabaseService.getTransactions(userId))
          .then(txs => setTransactions(txs))
          .catch(console.error);
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
    if (userId) {
      supabaseService.updateUser(userId, { daily_goal: newGoal }).catch(console.error);
    }
  };

  const registrarCanje = async (txInfo) => {
    const payload = {
      user_id: userId,
      comercio_nombre: txInfo.comercioNombre,
      comercio_emoji: txInfo.comercioEmoji || '🏪',
      code: txInfo.code,
      latidos_usados: txInfo.latidosUsados,
      descuento: txInfo.descuento,
      fecha: new Date().toISOString()
    };

    try {
      const supaTx = await supabaseService.addTransaction(payload);
      if (supaTx) {
        setTransactions(prev => [supaTx, ...prev]);
      }
    } catch (e) {
      console.error('Error in registrarCanje:', e);
    }
  };

  const generarCodigoCanje = async ({ comercio, bono }) => {
    if (activeCode && activeCode.expiresAt > Date.now()) {
      return { success: false, error: 'Ya tienes un código activo en curso. Espera a que termine o cancélalo.' };
    }

    const latidosRequeridos = bono.coste !== undefined ? parseInt(bono.coste, 10) : (comercio.latidosNecesarios || comercio.latidos_necesarios || 200);
    if (latidos < latidosRequeridos) {
      return { success: false, error: 'Latidos insuficientes' };
    }

    const ok = canjearLatidos(latidosRequeridos);
    if (!ok) return { success: false, error: 'Error al canjear latidos' };

    const num = Math.floor(1000 + Math.random() * 9000);
    const code = `LAT-${num}`;
    const now = Date.now();
    const expiresAt = now + 600 * 1000; // 10 minutes

    const currentUid = userId || parseInt(localStorage.getItem('latidos_user_id'), 10) || 1;
    
    // Ensure numeric descuento for Supabase schema
    let descuentoNum = 0;
    if (typeof bono?.descuento === 'number') descuentoNum = bono.descuento;
    else if (typeof comercio?.descuento === 'number') descuentoNum = comercio.descuento;
    else if (parseFloat(bono?.descuento)) descuentoNum = parseFloat(bono.descuento);
    else if (parseFloat(comercio?.descuento)) descuentoNum = parseFloat(comercio.descuento);
    else descuentoNum = Math.max(1, Math.round(latidosRequeridos / 100));

    let txId = null;
    const txData = {
      user_id: currentUid,
      comercio_nombre: comercio.nombre,
      comercio_emoji: comercio.emoji || '🏪',
      code,
      latidos_usados: latidosRequeridos,
      descuento: descuentoNum,
      importe_compra: null,
      fecha: new Date().toISOString()
    };

    try {
      const supaTx = await supabaseService.addTransaction(txData);
      if (supaTx) {
        txId = supaTx.id;
        setTransactions(prev => [supaTx, ...prev]);
      }
    } catch (e) {
      console.error('Error generating canje code in Supabase:', e);
    }

    const newActiveCode = {
      code,
      comercioNombre: comercio.nombre,
      comercioEmoji: comercio.emoji || '🏪',
      latidosUsados: latidosRequeridos,
      descuento: bono?.titulo || `${descuentoNum}€ de descuento`,
      descuentoValor: descuentoNum,
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
    if (newPrefs.theme !== undefined) {
      setTheme(newPrefs.theme);
      localStorage.setItem('pref_theme', newPrefs.theme);
      document.documentElement.setAttribute('data-theme', newPrefs.theme);
    }
    if (newPrefs.language !== undefined) {
      setLanguage(newPrefs.language);
      localStorage.setItem('pref_language', newPrefs.language);
    }
    if (newPrefs.currency !== undefined) {
      setCurrency(newPrefs.currency);
      localStorage.setItem('pref_currency', newPrefs.currency);
    }

    const currentUid = userId || parseInt(localStorage.getItem('latidos_user_id'), 10);
    if (currentUid) {
      await supabaseService.upsertPreferences(currentUid, newPrefs).catch(console.error);
    }
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') || theme || 'light';
    const newTheme = current === 'dark' ? 'light' : 'dark';
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

  // ── Admin Methods ──
  const fetchAdminStats = async () => {
    try {
      return await supabaseService.getAdminStats();
    } catch (e) {
      console.error('Error in fetchAdminStats:', e);
      return { totalUsers: 0, totalLatidos: 0, totalSteps: 0, totalTransactions: 0, totalLatidosGastados: 0, totalDescuentos: 0 };
    }
  };

  const fetchAdminUsers = async () => {
    try {
      return await supabaseService.getAllUsers();
    } catch (e) {
      console.error('Error in fetchAdminUsers:', e);
      return [];
    }
  };

  const createUser = async (userData) => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const role = userData.role || 'user';
    if (role === 'superadmin' && user?.role !== 'superadmin') {
      return { success: false, error: 'Solo un SuperAdministrador puede crear cuentas SuperAdministrador.' };
    }

    const payload = {
      name: userData.name || 'Usuario',
      email: cleanEmail,
      password: userData.password || 'demo123',
      role,
      latidos: parseInt(userData.latidos, 10) || 0,
      steps_today: parseInt(userData.steps_today, 10) || 0,
      racha: parseInt(userData.racha, 10) || 0,
      comercio_id: userData.comercio_id ? parseInt(userData.comercio_id, 10) : null,
      weekly_steps: '[0,0,0,0,0,0,0]',
      daily_goal: 10000
    };

    try {
      await supabaseService.registerUser(payload);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Error al guardar el usuario en la base de datos' };
    }
  };

  const fetchComercios = async () => {
    try {
      return await supabaseService.getComercios();
    } catch (e) {
      console.error('Error in fetchComercios:', e);
      return [];
    }
  };

  const createComercio = async (comercioData) => {
    try {
      await supabaseService.createComercio(comercioData);
      return true;
    } catch (e) {
      console.error('Error in createComercio:', e);
      return false;
    }
  };

  const updateComercio = async (id, comercioData) => {
    try {
      await supabaseService.updateComercio(id, comercioData);
      return true;
    } catch (e) {
      console.error('Error in updateComercio:', e);
      return false;
    }
  };

  const deleteComercio = async (id) => {
    try {
      await supabaseService.deleteComercio(id);
      return true;
    } catch (e) {
      console.error('Error in deleteComercio:', e);
      return false;
    }
  };

  const updateUser = async (id, userData) => {
    try {
      const targetRes = await supabaseService.getUserById(id);
      if (targetRes) {
        if (targetRes.role === 'superadmin' && user?.role !== 'superadmin') {
          return { success: false, error: 'Los administradores no pueden modificar a un SuperAdministrador.' };
        }
        if (userData.role === 'superadmin' && user?.role !== 'superadmin') {
          return { success: false, error: 'Solo un SuperAdministrador puede otorgar el rol de SuperAdministrador.' };
        }
        await supabaseService.updateUser(id, userData);
        return { success: true };
      }
      return { success: false, error: 'Usuario no encontrado' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const deleteUser = async (id) => {
    if (id === userId) {
      return { success: false, error: 'No puedes eliminar tu propia cuenta mientras estás conectado.' };
    }

    try {
      const targetRes = await supabaseService.getUserById(id);
      if (targetRes && targetRes.role === 'superadmin' && user?.role !== 'superadmin') {
        return { success: false, error: 'Los administradores no pueden eliminar a un SuperAdministrador.' };
      }

      await supabaseService.deleteUser(id);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // ── Auth ──
  const registerUser = async (nombre, email, password) => {
    const cleanEmail = email.trim().toLowerCase();

    const supaUser = await supabaseService.registerUser({
      name: nombre,
      email: cleanEmail,
      password: password,
      role: 'user',
      latidos: 0,
      steps_today: 0,
      racha: 0,
      weekly_steps: '[0,0,0,0,0,0,0]',
      daily_goal: 10000
    });

    completeLogin(supaUser.id);
  };

  const loginUser = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const loggedUser = await supabaseService.login(cleanEmail, password);

    if (!loggedUser) {
      throw new Error('Credenciales incorrectas');
    }

    completeLogin(loggedUser.id);
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
    if (!userId) return;
    try {
      const supaRoute = await supabaseService.addRoute({ ...routeData, user_id: userId });
      if (supaRoute) {
        setSavedRoutes(prev => [supaRoute, ...prev]);
      }
    } catch (e) {
      console.error('Error in saveRoute:', e);
    }
  };

  const deleteRoute = async (id) => {
    try {
      await supabaseService.deleteRoute(id);
      setSavedRoutes(prev => prev.filter(r => Number(r.id) !== Number(id)));
    } catch (e) {
      console.error('Error in deleteRoute:', e);
    }
  };

  const updateRoute = async (id, updatedData) => {
    try {
      const updated = await supabaseService.updateRoute(id, updatedData);
      if (updated) {
        setSavedRoutes(prev => prev.map(r => r.id === id ? { ...r, ...updatedData } : r));
      }
    } catch (e) {
      console.error('Error in updateRoute:', e);
    }
  };

  // ── Comercio Extra ──
  const validarBono = async (codigo, importe) => {
    let comId = user?.comercio_id;
    if (!comId) {
      try {
        const cList = await supabaseService.getComercios();
        const match = cList.find(c => 
          (c.email && user?.email && c.email.toLowerCase() === user.email.toLowerCase()) ||
          (c.nombre && user?.name && c.nombre.toLowerCase() === user.name.toLowerCase())
        );
        if (match) {
          comId = match.id;
        } else if (cList.length > 0) {
          comId = cList[0].id;
        }
      } catch (e) {}
    }

    if (!comId) return { success: false, error: 'No tienes un comercio asociado a tu cuenta.' };
    try {
      const updatedTx = await supabaseService.validateBono(codigo, comId, importe);

      // If activeCode matches this validated code, clear it
      try {
        const cleanCode = (codigo || '').trim().toUpperCase();
        const saved = localStorage.getItem('latidos_active_code');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.code === cleanCode || parsed.code === `LAT-${cleanCode}`)) {
            setActiveCode(null);
            localStorage.removeItem('latidos_active_code');
          }
        }
      } catch (e) {}

      return { success: true, data: updatedTx };
    } catch (e) {
      return { success: false, error: e.message || 'Error al validar el bono' };
    }
  };

  const fetchComercioStats = async () => {
    try {
      const cList = await supabaseService.getComercios();
      let myComercio = null;

      if (user?.comercio_id) {
        myComercio = cList.find(c => Number(c.id) === Number(user.comercio_id));
      }
      if (!myComercio && user) {
        myComercio = cList.find(c =>
          (c.email && user.email && c.email.toLowerCase() === user.email.toLowerCase()) ||
          (c.nombre && user.name && c.nombre.toLowerCase() === user.name.toLowerCase())
        );
      }
      if (!myComercio && cList.length > 0) {
        myComercio = cList[0];
      }

      if (myComercio) {
        const txs = await supabaseService.getTransactionsByComercio(myComercio.nombre);
        return { transactions: txs, comercio: myComercio };
      }
      return { transactions: [], comercio: null };
    } catch (e) {
      console.error('Error in fetchComercioStats:', e);
      return { transactions: [], comercio: null };
    }
  };

  const updateComercioBonos = async (bonos) => {
    if (!user?.comercio_id) return false;
    try {
      await supabaseService.updateComercio(user.comercio_id, { bonos });
      return true;
    } catch (e) {
      return false;
    }
  };

  const updateComercioHorarios = async (comercioId, { horario, vacaciones, aviso, telefono, email }) => {
    const targetId = Number(comercioId || user?.comercio_id || 2);
    try {
      await supabaseService.updateComercio(targetId, { horario, vacaciones, aviso, telefono, email });
      return true;
    } catch (e) {
      console.error('Error updating comercio info in Supabase:', e);
      return false;
    }
  };

  const registrarActividad = async (pasos, latidosGanados) => {
    if (!userId) return;
    const fecha = new Date().toISOString().slice(0, 10);
    try {
      const updatedAct = await supabaseService.upsertActivity(userId, fecha, pasos, latidosGanados);
      if (updatedAct) {
        setActivity(prev => {
          const exists = prev.some(a => a.id === updatedAct.id);
          if (exists) {
            return prev.map(a => a.id === updatedAct.id ? updatedAct : a);
          }
          return [updatedAct, ...prev];
        });
      }
    } catch (e) {
      console.error('Error registering activity in Supabase:', e);
    }
  };

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
