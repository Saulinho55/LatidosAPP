const express = require('express');
const cors    = require('cors');
const { initDB } = require('./database');

const app  = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── DB helpers (set after init) ───────────────────────────────────────────────
let db, persist;

const query = (sql, params = []) => {
  const results = db.exec(sql, params);
  if (!results.length) return null;
  const { columns, values } = results[0];
  return Object.fromEntries(columns.map((col, i) => [col, values[0][i]]));
};

const queryAll = (sql, params = []) => {
  const results = db.exec(sql, params);
  if (!results.length) return [];
  const { columns, values } = results[0];
  return values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
};

const run = (sql, params = []) => {
  db.run(sql, params);
  persist();
};

// ── Middleware to extract User ID ─────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Missing X-User-Id header' });
  req.userId = parseInt(userId, 10);
  next();
};

const requireAdmin = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = query('SELECT role FROM users WHERE id = ?', [parseInt(userId, 10)]);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin only.' });
  }
  req.userId = parseInt(userId, 10);
  next();
};

const requireComercio = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = query('SELECT role, comercio_id FROM users WHERE id = ?', [parseInt(userId, 10)]);
  if (!user || user.role !== 'comercio' || !user.comercio_id) {
    return res.status(403).json({ error: 'Forbidden. Comercio only.' });
  }
  req.userId = parseInt(userId, 10);
  req.comercioId = user.comercio_id;
  next();
};

// ── Auth Routes ───────────────────────────────────────────────────────────────

app.post('/api/register', (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan campos' });
    
    // Check if email exists
    const existing = query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'El email ya está registrado' });
    
    // Insert user (SQLite sql.js requires inserting and getting max id)
    run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [nombre, email, password]);
    const user = query('SELECT id FROM users WHERE email = ?', [email]);
    
    // Insert default preferences
    run('INSERT INTO preferences (user_id, theme, language, currency) VALUES (?, ?, ?, ?)', [user.id, 'light', 'es', 'EUR']);
    
    res.json({ id: user.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = query('SELECT id FROM users WHERE email = ? AND password = ?', [email, password]);
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
    
    // Auto-reset demo user on login
    if (email === 'usuario@latidos.app') {
      run(`UPDATE users SET 
           latidos = 99999, 
           steps_today = 0, 
           racha = 6, 
           weekly_steps = '[4200,6100,8500,9200,7800,11200,0]' 
           WHERE id = ?`, [user.id]);
    }
    
    res.json({ id: user.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/health
app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', db: 'SQLite (sql.js)' })
);

// GET /api/user
app.get('/api/user', requireAuth, (req, res) => {
  try {
    const user  = query('SELECT * FROM users       WHERE id = ?',       [req.userId]);
    const prefs = query('SELECT * FROM preferences WHERE user_id = ?', [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let parsedWeekly = [0,0,0,0,0,0,0];
    try { parsedWeekly = JSON.parse(user.weekly_steps || '[0,0,0,0,0,0,0]'); } catch(e) {}
    
    res.json({ ...user, ...prefs, weekly_steps: parsedWeekly });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/user/latidos  body: { latidos }
app.patch('/api/user/latidos', requireAuth, (req, res) => {
  try {
    const { latidos } = req.body;
    if (typeof latidos !== 'number') return res.status(400).json({ error: 'latidos must be number' });
    run('UPDATE users SET latidos = ? WHERE id = ?', [latidos, req.userId]);
    res.json({ latidos });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/user/goal  body: { daily_goal }
app.patch('/api/user/goal', requireAuth, (req, res) => {
  try {
    const { daily_goal } = req.body;
    if (typeof daily_goal !== 'number') return res.status(400).json({ error: 'daily_goal must be a number' });
    run('UPDATE users SET daily_goal = ? WHERE id = ?', [daily_goal, req.userId]);
    res.json({ daily_goal });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/user/steps  body: { steps_today }
app.patch('/api/user/steps', requireAuth, (req, res) => {
  try {
    const { steps_today } = req.body;
    if (typeof steps_today !== 'number') return res.status(400).json({ error: 'steps_today must be number' });
    
    const user = query('SELECT steps_today FROM users WHERE id = ?', [req.userId]);
    if (user && steps_today > user.steps_today) {
      run('UPDATE users SET steps_today = ? WHERE id = ?', [steps_today, req.userId]);
    }
    res.json({ steps_today });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/user/preferences  body: { theme, language, currency }
app.patch('/api/user/preferences', requireAuth, (req, res) => {
  try {
    const updates = [];
    const params = [];
    
    ['theme', 'language', 'currency'].forEach(key => {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    });

    if (updates.length) {
      params.push(req.userId);
      run(`UPDATE preferences SET ${updates.join(', ')} WHERE user_id = ?`, params);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/transactions
app.get('/api/transactions', requireAuth, (req, res) => {
  try {
    const txs = queryAll('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC', [req.userId]);
    res.json(txs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/transactions
app.post('/api/transactions', requireAuth, (req, res) => {
  try {
    const { comercioNombre, comercioEmoji, code, latidosUsados, descuento } = req.body;
    run(`INSERT INTO transactions (user_id, comercio_nombre, comercio_emoji, code, latidos_usados, descuento)
         VALUES (?, ?, ?, ?, ?, ?)`, 
         [req.userId, comercioNombre, comercioEmoji || '🏪', code, latidosUsados, descuento]);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/routes
app.get('/api/routes', requireAuth, (req, res) => {
  try {
    const userRoutes = queryAll('SELECT * FROM routes WHERE user_id = ? ORDER BY id DESC', [req.userId]);
    res.json(userRoutes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/routes
app.post('/api/routes', requireAuth, (req, res) => {
  try {
    const { name, distance, duration, latidos_earned, path, points } = req.body;
    run(`INSERT INTO routes (user_id, name, distance, duration, latidos_earned, path, points)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, 
         [req.userId, name, distance, duration, latidos_earned, JSON.stringify(path), JSON.stringify(points)]);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/routes/:id
app.patch('/api/routes/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, points } = req.body;
    
    // verify ownership
    const route = query('SELECT id FROM routes WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    
    run(`UPDATE routes SET name = ?, points = ? WHERE id = ?`, 
         [name, JSON.stringify(points), id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/routes/:id
app.delete('/api/routes/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    
    // verify ownership
    const route = query('SELECT id FROM routes WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    
    run('DELETE FROM routes WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin Routes ──────────────────────────────────────────────────────────────

// GET /api/admin/stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const totalUsersObj = query('SELECT COUNT(*) as count FROM users');
    const totalLatidosObj = query('SELECT SUM(latidos) as total FROM users');
    
    // Sum steps from the week
    const users = queryAll('SELECT weekly_steps, steps_today FROM users');
    let totalSteps = 0;
    for (const u of users) {
      try {
        const weekly = JSON.parse(u.weekly_steps || '[0,0,0,0,0,0,0]');
        totalSteps += weekly.reduce((a, b) => a + b, 0);
      } catch (e) {}
      totalSteps += (u.steps_today || 0);
    }
    
    const transStats = query('SELECT COUNT(*) as count, SUM(latidos_usados) as latidos_gastados, SUM(descuento) as descuentos_dados FROM transactions');
    
    res.json({
      totalUsers: totalUsersObj.count || 0,
      totalLatidos: totalLatidosObj.total || 0,
      totalSteps,
      totalTransactions: transStats.count || 0,
      totalLatidosGastados: transStats.latidos_gastados || 0,
      totalDescuentos: transStats.descuentos_dados || 0
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/users
app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const users = queryAll('SELECT id, email, name, role, latidos, steps_today, racha, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/comercios (publico)
app.get('/api/comercios', (req, res) => {
  try {
    const comercios = queryAll('SELECT * FROM comercios');
    // Parse bonos if needed
    const parsed = comercios.map(c => ({
      ...c,
      bonos: c.bonos ? JSON.parse(c.bonos) : [],
      latidosNecesarios: c.latidos_necesarios
    }));
    res.json(parsed);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/comercios (admin only)
app.post('/api/comercios', requireAdmin, (req, res) => {
  try {
    const { nombre, categoria, direccion, lat, lon, descuento, latidosNecesarios, color, emoji, bonos } = req.body;
    run(`INSERT INTO comercios (nombre, categoria, direccion, lat, lon, descuento, latidos_necesarios, color, emoji, bonos)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
         [nombre, categoria, direccion, parseFloat(lat), parseFloat(lon), parseFloat(descuento), parseInt(latidosNecesarios, 10), color || '#000000', emoji || '🏪', JSON.stringify(bonos || [])]);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/comercios/:id (admin only)
app.patch('/api/comercios/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, categoria, direccion, lat, lon, descuento, latidosNecesarios, color, emoji, bonos } = req.body;
    run(`UPDATE comercios SET nombre = ?, categoria = ?, direccion = ?, lat = ?, lon = ?, descuento = ?, latidos_necesarios = ?, color = ?, emoji = ?, bonos = ? WHERE id = ?`, 
         [nombre, categoria, direccion, parseFloat(lat), parseFloat(lon), parseFloat(descuento), parseInt(latidosNecesarios, 10), color, emoji, JSON.stringify(bonos || []), id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/comercios/:id (admin only)
app.delete('/api/comercios/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    run(`DELETE FROM comercios WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/users/:id (admin only)
app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, latidos, steps_today, racha } = req.body;
    run(`UPDATE users SET name = ?, email = ?, role = ?, latidos = ?, steps_today = ?, racha = ? WHERE id = ?`, 
         [name, email, role, parseInt(latidos, 10) || 0, parseInt(steps_today, 10) || 0, parseInt(racha, 10) || 0, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/users/:id (admin only)
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id, 10) === req.userId) {
      return res.status(400).json({ error: 'No puedes borrar tu propia cuenta.' });
    }
    // Delete cascading references
    run(`DELETE FROM preferences WHERE user_id = ?`, [id]);
    run(`DELETE FROM routes WHERE user_id = ?`, [id]);
    run(`DELETE FROM transactions WHERE user_id = ?`, [id]);
    run(`DELETE FROM users WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Comercio Routes ───────────────────────────────────────────────────────────

app.post('/api/comercio/validar', requireComercio, (req, res) => {
  try {
    const { codigo, importe } = req.body;
    if (!codigo || !importe) return res.status(400).json({ error: 'Faltan campos' });
    
    // In a real app we'd verify the code. For now, since the mockup doesn't strict check it:
    // Let's assume the user generated this code and it's linked to the user.
    // Wait, the transaction is ALREADY recorded in the user's phone when they generate the code!
    // So the code ALREADY exists in `transactions`. We just need to find it and update `importe_compra`.
    const tx = query('SELECT id FROM transactions WHERE code = ? AND (comercio_nombre = (SELECT nombre FROM comercios WHERE id = ?))', [codigo, req.comercioId]);
    if (!tx) {
      return res.status(400).json({ error: 'Código no encontrado o no pertenece a este comercio.' });
    }
    
    run('UPDATE transactions SET importe_compra = ? WHERE id = ?', [parseFloat(importe), tx.id]);
    res.json({ success: true, message: 'Bono validado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/comercio/stats', requireComercio, (req, res) => {
  try {
    const comercio = query('SELECT nombre FROM comercios WHERE id = ?', [req.comercioId]);
    if (!comercio) return res.status(404).json({ error: 'Comercio no encontrado' });
    
    const transactions = queryAll('SELECT * FROM transactions WHERE comercio_nombre = ?', [comercio.nombre]);
    
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/comercio/bonos', requireComercio, (req, res) => {
  try {
    const { bonos } = req.body;
    run('UPDATE comercios SET bonos = ? WHERE id = ?', [JSON.stringify(bonos), req.comercioId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(({ db: _db, persist: _persist }) => {
  db = _db;
  persist = _persist;

  // Background job to expire unredeemed bonos
  setInterval(() => {
    try {
      // Local time in sqlite is UTC by default using datetime('now')
      // Let's use SQLite's datetime manipulation to get 10 mins ago UTC
      // Wait, since we are doing logic in JS, let's just query SQLite for expired ones directly:
      const expiredTxs = queryAll(`SELECT * FROM transactions WHERE importe_compra IS NULL AND datetime(fecha) < datetime('now', '-10 minutes')`);
      
      if (expiredTxs && expiredTxs.length > 0) {
        expiredTxs.forEach(tx => {
          // Refund user
          run('UPDATE users SET latidos = latidos + ? WHERE id = ?', [tx.latidos_usados, tx.user_id]);
          // Delete transaction
          run('DELETE FROM transactions WHERE id = ?', [tx.id]);
        });
        console.log(`♻️ Refunded and deleted ${expiredTxs.length} expired transaction(s)`);
      }
    } catch (e) {
      console.error('Error expiring transactions:', e.message);
    }
  }, 60 * 1000); // Check every minute

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Latidos API → http://localhost:${PORT}/api`);
    console.log(`🗄️  SQLite database → latidos.db`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});
