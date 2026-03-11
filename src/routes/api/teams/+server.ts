import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const db = getDb();
	const teams = db.prepare('SELECT * FROM teams ORDER BY name').all();
	return json(teams);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, table_number, color } = await request.json();
	if (!name?.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}
	const db = getDb();
	const stmt = db.prepare('INSERT INTO teams (name, table_number, color) VALUES (?, ?, ?)');
	const result = stmt.run(name.trim(), (table_number ?? '').trim(), color || '#6750A4');
	return json({ id: result.lastInsertRowid, name, table_number: table_number ?? '', color }, { status: 201 });
};
