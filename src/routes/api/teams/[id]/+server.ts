import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!id) return json({ error: 'Invalid id' }, { status: 400 });

	const { name, table_number, color } = await request.json();
	if (!name?.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}

	const db = await getDb();
	try {
		const result = await db.query(
			'UPDATE teams SET name = $1, table_number = $2, color = $3 WHERE id = $4 RETURNING *',
			[name.trim(), (table_number ?? '').trim(), color || '#6750A4', id]
		);

		if (result.rowCount === 0) {
			return json({ error: 'Team not found' }, { status: 404 });
		}
		return json(result.rows[0]);
	} catch (e: unknown) {
		if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') {
			return json({ error: 'A team with that name already exists' }, { status: 409 });
		}
		throw e;
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!id) return json({ error: 'Invalid id' }, { status: 400 });
	const db = await getDb();
	await db.query('DELETE FROM teams WHERE id = $1', [id]);
	return json({ ok: true });
};
