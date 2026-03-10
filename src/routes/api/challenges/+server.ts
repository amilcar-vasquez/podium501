import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const db = getDb();
	const challenges = db.prepare('SELECT * FROM challenges ORDER BY name').all();
	return json(challenges);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, description } = await request.json();
	if (!name?.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}
	const db = getDb();
	const stmt = db.prepare('INSERT INTO challenges (name, description) VALUES (?, ?)');
	const result = stmt.run(name.trim(), description?.trim() || '');
	return json({ id: result.lastInsertRowid, name, description }, { status: 201 });
};
