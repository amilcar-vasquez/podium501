import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

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

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!id) return json({ error: 'Invalid id' }, { status: 400 });

	const body = (await request.json()) as Record<string, unknown>;
	const name = typeof body.name === 'string' ? body.name : '';
	if (!name.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}

	const teamIds = parseTeamIds(body);
	const safeRole = body.role === 'admin' ? 'admin' : 'coach';
	const db = await getDb();

	if (teamIds.length > 0) {
		const found = await db.query<{ id: number }>('SELECT id FROM teams WHERE id = ANY($1::int[])', [teamIds]);
		if (found.rowCount !== teamIds.length) {
			return json({ error: 'One or more team assignments are invalid' }, { status: 400 });
		}
	}

	const client = await db.connect();
	try {
		await client.query('BEGIN');
		const result = await client.query(
			'UPDATE coaches SET name = $1, team_id = NULL, role = $2 WHERE id = $3',
			[name.trim(), safeRole, id]
		);

		if (result.rowCount === 0) {
			await client.query('ROLLBACK');
			return json({ error: 'Coach not found' }, { status: 404 });
		}

		await client.query('DELETE FROM coach_teams WHERE coach_id = $1', [id]);
		if (teamIds.length > 0) {
			await client.query(
				`INSERT INTO coach_teams (coach_id, team_id)
				 SELECT $1, UNNEST($2::int[])
				 ON CONFLICT (coach_id, team_id) DO NOTHING`,
				[id, teamIds]
			);
		}

		await client.query('COMMIT');

		const updated = await db.query<CoachRow>(
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

		return json(updated.rows[0] ? toCoachPayload(updated.rows[0]) : null);
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

export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!id) return json({ error: 'Invalid id' }, { status: 400 });
	const db = await getDb();
	await db.query('DELETE FROM coaches WHERE id = $1', [id]);
	return json({ ok: true });
};
