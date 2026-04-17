import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';
import type { Database } from 'better-sqlite3';

type CoachRow = {
	id: number;
	name: string;
	pin: string;
	role: 'coach' | 'admin';
	legacy_team_id: number | null;
	legacy_team_name: string | null;
	team_ids_csv: string;
	team_names_csv: string;
};

function splitCsv(value: string): string[] {
	if (!value) return [];
	return value
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

function toCoachPayload(row: CoachRow) {
	let teamIds = splitCsv(row.team_ids_csv).map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0);
	let teamNames = splitCsv(row.team_names_csv);

	if (teamIds.length === 0 && row.legacy_team_id) {
		teamIds = [row.legacy_team_id];
		teamNames = row.legacy_team_name ? [row.legacy_team_name] : [];
	}

	return {
		id: row.id,
		name: row.name,
		pin: row.pin,
		role: row.role,
		team_ids: teamIds,
		team_names: teamNames,
		// Legacy compatibility fields
		team_id: teamIds[0] ?? null,
		team_name: teamNames[0] ?? null
	};
}

function parseTeamIds(body: Record<string, unknown>): number[] {
	const raw = Array.isArray(body.team_ids)
		? body.team_ids
		: body.team_id === null || body.team_id === undefined || body.team_id === ''
			? []
			: [body.team_id];

	const ids = raw
		.map((v) => Number(v))
		.filter((v) => Number.isInteger(v) && v > 0);

	return [...new Set(ids)];
}

function fetchCoachById(db: Database, id: number) {
	const row = db
		.prepare(
			`SELECT
				c.id,
				c.name,
				c.pin,
				c.role,
				c.team_id AS legacy_team_id,
				legacy_team.name AS legacy_team_name,
				COALESCE(GROUP_CONCAT(ct.team_id), '') AS team_ids_csv,
				COALESCE(GROUP_CONCAT(t.name), '') AS team_names_csv
			 FROM coaches c
			 LEFT JOIN teams legacy_team ON legacy_team.id = c.team_id
			 LEFT JOIN coach_teams ct ON ct.coach_id = c.id
			 LEFT JOIN teams t ON t.id = ct.team_id
			 WHERE c.id = ?
			 GROUP BY c.id, c.name, c.pin, c.role, c.team_id, legacy_team.name`
		)
		.get(id) as CoachRow | undefined;

	return row ? toCoachPayload(row) : null;
}

function generatePin(db: Database): string {
	for (let i = 0; i < 20; i++) {
		const pin = String(Math.floor(1000 + Math.random() * 9000));
		const existing = db.prepare('SELECT id FROM coaches WHERE pin = ?').get(pin);
		if (!existing) return pin;
	}
	throw new Error('Could not generate a unique PIN');
}

export const GET: RequestHandler = () => {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT
				c.id,
				c.name,
				c.pin,
				c.role,
				c.team_id AS legacy_team_id,
				legacy_team.name AS legacy_team_name,
				COALESCE(GROUP_CONCAT(ct.team_id), '') AS team_ids_csv,
				COALESCE(GROUP_CONCAT(t.name), '') AS team_names_csv
       FROM coaches c
	       LEFT JOIN teams legacy_team ON legacy_team.id = c.team_id
	       LEFT JOIN coach_teams ct ON ct.coach_id = c.id
	       LEFT JOIN teams t ON t.id = ct.team_id
	       GROUP BY c.id, c.name, c.pin, c.role, c.team_id, legacy_team.name
	       ORDER BY c.name ASC`
		)
		.all() as CoachRow[];
	const coaches = rows.map(toCoachPayload);
	return json(coaches);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as Record<string, unknown>;
	const name = typeof body.name === 'string' ? body.name : '';
	if (!name.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}
	const teamIds = parseTeamIds(body);
	const safeRole = body.role === 'admin' ? 'admin' : 'coach';
	const db = getDb();
	const pin = generatePin(db);

	if (teamIds.length > 0) {
		const placeholders = teamIds.map(() => '?').join(',');
		const found = db
			.prepare(`SELECT id FROM teams WHERE id IN (${placeholders})`)
			.all(...teamIds) as { id: number }[];
		if (found.length !== teamIds.length) {
			return json({ error: 'One or more team assignments are invalid' }, { status: 400 });
		}
	}

	try {
		const createCoach = db.transaction(() => {
			const result = db
				.prepare('INSERT INTO coaches (name, pin, team_id, role) VALUES (?, ?, NULL, ?)')
				.run(name.trim(), pin, safeRole);

			const coachId = Number(result.lastInsertRowid);
			if (teamIds.length > 0) {
				const insertAssignment = db.prepare('INSERT INTO coach_teams (coach_id, team_id) VALUES (?, ?)');
				for (const teamId of teamIds) insertAssignment.run(coachId, teamId);
			}

			return coachId;
		});

		const createdCoachId = createCoach();
		const created = fetchCoachById(db, createdCoachId);
		return json(created, { status: 201 });
	} catch (e: unknown) {
		if (e instanceof Error && e.message.includes('UNIQUE')) {
			return json({ error: 'Coach PIN collision or duplicate assignment' }, { status: 409 });
		}
		throw e;
	}
};
