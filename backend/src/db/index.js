const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const backendRoot = path.join(__dirname, '..', '..');

let db;

function resolveDbPath() {
  const configured = process.env.DB_PATH || path.join('data', 'users.db');
  if (configured === ':memory:') return configured;
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(backendRoot, configured);
}

function normalizeId(value) {
  const id = typeof value === 'bigint' ? Number(value) : value;
  return id;
}

function toPublicUser(row) {
  if (!row) return null;
  return { id: normalizeId(row.id), username: row.username };
}

function getDb() {
  if (db) return db;

  const dbPath = resolveDbPath();
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
      ON users(username COLLATE NOCASE);
  `);
  return db;
}

function closeDb() {
  if (!db) return;
  db.close();
  db = null;
}

function isUniqueViolation(err) {
  return err && err.code === 'SQLITE_CONSTRAINT_UNIQUE';
}

function createUser(username, passwordHash) {
  const info = getDb()
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, passwordHash);
  return { id: normalizeId(info.lastInsertRowid), username };
}

function mapUser(row) {
  if (!row) return null;
  return { ...row, id: normalizeId(row.id) };
}

function findByUsername(username) {
  return mapUser(
    getDb()
      .prepare(
        `SELECT id, username, password_hash
         FROM users
         WHERE username = ? COLLATE NOCASE`
      )
      .get(username)
  );
}

function findById(id) {
  return mapUser(
    getDb()
      .prepare(
        `SELECT id, username, password_hash
         FROM users
         WHERE id = ?`
      )
      .get(id)
  );
}

function listUsers() {
  return getDb()
    .prepare('SELECT id, username FROM users ORDER BY id ASC')
    .all()
    .map(toPublicUser);
}

function updateUser(id, fields) {
  const sets = [];
  const params = [];
  if (Object.prototype.hasOwnProperty.call(fields, 'username')) {
    sets.push('username = ?');
    params.push(fields.username);
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'password_hash')) {
    sets.push('password_hash = ?');
    params.push(fields.password_hash);
  }
  if (sets.length === 0) return 0;
  params.push(id);
  const info = getDb()
    .prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
    .run(...params);
  return info.changes;
}

function deleteUser(id) {
  const info = getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
  return info.changes;
}

module.exports = {
  getDb,
  closeDb,
  resolveDbPath,
  isUniqueViolation,
  createUser,
  findByUsername,
  findById,
  listUsers,
  updateUser,
  deleteUser,
  toPublicUser,
};
