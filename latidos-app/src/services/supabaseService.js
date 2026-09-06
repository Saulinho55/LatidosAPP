import { supabase } from '../lib/supabase';

/**
 * Service to handle direct Supabase CRUD operations.
 * Returns null / throws error when offline or request fails so the app can fallback to local SQLite/IDB.
 */

export const supabaseService = {
  // ── Auth & Users ──
  async login(email, password) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('password', password)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async registerUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;
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
    // Delete cascade records in Supabase
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
    const { data, error } = await supabase
      .from('preferences')
      .upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
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
    const payload = {
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

  async addTransaction(tx) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([tx])
      .select()
      .single();

    if (error) throw error;
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
    const payload = {
      user_id: routeData.user_id,
      name: routeData.name,
      distance: routeData.distance,
      duration: routeData.duration,
      latidos_earned: routeData.latidos_earned,
      path: typeof routeData.path === 'string' ? routeData.path : JSON.stringify(routeData.path || []),
      points: typeof routeData.points === 'string' ? routeData.points : JSON.stringify(routeData.points || [])
    };

    const { data, error } = await supabase.from('routes').insert([payload]).select().single();
    if (error) throw error;
    return data;
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
      const { data, error } = await supabase
        .from('activity')
        .insert([{ user_id: userId, fecha, pasos, latidos_ganados: latidosGanados || 0 }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }
};
