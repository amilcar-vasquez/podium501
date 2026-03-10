import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const db = getDb();
	const teams = db.prepare('SELECT * FROM teams ORDER BY name').all();
	return json(teams);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, school, color } = await request.json();
	if (!name?.trim() || !school?.trim()) {
		return json({ error: 'name and school are required' }, { status: 400 });
	}
	const db = getDb();
	const stmt = db.prepare('INSERT INTO teams (name, school, color) VALUES (?, ?, ?)');
	const result = stmt.run(name.trim(), school.trim(), color || '#6750A4');
	return json({ id: result.lastInsertRowid, name, school, color }, { status: 201 });
};
