import { Pool } from 'pg';
import { env } from '$env/dynamic/private';

const DEFAULT_DB_URL = 'postgresql://podium501:podium501@localhost:5432/podium501';
const DB_URL = env.DATABASE_URL || DEFAULT_DB_URL;

let _db: Pool | null = null;
let _migrating: Promise<void> | null = null;

export async function getDb(): Promise<Pool> {
	if (!_db) {
		_db = new Pool({ connectionString: DB_URL, max: 10 });
	}

	if (!_migrating) {
		_migrating = migrate(_db);
	}

	await _migrating;
	return _db;
}

async function migrate(db: Pool) {
	await db.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      table_number TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#6750A4'
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS score_events (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      points INTEGER NOT NULL,
      judge TEXT NOT NULL DEFAULT 'Coach',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS coaches (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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

    ALTER TABLE teams ADD COLUMN IF NOT EXISTS table_number TEXT NOT NULL DEFAULT '';
    ALTER TABLE teams ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#6750A4';
    ALTER TABLE coaches ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'coach';
  `);

	const teamCols = await db.query<{ column_name: string }>(
		`SELECT column_name FROM information_schema.columns WHERE table_name = 'teams'`
	);
  const teamColumnRows = teamCols.rows as Array<{ column_name: string }>;
	if (
    teamColumnRows.some((c: { column_name: string }) => c.column_name === 'school') &&
    !teamColumnRows.some((c: { column_name: string }) => c.column_name === 'table_number')
	) {
		await db.query('ALTER TABLE teams RENAME COLUMN school TO table_number');
	}

	await db.query(`
    INSERT INTO coach_teams (coach_id, team_id)
    SELECT id, team_id
    FROM coaches
    WHERE team_id IS NOT NULL
    ON CONFLICT (coach_id, team_id) DO NOTHING
  `);
}
