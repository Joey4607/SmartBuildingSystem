import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
// Vercel functions can only write temporary files. The prototype database is
// therefore placed in /tmp when deployed, while local development continues
// to use the server/data directory.
const dataDir = process.env.VERCEL
  ? path.join('/tmp', 'smart-building-data')
  : path.resolve(currentDir, '../../data');
const schemaPath = path.resolve(currentDir, '../sql/schema.sql');
let database;

export async function getDatabase() {
  if (database) return database;
  if (process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.NETLIFY || process.env.NETLIFY_DB_URL) {
    const { getHostedDatabase } = await import('./hostedDatabase.js');
    database = await getHostedDatabase();
    return database;
  }
  await fs.mkdir(dataDir, { recursive: true });
  const connection = new DatabaseSync(path.join(dataDir, 'smart-building.db'));
  database = {
    exec: async (sql) => connection.exec(sql),
    get: async (sql, ...params) => connection.prepare(sql).get(...params),
    all: async (sql, ...params) => connection.prepare(sql).all(...params),
    run: async (sql, ...params) => {
      const result = connection.prepare(sql).run(...params);
      return { lastID: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
  };
  await database.exec(await fs.readFile(schemaPath, 'utf8'));
  await migrateUserRoles(database);
  await seedDatabase(database);
  await ensureSensorHistory(database);
  return database;
}

async function migrateUserRoles(db) {
  const table = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
  if (!table?.sql || table.sql.includes("'student'")) return;
  await db.exec(`PRAGMA foreign_keys=OFF;
    ALTER TABLE users RENAME TO users_old;
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE COLLATE NOCASE,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin','student')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO users (id,name,email,password_hash,role,created_at) SELECT id,name,email,password_hash,'admin',created_at FROM users_old;
    DROP TABLE users_old;
    PRAGMA foreign_keys=ON;`);
}

async function seedDatabase(db) {
  const email = process.env.ADMIN_EMAIL || 'admin@smartcampus.local';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const user = await db.get('SELECT id FROM users WHERE email = ?', email);
  if (!user) {
    await db.run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', 'Campus Administrator', email, await bcrypt.hash(password, 12), 'admin');
  } else {
    await db.run("UPDATE users SET role = 'admin' WHERE email = ?", email);
  }
  const studentEmail = process.env.STUDENT_EMAIL || 'student@smartcampus.local';
  const student = await db.get('SELECT id FROM users WHERE email = ?', studentEmail);
  if (!student) await db.run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', 'Student User', studentEmail, await bcrypt.hash(process.env.STUDENT_PASSWORD || 'Student123!', 12), 'student');
  const count = await db.get('SELECT COUNT(*) AS total FROM buildings');
  if (count.total > 0) return;
  const building = await db.run('INSERT INTO buildings (name, address) VALUES (?, ?)', 'Innovation Centre', 'Smart Campus');
  const equipment = [
    ['Main Air Handling Unit', 'HVAC', 'Roof plant room', 'operational'],
    ['Passenger Lift 1', 'Lift', 'North lobby', 'warning'],
    ['Solar Inverter A', 'Energy', 'Roof', 'operational'],
    ['Water Circulation Pump', 'Pump', 'Ground-floor plant room', 'offline'],
    ['Server Room Cooling', 'HVAC', 'Second floor', 'operational'],
  ];
  for (const item of equipment) await db.run('INSERT INTO equipment (building_id, name, type, location, status, last_checked_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', building.lastID, ...item);
  const readings = [['temperature', 22.4, '°C', 'Innovation Lab'], ['humidity', 46, '%', 'Innovation Lab'], ['air quality', 418, 'ppm', 'First floor'], ['energy', 38.7, 'kW', 'Whole building']];
  for (const item of readings) await db.run('INSERT INTO sensor_readings (building_id, sensor_type, value, unit, location) VALUES (?, ?, ?, ?, ?)', building.lastID, ...item);
  for (let point = 7; point >= 1; point -= 1) {
    const historical = [['temperature', 21.6 + point * .1, '°C', 'Innovation Lab'], ['humidity', 43 + point % 4, '%', 'Innovation Lab'], ['air quality', 390 + point * 4, 'ppm', 'First floor'], ['energy', 32 + point * .8, 'kW', 'Whole building']];
    for (const item of historical) await db.run("INSERT INTO sensor_readings (building_id,sensor_type,value,unit,location,recorded_at) VALUES (?,?,?,?,?,datetime('now', ?))", building.lastID, ...item, `-${point} hours`);
  }
  await db.run("INSERT INTO maintenance_requests (equipment_id, title, description, priority, status, requested_by) VALUES (2, 'Inspect lift vibration', 'Unusual vibration reported during travel.', 'medium', 'open', 'Facilities Team')");
  await db.run("INSERT INTO maintenance_requests (equipment_id, title, description, priority, status, requested_by) VALUES (4, 'Restore circulation pump', 'Pump stopped during the last simulated check.', 'high', 'in progress', 'System Alert')");
}

async function ensureSensorHistory(db) {
  const building = await db.get('SELECT id FROM buildings ORDER BY id LIMIT 1');
  if (!building) return;
  const definitions = [['temperature', 22.4, '°C', 'Innovation Lab'], ['humidity', 46, '%', 'Innovation Lab'], ['air quality', 418, 'ppm', 'First floor'], ['energy', 38.7, 'kW', 'Whole building']];
  for (const [type, base, unit, location] of definitions) {
    const count = await db.get('SELECT COUNT(*) AS total FROM sensor_readings WHERE sensor_type=?', type);
    if (count.total >= 8) continue;
    for (let point = 7; point >= 1; point -= 1) {
      const variation = type === 'air quality' ? point * 4 : type === 'energy' ? point * .8 : point * .1;
      await db.run("INSERT INTO sensor_readings (building_id,sensor_type,value,unit,location,recorded_at) VALUES (?,?,?,?,?,datetime('now', ?))", building.id, type, Number((base - variation).toFixed(1)), unit, location, `-${point} hours`);
    }
  }
}
