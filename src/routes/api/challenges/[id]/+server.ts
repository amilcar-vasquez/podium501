import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!id) return json({ error: 'Invalid id' }, { status: 400 });

	const { name, description } = await request.json();
	if (!name?.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}

	const db = getDb();
	try {
		const result = db
			.prepare('UPDATE challenges SET name = ?, description = ? WHERE id = ?')
			.run(name.trim(), description?.trim() || '', id);

		if (result.changes === 0) {
			return json({ error: 'Challenge not found' }, { status: 404 });
		}

		const updated = db.prepare('SELECT * FROM challenges WHERE id = ?').get(id);
		return json(updated);
	} catch (e: unknown) {
		if (e instanceof Error && e.message.includes('UNIQUE')) {
			return json({ error: 'A challenge with that name already exists' }, { status: 409 });
		}
		throw e;
	}
};

export const DELETE: RequestHandler = ({ params }) => {
	const id = Number(params.id);
	if (!id) return json({ error: 'Invalid id' }, { status: 400 });
	const db = getDb();
	db.prepare('DELETE FROM challenges WHERE id = ?').run(id);
	return json({ ok: true });
};
