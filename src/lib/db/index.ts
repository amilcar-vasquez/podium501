import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = env.DATABASE_URL || 'local.db';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (!_db) {
    const dataDir = dirname(DB_PATH);
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    const db = new Database(DB_PATH);
    try {
      db.pragma('busy_timeout = 5000');
      try {
        db.pragma('journal_mode = WAL');
      } catch (error) {
        // Azure File shares may not support WAL locks reliably; fall back to DELETE mode.
        console.warn(`Falling back to DELETE journal mode for SQLite at ${DB_PATH}:`, error);
        db.pragma('journal_mode = DELETE');
      }
      db.pragma('foreign_keys = ON');
      migrate(db);
      _db = db;
    } catch (error) {
      db.close();
      throw error;
    }
	}
	return _db;
}

function migrate(db: Database.Database) {
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

    CREATE TABLE IF NOT EXISTS coach_teams (
      coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      PRIMARY KEY (coach_id, team_id)
    );
  `);

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

  // Backfill legacy coaches.team_id into coach_teams for existing databases.
  if (coachCols.some((c) => c.name === 'team_id')) {
    const legacyAssignments = db
      .prepare('SELECT id, team_id FROM coaches WHERE team_id IS NOT NULL')
      .all() as { id: number; team_id: number }[];
    const insertAssignment = db.prepare('INSERT OR IGNORE INTO coach_teams (coach_id, team_id) VALUES (?, ?)');
    const backfill = db.transaction((rows: { id: number; team_id: number }[]) => {
      for (const row of rows) insertAssignment.run(row.id, row.team_id);
    });
    backfill(legacyAssignments);
  }
}
