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
	// Rename legacy 'school' column to 'table_number' if it still exists
	const cols = db.prepare('PRAGMA table_info(teams)').all() as { name: string }[];
	if (cols.some((c) => c.name === 'school') && !cols.some((c) => c.name === 'table_number')) {
		db.exec('ALTER TABLE teams RENAME COLUMN school TO table_number');
	}

	// Add role column to coaches if it doesn't exist yet (migration for existing DBs)
	const coachCols = db.prepare('PRAGMA table_info(coaches)').all() as { name: string }[];
	if (coachCols.length > 0 && !coachCols.some((c) => c.name === 'role')) {
		db.exec("ALTER TABLE coaches ADD COLUMN role TEXT NOT NULL DEFAULT 'coach'");
	}

	db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      table_number TEXT NOT NULL DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS coaches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pin TEXT NOT NULL UNIQUE,
      team_id INTEGER UNIQUE REFERENCES teams(id) ON DELETE SET NULL,
      role TEXT NOT NULL DEFAULT 'coach'
    );
  `);
}
