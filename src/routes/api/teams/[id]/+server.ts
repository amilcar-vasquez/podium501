import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = ({ params }) => {
	const id = Number(params.id);
	if (!id) return json({ error: 'Invalid id' }, { status: 400 });
	const db = getDb();
	db.prepare('DELETE FROM teams WHERE id = ?').run(id);
	return json({ ok: true });
};
