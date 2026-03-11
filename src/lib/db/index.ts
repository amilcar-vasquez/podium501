import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const DB_PATH = process.env.DB_PATH ?? join(process.cwd(), 'data', 'podium501.db');
const DATA_DIR = dirname(DB_PATH);
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (!_db) {
		_db = new Database(DB_PATH);
		_db.pragma('journal_mode = WAL');
		_db.pragma('foreign_keys = ON');
		migrate(_db);
	}
	return _db;
}

function migrate(db: Database.Database) {
	db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      school TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6750A4'
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS score_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      points INTEGER NOT NULL,
      judge TEXT NOT NULL DEFAULT 'Coach',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
