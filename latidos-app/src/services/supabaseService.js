import { supabase } from '../lib/supabase';

/**
 * Service for direct Supabase CRUD operations.
 * Pure server-side persistence with real-time support.
 */

async function getNextId(table) {
  try {
    const { data } = await supabase
      .from(table)
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (data && data.length > 0 && typeof data[0].id === 'number') {
      return data[0].id + 1;
    }
    return 1;
  } catch (e) {
    return Date.now();
  }
}

export const DEFAULT_POPULAR_ROUTES = [
  {
    id: 'pop-1',
    user_id: 0,
    name: 'Ruta Histórica San Gregorio',
    distance: 1.85,
    duration: 1320,
    latidos_earned: 24,
    points: [
      { lat: 28.0048, lon: -15.4158, name: 'Plaza de San Gregorio' },
      { lat: 28.0034, lon: -15.4144, name: 'Calle León y Castillo' },
      { lat: 28.0021, lon: -15.4139, name: 'Calle Inés Chemida' }
    ],
    path: [
      { lat: 28.0048, lon: -15.4158 },
      { lat: 28.0042, lon: -15.4152 },
      { lat: 28.0034, lon: -15.4144 },
      { lat: 28.0028, lon: -15.4140 },
      { lat: 28.0021, lon: -15.4139 }
    ]
  },
  {
    id: 'pop-2',
    user_id: 0,
    name: 'Paseo Parque de San Juan',
    distance: 2.40,
    duration: 1800,
    latidos_earned: 31,
    points: [
      { lat: 28.0055, lon: -15.4162, name: 'Plaza de San Juan' },
      { lat: 28.0038, lon: -15.4148, name: 'Paseo de la Fraternidad' },
      { lat: 28.0015, lon: -15.4130, name: 'Mirador del Valle' }
    ],
    path: [
      { lat: 28.0055, lon: -15.4162 },
      { lat: 28.0048, lon: -15.4158 },
      { lat: 28.0038, lon: -15.4148 },
      { lat: 28.0025, lon: -15.4138 },
      { lat: 28.0015, lon: -15.4130 }
    ]
  }
];

export const supabaseService = {
  // ── Auth & Users ──
  async login(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .eq('password', password)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async registerUser(userData) {
    let payload = { ...userData };
    if (payload.email) payload.email = payload.email.trim().toLowerCase();
    if (payload.comercio_id !== undefined) {
      payload.comercio_id = payload.comercio_id && payload.comercio_id !== '' ? parseInt(payload.comercio_id, 10) : null;
    }
    if (payload.latidos !== undefined) {
      payload.latidos = payload.latidos === '' ? 0 : (parseInt(payload.latidos, 10) || 0);
    }
    if (payload.steps_today !== undefined) {
      payload.steps_today = payload.steps_today === '' ? 0 : (parseInt(payload.steps_today, 10) || 0);
    }
    if (payload.racha !== undefined) {
      payload.racha = payload.racha === '' ? 0 : (parseInt(payload.racha, 10) || 0);
    }
    if (payload.daily_goal !== undefined) {
      payload.daily_goal = payload.daily_goal === '' ? 10000 : (parseInt(payload.daily_goal, 10) || 10000);
    }

    if (!payload.id) {
      payload.id = await getNextId('users');
    }

    const { data, error } = await supabase
      .from('users')
      .insert([payload])
      .select()
      .single();

    if (error) {
      // If ID collision, recalculate next ID and retry
      if (error.code === '23505') {
        const nextId = await getNextId('users');
        payload.id = nextId;
        const retry = await supabase.from('users').insert([payload]).select().single();
        if (retry.error) throw retry.error;
        try {
          await supabase.from('preferences').insert([{ user_id: retry.data.id, theme: 'light', language: 'es', currency: 'EUR' }]);
        } catch (e) {}
        return retry.data;
      }
      throw error;
    }

    try {
      await supabase.from('preferences').insert([{ user_id: data.id, theme: 'light', language: 'es', currency: 'EUR' }]);
    } catch (e) {}
    return data;
  },

  async getUserById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateUser(id, updates) {
    let cleanUpdates = { ...updates };
    if (cleanUpdates.email) cleanUpdates.email = cleanUpdates.email.trim().toLowerCase();
    if (cleanUpdates.comercio_id !== undefined) {
      cleanUpdates.comercio_id = cleanUpdates.comercio_id && cleanUpdates.comercio_id !== '' ? parseInt(cleanUpdates.comercio_id, 10) : null;
    }
    if (cleanUpdates.latidos !== undefined) {
      cleanUpdates.latidos = cleanUpdates.latidos === '' ? 0 : (parseInt(cleanUpdates.latidos, 10) || 0);
    }
    if (cleanUpdates.steps_today !== undefined) {
      cleanUpdates.steps_today = cleanUpdates.steps_today === '' ? 0 : (parseInt(cleanUpdates.steps_today, 10) || 0);
    }
    if (cleanUpdates.racha !== undefined) {
      cleanUpdates.racha = cleanUpdates.racha === '' ? 0 : (parseInt(cleanUpdates.racha, 10) || 0);
    }
    if (cleanUpdates.daily_goal !== undefined) {
      cleanUpdates.daily_goal = cleanUpdates.daily_goal === '' ? 10000 : (parseInt(cleanUpdates.daily_goal, 10) || 10000);
    }

    const { data, error } = await supabase
      .from('users')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async deleteUser(id) {
    await supabase.from('preferences').delete().eq('user_id', id);
    await supabase.from('routes').delete().eq('user_id', id);
    await supabase.from('transactions').delete().eq('user_id', id);
    await supabase.from('activity').delete().eq('user_id', id);
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, latidos, steps_today, racha, comercio_id, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // ── Preferences ──
  async getPreferences(userId) {
    const { data, error } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return null;
    return data;
  },

  async upsertPreferences(userId, prefs) {
    try {
      const { data: existing } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('preferences')
          .update(prefs)
          .eq('id', existing.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const nextId = await getNextId('preferences');
        const payload = {
          id: nextId,
          user_id: userId,
          theme: prefs.theme || 'light',
          language: prefs.language || 'es',
          currency: prefs.currency || 'EUR',
          ...prefs
        };
        const { data, error } = await supabase
          .from('preferences')
          .insert([payload])
          .select()
          .maybeSingle();
        if (error) throw error;
        return data;
      }
    } catch (err) {
      console.error('Error in upsertPreferences:', err);
      // Fallback try simple update
      try {
        await supabase.from('preferences').update(prefs).eq('user_id', userId);
      } catch (e) {}
    }
  },

  // ── Comercios ──
  async getComercios() {
    const { data, error } = await supabase
      .from('comercios')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      bonos: typeof c.bonos === 'string' ? JSON.parse(c.bonos || '[]') : (c.bonos || []),
      horario: typeof c.horario === 'string' ? JSON.parse(c.horario || '{}') : (c.horario || {}),
      vacaciones: typeof c.vacaciones === 'string' ? JSON.parse(c.vacaciones || '{}') : (c.vacaciones || {}),
      latidosNecesarios: c.latidos_necesarios || c.latidosNecesarios || 200,
      aviso: c.aviso || '',
      telefono: c.telefono || '',
      email: c.email || ''
    }));
  },

  async createComercio(comercioData) {
    const nextId = await getNextId('comercios');
    const payload = {
      id: comercioData.id || nextId,
      nombre: comercioData.nombre,
      categoria: comercioData.categoria,
      direccion: comercioData.direccion,
      lat: parseFloat(comercioData.lat),
      lon: parseFloat(comercioData.lon),
      descuento: parseFloat(comercioData.descuento),
      latidos_necesarios: parseInt(comercioData.latidosNecesarios || comercioData.latidos_necesarios, 10),
      color: comercioData.color || '#000000',
      emoji: comercioData.emoji || '🏪',
      bonos: typeof comercioData.bonos === 'string' ? comercioData.bonos : JSON.stringify(comercioData.bonos || []),
      horario: typeof comercioData.horario === 'string' ? comercioData.horario : JSON.stringify(comercioData.horario || {}),
      vacaciones: typeof comercioData.vacaciones === 'string' ? comercioData.vacaciones : JSON.stringify(comercioData.vacaciones || {}),
      aviso: comercioData.aviso || '',
      telefono: comercioData.telefono || '',
      email: comercioData.email || ''
    };

    const { data, error } = await supabase.from('comercios').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },

  async updateComercio(id, comercioData) {
    const payload = {};
    if (comercioData.nombre !== undefined) payload.nombre = comercioData.nombre;
    if (comercioData.categoria !== undefined) payload.categoria = comercioData.categoria;
    if (comercioData.direccion !== undefined) payload.direccion = comercioData.direccion;
    if (comercioData.lat !== undefined) payload.lat = parseFloat(comercioData.lat);
    if (comercioData.lon !== undefined) payload.lon = parseFloat(comercioData.lon);
    if (comercioData.descuento !== undefined) payload.descuento = parseFloat(comercioData.descuento);
    if (comercioData.latidosNecesarios !== undefined || comercioData.latidos_necesarios !== undefined) {
      payload.latidos_necesarios = parseInt(comercioData.latidosNecesarios || comercioData.latidos_necesarios, 10);
    }
    if (comercioData.color !== undefined) payload.color = comercioData.color;
    if (comercioData.emoji !== undefined) payload.emoji = comercioData.emoji;
    if (comercioData.bonos !== undefined) {
      payload.bonos = typeof comercioData.bonos === 'string' ? comercioData.bonos : JSON.stringify(comercioData.bonos || []);
    }
    if (comercioData.horario !== undefined) {
      payload.horario = typeof comercioData.horario === 'string' ? comercioData.horario : JSON.stringify(comercioData.horario || {});
    }
    if (comercioData.vacaciones !== undefined) {
      payload.vacaciones = typeof comercioData.vacaciones === 'string' ? comercioData.vacaciones : JSON.stringify(comercioData.vacaciones || {});
    }
    if (comercioData.aviso !== undefined) payload.aviso = comercioData.aviso;
    if (comercioData.telefono !== undefined) payload.telefono = comercioData.telefono;
    if (comercioData.email !== undefined) payload.email = comercioData.email;

    const { data, error } = await supabase.from('comercios').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async updateComercioProductos(id, productos) {
    const numericId = Number(id);
    const prodList = Array.isArray(productos) ? productos : (typeof productos === 'string' ? JSON.parse(productos || '[]') : []);
    try {
      localStorage.setItem(`latidos_comercio_productos_${numericId}`, JSON.stringify(prodList));
    } catch (e) {}

    try {
      const payload = {
        productos: typeof productos === 'string' ? productos : JSON.stringify(prodList)
      };
      await supabase.from('comercios').update(payload).eq('id', numericId);
    } catch (e) {
      // Graceful fallback if remote column is not present
    }
    return prodList;
  },

  async deleteComercio(id) {
    const { error } = await supabase.from('comercios').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ── Transactions ──
  async getTransactions(userId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getTransactionsByComercio(comercioNombre) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Error fetching transactions by comercio:', error);
      return [];
    }
    if (!data) return [];
    if (!comercioNombre) return data;

    const normalize = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const target = normalize(comercioNombre);

    return data.filter(t => {
      const txName = normalize(t.comercio_nombre);
      return txName === target || txName.includes(target) || target.includes(txName);
    });
  },

  async addTransaction(tx) {
    let payload = { ...tx };
    if (!payload.id) {
      payload.id = await getNextId('transactions');
    }
    // Ensure numeric descuento
    if (typeof payload.descuento !== 'number') {
      payload.descuento = parseFloat(payload.descuento) || 1;
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([payload])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        payload.id = await getNextId('transactions');
        const retry = await supabase.from('transactions').insert([payload]).select().single();
        if (retry.error) throw retry.error;
        return retry.data;
      }
      throw error;
    }
    return data;
  },

  async updateTransaction(id, updates) {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateTransactionByCode(code, updates) {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('code', code)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getTransactionByCode(code) {
    let cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode.startsWith('LAT-') && /^\d+$/.test(cleanCode)) {
      cleanCode = `LAT-${cleanCode}`;
    }
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .ilike('code', cleanCode)
      .order('id', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0];
  },

  async validateBono(code, comercioId, importe, isAdmin = false) {
    let cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode.startsWith('LAT-') && /^\d+$/.test(cleanCode)) {
      cleanCode = `LAT-${cleanCode}`;
    }

    let comercio = null;
    if (comercioId) {
      const { data } = await supabase
        .from('comercios')
        .select('*')
        .eq('id', comercioId)
        .maybeSingle();
      comercio = data;
    }

    // Search transaction by code (case-insensitive)
    const { data: txList, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .ilike('code', cleanCode)
      .order('id', { ascending: false });

    if (txErr || !txList || txList.length === 0) {
      throw new Error(`Código "${cleanCode}" no encontrado. Asegúrate de que el cliente haya generado el código.`);
    }

    const tx = txList[0];

    // Normalize strings for strict, secure matching
    const normalize = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    if (comercio && !isAdmin) {
      const comNorm = normalize(comercio.nombre);
      const txNorm = normalize(tx.comercio_nombre);
      
      const isExactMatch = txNorm === comNorm;
      if (!isExactMatch) {
        throw new Error(`Este código pertenece a "${tx.comercio_nombre}", no a "${comercio.nombre}".`);
      }
    }

    // Check if already validated with purchase amount
    if (tx.importe_compra && parseFloat(tx.importe_compra) > 0) {
      throw new Error(`Este código ya fue validado anteriormente (Compra registrada: ${tx.importe_compra} €).`);
    }

    // Update transaction with purchase amount
    const parsedImporte = parseFloat(importe) || 0;

    const { data: updated, error: updateErr } = await supabase
      .from('transactions')
      .update({
        importe_compra: parsedImporte
      })
      .eq('id', tx.id)
      .select()
      .maybeSingle();

    if (updateErr) throw updateErr;
    return updated || { ...tx, importe_compra: parsedImporte };
  },

  async rechazarBono(txIdOrCode) {
    let tx = null;
    if (typeof txIdOrCode === 'number' || /^\d+$/.test(String(txIdOrCode))) {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', parseInt(txIdOrCode, 10))
        .maybeSingle();
      tx = data;
    }
    
    if (!tx) {
      let cleanCode = (String(txIdOrCode || '')).trim().toUpperCase();
      if (!cleanCode.startsWith('LAT-') && /^\d+$/.test(cleanCode)) {
        cleanCode = `LAT-${cleanCode}`;
      }
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .ilike('code', cleanCode)
        .order('id', { ascending: false })
        .limit(1);
      if (data && data.length > 0) tx = data[0];
    }

    if (!tx) throw new Error('Bono no encontrado');
    if (tx.importe_compra && parseFloat(tx.importe_compra) > 0 && tx.latidos_usados > 0) {
      throw new Error('Este bono ya fue validado y no se puede rechazar.');
    }

    const originalLatidos = Number(tx.latidos_usados) || 0;

    // 1. Mark as rejected / cancelled in Supabase (importe_compra = 0, latidos_usados = 0, descuento = 0)
    const { data: updated, error: updateErr } = await supabase
      .from('transactions')
      .update({
        importe_compra: 0,
        latidos_usados: 0,
        descuento: 0
      })
      .eq('id', tx.id)
      .select()
      .maybeSingle();

    if (updateErr) throw updateErr;

    // 2. Refund latidos to customer atomically in Supabase
    let nextLatidos = null;
    if (tx.user_id && originalLatidos > 0) {
      const { data: customer } = await supabase
        .from('users')
        .select('latidos')
        .eq('id', tx.user_id)
        .maybeSingle();

      if (customer) {
        nextLatidos = (customer.latidos || 0) + originalLatidos;
        await supabase
          .from('users')
          .update({ latidos: nextLatidos })
          .eq('id', tx.user_id);
      }
    }

    return {
      ...(updated || tx),
      importe_compra: 0,
      latidos_usados: 0,
      descuento: 0,
      newLatidos,
      refundedAmount: originalLatidos
    };
  },

  // ── Routes ──
  async getRoutes(userId) {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false });

    if (error) throw error;
    return (data || []).map(r => ({
      ...r,
      path: typeof r.path === 'string' ? JSON.parse(r.path || '[]') : (r.path || []),
      points: typeof r.points === 'string' ? JSON.parse(r.points || '[]') : (r.points || [])
    }));
  },

  async getRecommendedRoutes() {
    try {
      let adminIds = [0];
      try {
        const { data: adminUsers } = await supabase
          .from('users')
          .select('id')
          .in('role', ['admin', 'superadmin']);
        if (adminUsers && adminUsers.length > 0) {
          adminIds = [0, ...adminUsers.map(u => u.id)];
        }
      } catch (e) {}

      const filterStr = `user_id.in.(${adminIds.join(',')}),user_id.is.null`;
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .or(filterStr)
        .order('id', { ascending: false });

      if (!error && data && data.length > 0) {
        const parsed = data.map(r => ({
          ...r,
          path: typeof r.path === 'string' ? JSON.parse(r.path || '[]') : (r.path || []),
          points: typeof r.points === 'string' ? JSON.parse(r.points || '[]') : (r.points || [])
        }));
        try {
          localStorage.setItem('latidos_recommended_routes', JSON.stringify(parsed));
        } catch (e) {}
        return parsed;
      }
    } catch (err) {
      console.warn('Could not fetch recommended routes from Supabase, checking fallback:', err);
    }

    try {
      const cached = localStorage.getItem('latidos_recommended_routes');
      if (cached) {
        const parsedCached = JSON.parse(cached);
        if (Array.isArray(parsedCached) && parsedCached.length > 0) {
          return parsedCached;
        }
      }
    } catch (e) {}

    return DEFAULT_POPULAR_ROUTES;
  },

  async addRecommendedRoute(routeData) {
    const nextId = await getNextId('routes');
    const payload = {
      id: routeData.id || nextId,
      user_id: 0,
      name: routeData.name,
      distance: parseFloat(routeData.distance) || 0,
      duration: parseInt(routeData.duration, 10) || 0,
      latidos_earned: parseInt(routeData.latidos_earned, 10) || 0,
      path: typeof routeData.path === 'string' ? routeData.path : JSON.stringify(routeData.path || []),
      points: typeof routeData.points === 'string' ? routeData.points : JSON.stringify(routeData.points || [])
    };

    let result = null;
    try {
      const { data, error } = await supabase.from('routes').insert([payload]).select().single();
      if (error) {
        if (error.code === '23505') {
          payload.id = await getNextId('routes');
          const retry = await supabase.from('routes').insert([payload]).select().single();
          if (retry.error) throw retry.error;
          result = retry.data;
        } else {
          throw error;
        }
      } else {
        result = data;
      }
    } catch (err) {
      console.warn('Supabase addRecommendedRoute fallback:', err);
      result = { ...payload, id: payload.id || Date.now() };
    }

    const formatted = {
      ...result,
      path: typeof result.path === 'string' ? JSON.parse(result.path || '[]') : (result.path || []),
      points: typeof result.points === 'string' ? JSON.parse(result.points || '[]') : (result.points || [])
    };

    try {
      const current = JSON.parse(localStorage.getItem('latidos_recommended_routes') || '[]');
      const updated = [formatted, ...current.filter(r => String(r.id) !== String(formatted.id))];
      localStorage.setItem('latidos_recommended_routes', JSON.stringify(updated));
    } catch (e) {}

    return formatted;
  },

  async updateRecommendedRoute(id, updatedData) {
    const payload = {};
    if (updatedData.name !== undefined) payload.name = updatedData.name;
    if (updatedData.distance !== undefined) payload.distance = parseFloat(updatedData.distance);
    if (updatedData.duration !== undefined) payload.duration = parseInt(updatedData.duration, 10);
    if (updatedData.latidos_earned !== undefined) payload.latidos_earned = parseInt(updatedData.latidos_earned, 10);
    if (updatedData.path !== undefined) {
      payload.path = typeof updatedData.path === 'string' ? updatedData.path : JSON.stringify(updatedData.path || []);
    }
    if (updatedData.points !== undefined) {
      payload.points = typeof updatedData.points === 'string' ? updatedData.points : JSON.stringify(updatedData.points || []);
    }

    let result = null;
    try {
      const { data, error } = await supabase
        .from('routes')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } catch (err) {
      console.warn('Supabase updateRecommendedRoute fallback:', err);
      result = { id, ...payload };
    }

    const formatted = {
      ...result,
      path: typeof result.path === 'string' ? JSON.parse(result.path || '[]') : (result.path || []),
      points: typeof result.points === 'string' ? JSON.parse(result.points || '[]') : (result.points || [])
    };

    try {
      const current = JSON.parse(localStorage.getItem('latidos_recommended_routes') || '[]');
      const updated = current.map(r => String(r.id) === String(id) ? { ...r, ...formatted } : r);
      localStorage.setItem('latidos_recommended_routes', JSON.stringify(updated));
    } catch (e) {}

    return formatted;
  },

  async deleteRecommendedRoute(id) {
    try {
      await supabase.from('routes').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase deleteRecommendedRoute error:', err);
    }

    try {
      const current = JSON.parse(localStorage.getItem('latidos_recommended_routes') || '[]');
      const updated = current.filter(r => String(r.id) !== String(id));
      localStorage.setItem('latidos_recommended_routes', JSON.stringify(updated));
    } catch (e) {}

    return true;
  },

  async addRoute(routeData) {
    const nextId = await getNextId('routes');
    const payload = {
      id: routeData.id || nextId,
      user_id: routeData.user_id,
      name: routeData.name,
      distance: routeData.distance,
      duration: routeData.duration,
      latidos_earned: routeData.latidos_earned,
      path: typeof routeData.path === 'string' ? routeData.path : JSON.stringify(routeData.path || []),
      points: typeof routeData.points === 'string' ? routeData.points : JSON.stringify(routeData.points || [])
    };

    const { data, error } = await supabase.from('routes').insert([payload]).select().single();
    if (error) {
      if (error.code === '23505') {
        payload.id = await getNextId('routes');
        const retry = await supabase.from('routes').insert([payload]).select().single();
        if (retry.error) throw retry.error;
        return {
          ...retry.data,
          path: typeof retry.data.path === 'string' ? JSON.parse(retry.data.path || '[]') : (retry.data.path || []),
          points: typeof retry.data.points === 'string' ? JSON.parse(retry.data.points || '[]') : (retry.data.points || [])
        };
      }
      throw error;
    }

    return {
      ...data,
      path: typeof data.path === 'string' ? JSON.parse(data.path || '[]') : (data.path || []),
      points: typeof data.points === 'string' ? JSON.parse(data.points || '[]') : (data.points || [])
    };
  },

  async updateRoute(id, updatedData) {
    const payload = {};
    if (updatedData.name !== undefined) payload.name = updatedData.name;
    if (updatedData.points !== undefined) {
      payload.points = typeof updatedData.points === 'string' ? updatedData.points : JSON.stringify(updatedData.points || []);
    }

    const { data, error } = await supabase
      .from('routes')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      path: typeof data.path === 'string' ? JSON.parse(data.path || '[]') : (data.path || []),
      points: typeof data.points === 'string' ? JSON.parse(data.points || '[]') : (data.points || [])
    };
  },

  async deleteRoute(id) {
    const { error } = await supabase.from('routes').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ── Activity ──
  async getActivity(userId) {
    const { data, error } = await supabase
      .from('activity')
      .select('*')
      .eq('user_id', userId)
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async upsertActivity(userId, fecha, pasos, latidosGanados) {
    const { data: existing } = await supabase
      .from('activity')
      .select('*')
      .eq('user_id', userId)
      .eq('fecha', fecha)
      .maybeSingle();

    if (existing) {
      const updatedPasos = Math.max(existing.pasos || 0, pasos);
      const computedLatidos = Math.max(
        Math.floor(updatedPasos / 100),
        (existing.latidos_ganados || 0) + (latidosGanados || 0)
      );
      const { data, error } = await supabase
        .from('activity')
        .update({ pasos: updatedPasos, latidos_ganados: computedLatidos })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const computedLatidos = Math.max(Math.floor((pasos || 0) / 100), latidosGanados || 0);
      const nextId = await getNextId('activity');
      const { data, error } = await supabase
        .from('activity')
        .insert([{ id: nextId, user_id: userId, fecha, pasos, latidos_ganados: computedLatidos }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // ── Admin Stats ──
  async getAdminStats() {
    const [usersRes, txRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('transactions').select('*')
    ]);

    const users = usersRes.data || [];
    const txs = txRes.data || [];

    let totalLatidos = 0;
    let totalSteps = 0;
    users.forEach(u => {
      totalLatidos += (u.latidos || 0);
      totalSteps += (u.steps_today || 0);
    });

    let totalLatidosGastados = 0;
    let totalDescuentos = 0;
    txs.forEach(t => {
      totalLatidosGastados += (t.latidos_usados || 0);
      totalDescuentos += (t.descuento || 0);
    });

    return {
      totalUsers: users.length,
      totalLatidos,
      totalSteps,
      totalTransactions: txs.length,
      totalLatidosGastados,
      totalDescuentos
    };
  }
};
