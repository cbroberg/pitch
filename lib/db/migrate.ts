import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export function runMigrations() {
  const dataDir = process.env.STORAGE_PATH || path.join(process.cwd(), 'data');
  const dbDir = path.join(dataDir, 'db');
  const pitchesDir = path.join(dataDir, 'pitches');

  fs.mkdirSync(dbDir, { recursive: true });
  fs.mkdirSync(pitchesDir, { recursive: true });

  const dbPath = path.join(dbDir, 'pitch-vault.db');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      hashed_password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'super_admin',
      api_key TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      parent_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pitches (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
      file_type TEXT,
      entry_file TEXT,
      is_published INTEGER NOT NULL DEFAULT 0,
      total_views INTEGER NOT NULL DEFAULT 0,
      unique_views INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS access_tokens (
      id TEXT PRIMARY KEY,
      pitch_id TEXT NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'anonymous',
      email TEXT,
      label TEXT,
      expires_at INTEGER,
      max_uses INTEGER,
      use_count INTEGER NOT NULL DEFAULT 0,
      is_revoked INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS view_events (
      id TEXT PRIMARY KEY,
      pitch_id TEXT NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
      token_id TEXT REFERENCES access_tokens(id) ON DELETE SET NULL,
      email TEXT,
      ip_address TEXT,
      user_agent TEXT,
      duration INTEGER,
      created_at INTEGER NOT NULL
    );
  `);

  // Additive column migrations
  const cols = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
  const colNames = cols.map((c) => c.name);
  if (!colNames.includes('editor_font_size')) {
    db.exec(`ALTER TABLE users ADD COLUMN editor_font_size INTEGER NOT NULL DEFAULT 16`);
  }

  db.close();
  console.log('[pitch-vault] Migrations completed');
}
