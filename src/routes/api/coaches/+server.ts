import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';
import type { Pool } from 'pg';

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
	let teamIds = splitCsv(row.team_ids_csv)
		.map((v) => Number(v))
		.filter((v) => Number.isInteger(v) && v > 0);
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

	const ids = raw.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0);

	return [...new Set(ids)];
}

async function fetchCoachById(db: Pool, id: number) {
	const result = await db.query<CoachRow>(
		`SELECT
			c.id,
			c.name,
			c.pin,
			c.role,
			c.team_id AS legacy_team_id,
			legacy_team.name AS legacy_team_name,
			COALESCE(STRING_AGG(ct.team_id::text, ',' ORDER BY ct.team_id), '') AS team_ids_csv,
			COALESCE(STRING_AGG(t.name, ',' ORDER BY ct.team_id), '') AS team_names_csv
		 FROM coaches c
		 LEFT JOIN teams legacy_team ON legacy_team.id = c.team_id
		 LEFT JOIN coach_teams ct ON ct.coach_id = c.id
		 LEFT JOIN teams t ON t.id = ct.team_id
		 WHERE c.id = $1
		 GROUP BY c.id, c.name, c.pin, c.role, c.team_id, legacy_team.name`,
		[id]
	);

	const row = result.rows[0];
	return row ? toCoachPayload(row) : null;
}

async function generatePin(db: Pool): Promise<string> {
	for (let i = 0; i < 20; i++) {
		const pin = String(Math.floor(1000 + Math.random() * 9000));
		const existing = await db.query('SELECT id FROM coaches WHERE pin = $1', [pin]);
		if (existing.rowCount === 0) return pin;
	}
	throw new Error('Could not generate a unique PIN');
}

export const GET: RequestHandler = async () => {
	const db = await getDb();
	const result = await db.query<CoachRow>(
		`SELECT
			c.id,
			c.name,
			c.pin,
			c.role,
			c.team_id AS legacy_team_id,
			legacy_team.name AS legacy_team_name,
			COALESCE(STRING_AGG(ct.team_id::text, ',' ORDER BY ct.team_id), '') AS team_ids_csv,
			COALESCE(STRING_AGG(t.name, ',' ORDER BY ct.team_id), '') AS team_names_csv
     FROM coaches c
	     LEFT JOIN teams legacy_team ON legacy_team.id = c.team_id
	     LEFT JOIN coach_teams ct ON ct.coach_id = c.id
	     LEFT JOIN teams t ON t.id = ct.team_id
	     GROUP BY c.id, c.name, c.pin, c.role, c.team_id, legacy_team.name
	     ORDER BY c.name ASC`
	);
	return json(result.rows.map(toCoachPayload));
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as Record<string, unknown>;
	const name = typeof body.name === 'string' ? body.name : '';
	if (!name.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}
	const teamIds = parseTeamIds(body);
	const safeRole = body.role === 'admin' ? 'admin' : 'coach';
	const db = await getDb();
	const pin = await generatePin(db);

	if (teamIds.length > 0) {
		const found = await db.query<{ id: number }>('SELECT id FROM teams WHERE id = ANY($1::int[])', [teamIds]);
		if (found.rowCount !== teamIds.length) {
			return json({ error: 'One or more team assignments are invalid' }, { status: 400 });
		}
	}

	const client = await db.connect();
	try {
		await client.query('BEGIN');
		const insertCoach = await client.query<{ id: number }>(
			'INSERT INTO coaches (name, pin, team_id, role) VALUES ($1, $2, NULL, $3) RETURNING id',
			[name.trim(), pin, safeRole]
		);
		const coachId = insertCoach.rows[0].id;

		if (teamIds.length > 0) {
			await client.query(
				`INSERT INTO coach_teams (coach_id, team_id)
				 SELECT $1, UNNEST($2::int[])
				 ON CONFLICT (coach_id, team_id) DO NOTHING`,
				[coachId, teamIds]
			);
		}

		await client.query('COMMIT');
		const created = await fetchCoachById(db, coachId);
		return json(created, { status: 201 });
	} catch (e: unknown) {
		await client.query('ROLLBACK');
		if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') {
			return json({ error: 'Coach PIN collision or duplicate assignment' }, { status: 409 });
		}
		throw e;
	} finally {
		client.release();
	}
};
