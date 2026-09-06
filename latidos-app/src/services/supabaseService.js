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
    payload.email = payload.email.trim().toLowerCase();
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
    const { data, error } = await supabase
      .from('users')
      .update(updates)
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
      .eq('comercio_nombre', comercioNombre)
      .order('id', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addTransaction(tx) {
    let payload = { ...tx };
    if (!payload.id) {
      payload.id = await getNextId('transactions');
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

  async validateBono(code, comercioId, importe) {
    // Get comercio name
    const { data: comercio } = await supabase
      .from('comercios')
      .select('nombre')
      .eq('id', comercioId)
      .maybeSingle();

    if (!comercio) throw new Error('Comercio no encontrado');

    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('code', code)
      .eq('comercio_nombre', comercio.nombre)
      .maybeSingle();

    if (txErr || !tx) throw new Error('Código no válido para este comercio');

    const { data: updated, error: updateErr } = await supabase
      .from('transactions')
      .update({ importe_compra: parseFloat(importe) })
      .eq('id', tx.id)
      .select()
      .single();

    if (updateErr) throw updateErr;
    return updated;
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
      const updatedLatidos = (existing.latidos_ganados || 0) + (latidosGanados || 0);
      const { data, error } = await supabase
        .from('activity')
        .update({ pasos: updatedPasos, latidos_ganados: updatedLatidos })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const nextId = await getNextId('activity');
      const { data, error } = await supabase
        .from('activity')
        .insert([{ id: nextId, user_id: userId, fecha, pasos, latidos_ganados: latidosGanados || 0 }])
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
