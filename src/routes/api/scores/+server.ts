import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { team_id, challenge_id, points, judge } = await request.json();
	if (!team_id || !challenge_id || points === undefined) {
		return json({ error: 'team_id, challenge_id, and points are required' }, { status: 400 });
	}
	const db = getDb();
	const stmt = db.prepare(
		'INSERT INTO score_events (team_id, challenge_id, points, judge) VALUES (?, ?, ?, ?)'
	);
	const result = stmt.run(Number(team_id), Number(challenge_id), Number(points), judge || 'Judge');
	return json({ id: result.lastInsertRowid }, { status: 201 });
};
