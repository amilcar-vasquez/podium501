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
	const db = getDb();

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
		const updateCoach = db.transaction(() => {
			const result = db
				.prepare('UPDATE coaches SET name = ?, team_id = NULL, role = ? WHERE id = ?')
				.run(name.trim(), safeRole, id);

			if (result.changes === 0) {
				return false;
			}

			db.prepare('DELETE FROM coach_teams WHERE coach_id = ?').run(id);
			if (teamIds.length > 0) {
				const insertAssignment = db.prepare('INSERT INTO coach_teams (coach_id, team_id) VALUES (?, ?)');
				for (const teamId of teamIds) insertAssignment.run(id, teamId);
			}

			return true;
		});

		const changed = updateCoach();
		if (!changed) {
			return json({ error: 'Coach not found' }, { status: 404 });
		}

		const updated = db
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

		return json(updated ? toCoachPayload(updated) : null);
	} catch (e: unknown) {
		if (e instanceof Error && e.message.includes('UNIQUE')) {
			return json({ error: 'Coach PIN collision or duplicate assignment' }, { status: 409 });
		}
		throw e;
	}
};

export const DELETE: RequestHandler = ({ params }) => {
	const db = getDb();
	db.prepare('DELETE FROM coaches WHERE id = ?').run(Number(params.id));
	return json({ ok: true });
};
