import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const db = await getDb();
	const { rows } = await db.query('SELECT * FROM challenges ORDER BY name');
	return json(rows);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, description } = await request.json();
	if (!name?.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}
	const db = await getDb();
	try {
		const { rows } = await db.query(
			'INSERT INTO challenges (name, description) VALUES ($1, $2) RETURNING id, name, description',
			[name.trim(), description?.trim() || '']
		);
		return json(rows[0], { status: 201 });
	} catch (e: unknown) {
		if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') {
			return json({ error: 'A challenge with that name already exists' }, { status: 409 });
		}
		throw e;
	}
};
