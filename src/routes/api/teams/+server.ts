import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const db = await getDb();
	const { rows } = await db.query('SELECT * FROM teams ORDER BY name');
	return json(rows);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, table_number, color } = await request.json();
	if (!name?.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}
	const db = await getDb();
	try {
		const { rows } = await db.query(
			'INSERT INTO teams (name, table_number, color) VALUES ($1, $2, $3) RETURNING id, name, table_number, color',
			[name.trim(), (table_number ?? '').trim(), color || '#6750A4']
		);
		return json(rows[0], { status: 201 });
	} catch (e: unknown) {
		if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') {
			return json({ error: 'A team with that name already exists' }, { status: 409 });
		}
		throw e;
	}
};
