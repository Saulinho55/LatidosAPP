const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'latidos.db');

let db;

// Save DB to disk helper
const persist = () => {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
};

// Initialize DB (async because sql.js uses WASM)
const initDB = async () => {
  const SQL = await initSqlJs();

  // Load existing DB or create fresh
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('📂 Loaded existing SQLite database');
  } else {
    db = new SQL.Database();
    console.log('🆕 Created new SQLite database');
  }

  // Schema
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY,
      email       TEXT    UNIQUE NOT NULL,
      password    TEXT    NOT NULL DEFAULT '',
      name        TEXT    NOT NULL,
      latidos     INTEGER DEFAULT 0,
      steps_today INTEGER DEFAULT 0,
      weekly_steps TEXT DEFAULT '[0,0,0,0,0,0,0]',
      racha       INTEGER DEFAULT 0,
      daily_goal  INTEGER DEFAULT 10000,
      role        TEXT    DEFAULT 'user',
      created_at  TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comercios (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre           TEXT    NOT NULL,
      categoria        TEXT    NOT NULL,
      direccion        TEXT    NOT NULL,
      lat              REAL    NOT NULL,
      lon              REAL    NOT NULL,
      descuento        REAL    NOT NULL,
      latidos_necesarios INTEGER NOT NULL,
      color            TEXT    NOT NULL,
      emoji            TEXT    NOT NULL,
      bonos            TEXT    DEFAULT '[]',
      created_at       TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS preferences (
      user_id   INTEGER PRIMARY KEY,
      theme     TEXT DEFAULT 'light',
      language  TEXT DEFAULT 'es',
      currency  TEXT DEFAULT 'EUR',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL,
      comercio_nombre  TEXT    NOT NULL,
      comercio_emoji   TEXT    DEFAULT '🏪',
      code             TEXT    NOT NULL,
      latidos_usados   INTEGER NOT NULL,
      descuento        REAL    NOT NULL,
      fecha            TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS routes (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL,
      name           TEXT    NOT NULL,
      distance       REAL    NOT NULL,
      duration       INTEGER NOT NULL,
      latidos_earned INTEGER NOT NULL,
      path           TEXT    NOT NULL,
      points         TEXT    NOT NULL,
      created_at     TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Migrate existing DB if columns are missing
  try {
    db.run('ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT ""');
    console.log('🔄 Added password column to users table');
    persist();
  } catch (e) {}

  try {
    db.run('ALTER TABLE users ADD COLUMN weekly_steps TEXT DEFAULT "[0,0,0,0,0,0,0]"');
    console.log('🔄 Added weekly_steps column to users table');
    persist();
  } catch (e) {}

  try {
    db.run('ALTER TABLE users ADD COLUMN daily_goal INTEGER DEFAULT 10000');
    console.log('🔄 Added daily_goal column to users table');
    persist();
  } catch (e) {}

  try {
    db.run('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"');
    console.log('🔄 Added role column to users table');
    persist();
  } catch (e) {}

  try {
    db.run('ALTER TABLE users ADD COLUMN comercio_id INTEGER DEFAULT NULL');
    console.log('🔄 Added comercio_id column to users table');
    persist();
  } catch (e) {}

  try {
    db.run('ALTER TABLE transactions ADD COLUMN importe_compra REAL DEFAULT 0');
    console.log('🔄 Added importe_compra column to transactions table');
    persist();
  } catch (e) {}

  // Migrate routes if needed (CREATE TABLE IF NOT EXISTS already handles it mostly,
  // but if we need a specific log for its creation)
  const routesCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='routes'");
  if (!routesCheck.length || !routesCheck[0].values.length) {
    console.log('🔄 Created routes table');
  }

  // Seed demo user if not exists
  const existing = db.exec('SELECT id FROM users WHERE id = 1');
  if (!existing.length || !existing[0].values.length) {
    db.run(`INSERT INTO users (id, email, password, name, latidos, steps_today, racha, weekly_steps, role)
            VALUES (1, 'usuario@latidos.app', 'demo123', 'Usuario', 1130, 0, 6, '[4200,6100,8500,9200,7800,11200,0]', 'user')`);
    db.run(`INSERT INTO preferences (user_id, theme, language, currency)
            VALUES (1, 'light', 'es', 'EUR')`);
    persist();
    console.log('✅ Demo user seeded');
  }

  // Seed admin user
  const adminExisting = db.exec('SELECT id FROM users WHERE email = "admin@latidos.app"');
  if (!adminExisting.length || !adminExisting[0].values.length) {
    db.run(`INSERT INTO users (email, password, name, role) VALUES ('admin@latidos.app', 'admin123', 'Administrador', 'admin')`);
    const adminIdObj = db.exec('SELECT id FROM users WHERE email = "admin@latidos.app"');
    if (adminIdObj.length && adminIdObj[0].values.length) {
      db.run(`INSERT INTO preferences (user_id, theme) VALUES (${adminIdObj[0].values[0][0]}, 'dark')`);
    }
    persist();
    console.log('✅ Admin user seeded');
  }

  // Seed comercios si está vacía
  const comerciosCheck = db.exec('SELECT count(*) FROM comercios');
  if (comerciosCheck.length && comerciosCheck[0].values[0][0] === 0) {
    const mockComercios = [
      { n: 'Cafetería El Guiniguada', c: 'Cafetería', d: 'C/ León y Castillo, 14', lat: 28.0034, lon: -15.4144, desc: 2, ln: 200, col: '#B6737F', em: '☕', b: '[]' },
      { n: 'Frutería La Majorera', c: 'Frutería', d: 'Plaza de San Gregorio, 3', lat: 28.0048, lon: -15.4158, desc: 3, ln: 300, col: '#4CAF50', em: '🍎', b: '[{"titulo":"Bono Fruta Fresca","descripcion":"1 kg de fruta gratis"}]' },
      { n: 'Moda Tara', c: 'Tienda de ropa', d: 'C/ Inés Chemida, 22', lat: 28.0021, lon: -15.4139, desc: 5, ln: 500, col: '#9C27B0', em: '👗', b: '[{"titulo":"Rebajas Especiales","descripcion":"10% extra en toda la tienda"}]' },
      { n: 'Panadería San Gregorio', c: 'Panadería', d: 'C/ Real de Telde, 8', lat: 28.0055, lon: -15.4162, desc: 1, ln: 100, col: '#FF9800', em: '🥖', b: '[]' },
      { n: 'Farmacia Valsequillo', c: 'Farmacia', d: 'Av. de las Canarias, 45', lat: 28.0015, lon: -15.4130, desc: 4, ln: 400, col: '#2196F3', em: '💊', b: '[{"titulo":"Bono Salud","descripcion":"Vitamina C gratis con compra +10€"}]' }
    ];
    for (const mc of mockComercios) {
      db.run(`INSERT INTO comercios (nombre, categoria, direccion, lat, lon, descuento, latidos_necesarios, color, emoji, bonos) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
              [mc.n, mc.c, mc.d, mc.lat, mc.lon, mc.desc, mc.ln, mc.col, mc.em, mc.b]);
    }
    persist();
    console.log('✅ Mock comercios seeded');
  }

  return { db, persist };
};

module.exports = { initDB };
