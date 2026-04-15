import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!id) return json({ error: 'Invalid id' }, { status: 400 });

	const { name, team_id, role } = await request.json();
	if (!name?.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}

	const safeRole = role === 'admin' ? 'admin' : 'coach';
	const db = getDb();
	try {
		const result = db
			.prepare('UPDATE coaches SET name = ?, team_id = ?, role = ? WHERE id = ?')
			.run(name.trim(), team_id ?? null, safeRole, id);

		if (result.changes === 0) {
			return json({ error: 'Coach not found' }, { status: 404 });
		}

		const updated = db
			.prepare(
				`SELECT c.id, c.name, c.pin, c.team_id, c.role, t.name AS team_name
				 FROM coaches c
				 LEFT JOIN teams t ON t.id = c.team_id
				 WHERE c.id = ?`
			)
			.get(id);
		return json(updated);
	} catch (e: unknown) {
		if (e instanceof Error && e.message.includes('UNIQUE')) {
			return json({ error: 'That team already has a coach assigned' }, { status: 409 });
		}
		throw e;
	}
};

export const DELETE: RequestHandler = ({ params }) => {
	const db = getDb();
	db.prepare('DELETE FROM coaches WHERE id = ?').run(Number(params.id));
	return json({ ok: true });
};
