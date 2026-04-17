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

	const db = await getDb();
	try {
		const result = await db.query(
			'UPDATE challenges SET name = $1, description = $2 WHERE id = $3 RETURNING *',
			[name.trim(), description?.trim() || '', id]
		);

		if (result.rowCount === 0) {
			return json({ error: 'Challenge not found' }, { status: 404 });
		}
		return json(result.rows[0]);
	} catch (e: unknown) {
		if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') {
			return json({ error: 'A challenge with that name already exists' }, { status: 409 });
		}
		throw e;
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!id) return json({ error: 'Invalid id' }, { status: 400 });
	const db = await getDb();
	await db.query('DELETE FROM challenges WHERE id = $1', [id]);
	return json({ ok: true });
};
