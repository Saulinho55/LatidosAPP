/**
 * Web database adapter using IndexedDB.
 * Provides the same API as the native SQLite adapter so the rest
 * of the app doesn't need to know which platform it's on.
 */

const DB_NAME = 'latidos_idb';
const DB_VERSION = 2;

// All the tables we need
const STORES = ['users', 'comercios', 'preferences', 'transactions', 'routes', 'activity'];

let idb = null;

// ─── Low-level helpers ──────────────────────────────────────────────────────

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id', autoIncrement: true });
        }
      });
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAll(store) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function put(store, record) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function remove(store, id) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(store, 'readwrite');
    const numericId = typeof id === 'string' && !isNaN(id) ? Number(id) : id;
    const req = tx.objectStore(store).delete(numericId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Simple SQL-like query engine ───────────────────────────────────────────

async function execSQL(sql, params = []) {
  const s = sql.trim().replace(/\s+/g, ' ');
  const upper = s.toUpperCase();

  // CREATE TABLE — ignore
  if (upper.startsWith('CREATE TABLE')) {
    return { changes: { changes: 0 }, values: [] };
  }

  // SELECT
  if (upper.startsWith('SELECT')) {
    return handleSelect(s, params);
  }

  // INSERT INTO
  if (upper.startsWith('INSERT INTO')) {
    return handleInsert(s, params);
  }

  // UPDATE
  if (upper.startsWith('UPDATE')) {
    return handleUpdate(s, params);
  }

  // DELETE FROM
  if (upper.startsWith('DELETE FROM')) {
    return handleDelete(s, params);
  }

  return { changes: { changes: 0 }, values: [] };
}

// ── helpers ──

function getTableName(sql) {
  const m = sql.match(/(?:FROM|INTO|UPDATE|TABLE)\s+(\w+)/i);
  return m ? m[1].toLowerCase() : null;
}

function interpolate(sql, params) {
  let i = 0;
  return sql.replace(/\?/g, () => {
    const v = params[i++];
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
    return v;
  });
}

function parseWhere(whereClause, record) {
  if (!whereClause || !whereClause.trim()) return true;
  const conditions = whereClause.split(/\bAND\b/i);
  return conditions.every((cond) => {
    const strEq = cond.match(/(\w+)\s*=\s*'([^']*)'/);
    if (strEq) {
      const [, col, val] = strEq;
      return String(record[col]) === val;
    }
    const numEq = cond.match(/(\w+)\s*=\s*(-?\d+(\.\d+)?)/);
    if (numEq) {
      const [, col, val] = numEq;
      return Number(record[col]) === Number(val);
    }
    return true;
  });
}

async function handleSelect(sql, params) {
  const tableName = getTableName(sql);
  if (!tableName || !STORES.includes(tableName)) return { values: [] };

  const rows = await getAll(tableName);

  // Parse where
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
  let filtered = rows;
  if (whereMatch) {
    let whereClause = whereMatch[1];
    let pIdx = 0;
    whereClause = whereClause.replace(/\?/g, () => {
      const v = params[pIdx++];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'string') return `'${v}'`;
      return v;
    });
    filtered = rows.filter((r) => parseWhere(whereClause, r));
  }

  // Handle ORDER BY id DESC or fecha DESC
  if (/ORDER\s+BY\s+(\w+)\s+DESC/i.test(sql)) {
    const col = sql.match(/ORDER\s+BY\s+(\w+)\s+DESC/i)[1];
    filtered.sort((a, b) => (b[col] > a[col] ? 1 : -1));
  }

  // SELECT count(*)
  const countMatch = sql.match(/SELECT\s+count\(\*\)\s+as\s+(\w+)/i);
  if (countMatch) {
    return { values: [{ [countMatch[1]]: filtered.length }] };
  }

  // SELECT SUM(...)
  if (/SELECT\s+SUM\(/i.test(sql)) {
    return { values: [{ total: filtered.reduce((acc, r) => acc + (r.latidos || 0), 0) }] };
  }

  return { values: filtered };
}

async function handleInsert(sql, params = []) {
  const tableName = getTableName(sql);
  if (!tableName || !STORES.includes(tableName)) return { changes: { changes: 0 } };

  const colMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
  if (!colMatch) return { changes: { changes: 0 } };

  const cols = colMatch[1].split(',').map((c) => c.trim().replace(/[`"]/g, ''));
  const record = {};

  if (params && params.length === cols.length) {
    // Exact bound parameters!
    cols.forEach((c, i) => {
      record[c] = params[i];
    });
  } else {
    // Fallback if raw values were inlined in the SQL string
    const interpolated = interpolate(sql, params);
    const valMatch = interpolated.match(/VALUES\s*\((.+)\)/is);
    if (!valMatch) return { changes: { changes: 0 } };
    
    const rawVals = valMatch[1];
    const vals = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < rawVals.length; i++) {
      const ch = rawVals[i];
      if ((ch === "'" || ch === '"') && (i === 0 || rawVals[i-1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = ch;
        } else if (quoteChar === ch) {
          inQuotes = false;
        }
      }
      if (ch === ',' && !inQuotes) {
        vals.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    vals.push(current.trim());

    cols.forEach((c, i) => {
      let v = vals[i] || '';
      if (v === 'NULL') v = null;
      else if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1).replace(/''/g, "'");
      else if (!isNaN(v) && v !== '') v = Number(v);
      record[c] = v;
    });
  }

  // Automatic default timestamps
  if (tableName === 'transactions' && (!record.fecha || record.fecha === 'NULL')) {
    record.fecha = new Date().toISOString();
  }
  if (tableName === 'routes' && (!record.created_at || record.created_at === 'NULL')) {
    record.created_at = new Date().toISOString();
  }
  if (tableName === 'users' && (!record.created_at || record.created_at === 'NULL')) {
    record.created_at = new Date().toISOString();
  }

  const newId = await put(tableName, record);
  return { changes: { changes: 1, lastId: newId } };
}

async function handleUpdate(sql, params = []) {
  const tableName = getTableName(sql);
  if (!tableName || !STORES.includes(tableName)) return { changes: { changes: 0 } };

  const rows = await getAll(tableName);
  const whereMatch = sql.match(/WHERE\s+(.+)$/i);
  let whereClause = whereMatch ? whereMatch[1] : '';

  const setMatch = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i);
  if (!setMatch) return { changes: { changes: 0 } };

  const setStr = setMatch[1];
  const setCols = setStr.split(',').map(s => {
    const m = s.match(/(\w+)\s*=\s*\?/);
    return m ? m[1] : null;
  });

  let changed = 0;
  if (setCols.every(c => c !== null)) {
    const setValues = params.slice(0, setCols.length);
    const whereParams = params.slice(setCols.length);

    let pIdx = 0;
    whereClause = whereClause.replace(/\?/g, () => {
      const v = whereParams[pIdx++];
      if (typeof v === 'string') return `'${v}'`;
      return v;
    });

    const filtered = whereClause ? rows.filter(r => parseWhere(whereClause, r)) : rows;
    for (const row of filtered) {
      setCols.forEach((col, idx) => {
        row[col] = setValues[idx];
      });
      await put(tableName, row);
      changed++;
    }
    return { changes: { changes: changed } };
  }

  // Fallback
  const interpolated = interpolate(sql, params);
  const interWhere = interpolated.match(/WHERE\s+(.+?)$/i);
  const filtered = interWhere ? rows.filter(r => parseWhere(interWhere[1], r)) : rows;
  const interSet = interpolated.match(/SET\s+(.+?)(?:\s+WHERE|$)/i);
  if (interSet) {
    const assignments = interSet[1].split(',').map((a) => a.trim());
    for (const row of filtered) {
      assignments.forEach((assign) => {
        const strEq = assign.match(/(\w+)\s*=\s*'([^']*)'/);
        if (strEq) { row[strEq[1]] = strEq[2]; return; }
        const numEq = assign.match(/(\w+)\s*=\s*(-?\d+(\.\d+)?)/);
        if (numEq) { row[numEq[1]] = Number(numEq[2]); return; }
      });
      await put(tableName, row);
      changed++;
    }
  }

  return { changes: { changes: changed } };
}

async function handleDelete(sql, params = []) {
  const tableName = getTableName(sql);
  if (!tableName || !STORES.includes(tableName)) return { changes: { changes: 0 } };

  const rows = await getAll(tableName);
  const whereMatch = sql.match(/WHERE\s+(.+)$/i);
  if (!whereMatch) {
    for (const row of rows) {
      await remove(tableName, row.id);
    }
    return { changes: { changes: rows.length } };
  }

  let whereClause = whereMatch[1];
  let pIdx = 0;
  whereClause = whereClause.replace(/\?/g, () => {
    const v = params[pIdx++];
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'string') return `'${v}'`;
    return v;
  });

  const toDelete = rows.filter((r) => parseWhere(whereClause, r));
  for (const row of toDelete) {
    await remove(tableName, row.id);
  }

  return { changes: { changes: toDelete.length } };
}

// ─── Seed data ───────────────────────────────────────────────────────────────

const seedData = async () => {
  const users = await getAll('users');
  if (users.length === 0) {
    await put('users', { id: 1, email: 'usuario@latidos.app', password: 'demo123', name: 'Usuario Demo', latidos: 1130, steps_today: 0, racha: 6, weekly_steps: '[4200,6100,8500,9200,7800,11200,0]', daily_goal: 10000, role: 'user', comercio_id: null });
    await put('users', { id: 2, email: 'admin@latidos.app', password: 'admin123', name: 'Administrador', latidos: 0, steps_today: 0, racha: 0, weekly_steps: '[0,0,0,0,0,0,0]', daily_goal: 10000, role: 'admin', comercio_id: null });
    await put('users', { id: 3, email: 'fruteria@latidos.app', password: 'demo123', name: 'Frutería La Majorera', latidos: 0, steps_today: 0, racha: 0, weekly_steps: '[0,0,0,0,0,0,0]', daily_goal: 10000, role: 'comercio', comercio_id: 2 });
    await put('preferences', { id: 1, user_id: 1, theme: 'light', language: 'es', currency: 'EUR' });
    await put('preferences', { id: 2, user_id: 2, theme: 'dark', language: 'es', currency: 'EUR' });
    await put('preferences', { id: 3, user_id: 3, theme: 'light', language: 'es', currency: 'EUR' });
  }

  const comercios = await getAll('comercios');
  if (comercios.length === 0) {
    await put('comercios', { id: 1, nombre: 'Cafetería El Guiniguada', categoria: 'Cafetería', direccion: 'C/ León y Castillo, 14', lat: 28.0034, lon: -15.4144, descuento: 2, latidos_necesarios: 200, color: '#B6737F', emoji: '☕', bonos: '[]' });
    await put('comercios', { id: 2, nombre: 'Frutería La Majorera', categoria: 'Frutería', direccion: 'Plaza de San Gregorio, 3', lat: 28.0048, lon: -15.4158, descuento: 3, latidos_necesarios: 300, color: '#4CAF50', emoji: '🍎', bonos: '[{"titulo":"Bono Fruta Fresca","descripcion":"1 kg de fruta gratis"}]' });
    await put('comercios', { id: 3, nombre: 'Moda Tara', categoria: 'Tienda de ropa', direccion: 'C/ Inés Chemida, 22', lat: 28.0021, lon: -15.4139, descuento: 5, latidos_necesarios: 500, color: '#9C27B0', emoji: '👗', bonos: '[{"titulo":"Rebajas Especiales","descripcion":"10% extra en toda la tienda"}]' });
    await put('comercios', { id: 4, nombre: 'Panadería San Gregorio', categoria: 'Panadería', direccion: 'C/ Real de Telde, 8', lat: 28.0055, lon: -15.4162, descuento: 1, latidos_necesarios: 100, color: '#FF9800', emoji: '🥖', bonos: '[]' });
    await put('comercios', { id: 5, nombre: 'Farmacia Valsequillo', categoria: 'Farmacia', direccion: 'Av. de las Canarias, 45', lat: 28.0015, lon: -15.4130, descuento: 4, latidos_necesarios: 400, color: '#2196F3', emoji: '💊', bonos: '[{"titulo":"Bono Salud","descripcion":"Vitamina C gratis con compra +10€"}]' });
  }

  // Repair any existing transactions with missing or invalid fecha
  try {
    const txs = await getAll('transactions');
    for (const t of txs) {
      if (!t.fecha || isNaN(new Date(t.fecha).getTime())) {
        t.fecha = new Date().toISOString();
        await put('transactions', t);
      }
    }
  } catch (e) {}
};

// ─── Public API ──────────────────────────────────────────────────────────────

export const initWebDB = async () => {
  idb = await openIDB();
  await seedData();
};

export const webDB = {
  query: (sql, params = []) => execSQL(sql, params),
  run: (sql, params = []) => execSQL(sql, params),
  execute: (sql, params = []) => execSQL(sql, params),
};
