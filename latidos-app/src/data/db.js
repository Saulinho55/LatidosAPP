import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { initWebDB, webDB } from './db-web.js';

const sqlite = new SQLiteConnection(CapacitorSQLite);
let db = null;

const DB_NAME = "latidos_db";

const initialSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL DEFAULT '',
    name        TEXT    NOT NULL,
    latidos     INTEGER DEFAULT 0,
    steps_today INTEGER DEFAULT 0,
    weekly_steps TEXT DEFAULT '[0,0,0,0,0,0,0]',
    racha       INTEGER DEFAULT 0,
    daily_goal  INTEGER DEFAULT 10000,
    role        TEXT    DEFAULT 'user',
    comercio_id INTEGER DEFAULT NULL,
    created_at  TEXT    DEFAULT (datetime('now', 'localtime'))
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
    created_at       TEXT    DEFAULT (datetime('now', 'localtime'))
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
    importe_compra   REAL    DEFAULT NULL,
    fecha            TEXT    DEFAULT (datetime('now', 'localtime')),
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
    created_at     TEXT    DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activity (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL,
    fecha          TEXT    NOT NULL,
    pasos          INTEGER DEFAULT 0,
    latidos_ganados INTEGER DEFAULT 0,
    UNIQUE(user_id, fecha),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`;

export const initDB = async () => {
  if (db) return; // already initialized

  // On web (browser / PWA), use IndexedDB instead of WASM SQLite
  if (!Capacitor.isNativePlatform()) {
    await initWebDB();
    db = webDB;
    return;
  }

  // Native (Android / iOS) — use real SQLite
  try {
    await sqlite.checkConnectionsConsistency().catch(() => true);
    const hasConn = await sqlite.isConnection(DB_NAME, false);
    if (hasConn.result) {
      db = await sqlite.retrieveConnection(DB_NAME, false);
    } else {
      db = await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
    }
    await db.open();
    await db.execute(initialSchema);
    await seedDB();
  } catch (err) {
    console.error("Error inicializando BD:", err);
  }
};

const seedDB = async () => {
  try {
    const usersRes = await db.query('SELECT count(*) as count FROM users');
    if (usersRes.values[0].count === 0) {
      await db.run(`INSERT INTO users (id, email, password, name, latidos, steps_today, racha, weekly_steps, role)
              VALUES (1, 'usuario@latidos.app', 'demo123', 'Usuario', 1130, 0, 6, '[4200,6100,8500,9200,7800,11200,0]', 'user')`);
      await db.run(`INSERT INTO preferences (user_id, theme, language, currency) VALUES (1, 'light', 'es', 'EUR')`);

      await db.run(`INSERT INTO users (email, password, name, role) VALUES ('admin@latidos.app', 'admin123', 'Administrador', 'admin')`);
      await db.run(`INSERT INTO preferences (user_id, theme) VALUES (2, 'dark')`);
    }

    const fruteriaRes = await db.query('SELECT count(*) as count FROM users WHERE email = ?', ['fruteria@latidos.app']);
    if (fruteriaRes.values[0].count === 0) {
      await db.run(`INSERT INTO users (email, password, name, role, comercio_id) VALUES ('fruteria@latidos.app', 'demo123', 'Frutería La Majorera', 'comercio', 2)`);
      const newF = await db.query('SELECT id FROM users WHERE email = ?', ['fruteria@latidos.app']);
      await db.run(`INSERT INTO preferences (user_id, theme) VALUES (?, 'light')`, [newF.values[0].id]);
    }

    const comerciosRes = await db.query('SELECT count(*) as count FROM comercios');
    if (comerciosRes.values[0].count === 0) {
      const mockComercios = [
        { n: 'Cafetería El Guiniguada', c: 'Cafetería', d: 'C/ León y Castillo, 14', lat: 28.0034, lon: -15.4144, desc: 2, ln: 200, col: '#B6737F', em: '☕', b: '[]' },
        { n: 'Frutería La Majorera', c: 'Frutería', d: 'Plaza de San Gregorio, 3', lat: 28.0048, lon: -15.4158, desc: 3, ln: 300, col: '#4CAF50', em: '🍎', b: '[{"titulo":"Bono Fruta Fresca","descripcion":"1 kg de fruta gratis"}]' },
        { n: 'Moda Tara', c: 'Tienda de ropa', d: 'C/ Inés Chemida, 22', lat: 28.0021, lon: -15.4139, desc: 5, ln: 500, col: '#9C27B0', em: '👗', b: '[{"titulo":"Rebajas Especiales","descripcion":"10% extra en toda la tienda"}]' },
        { n: 'Panadería San Gregorio', c: 'Panadería', d: 'C/ Real de Telde, 8', lat: 28.0055, lon: -15.4162, desc: 1, ln: 100, col: '#FF9800', em: '🥖', b: '[]' },
        { n: 'Farmacia Valsequillo', c: 'Farmacia', d: 'Av. de las Canarias, 45', lat: 28.0015, lon: -15.4130, desc: 4, ln: 400, col: '#2196F3', em: '💊', b: '[{"titulo":"Bono Salud","descripcion":"Vitamina C gratis con compra +10€"}]' }
      ];
      for (const mc of mockComercios) {
        await db.run(`INSERT INTO comercios (nombre, categoria, direccion, lat, lon, descuento, latidos_necesarios, color, emoji, bonos)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [mc.n, mc.c, mc.d, mc.lat, mc.lon, mc.desc, mc.ln, mc.col, mc.em, mc.b]);
      }
    }
  } catch (err) {
    console.error("Error haciendo seed:", err);
  }
};

export const getDB = () => db;
