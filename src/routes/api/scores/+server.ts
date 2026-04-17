import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { team_id, challenge_id, points, coach } = await request.json();
	if (!team_id || !challenge_id || points === undefined) {
		return json({ error: 'team_id, challenge_id, and points are required' }, { status: 400 });
	}
	const db = await getDb();
	const { rows } = await db.query(
		'INSERT INTO score_events (team_id, challenge_id, points, judge) VALUES ($1, $2, $3, $4) RETURNING id',
		[Number(team_id), Number(challenge_id), Number(points), coach || 'Coach']
	);
	return json({ id: rows[0].id }, { status: 201 });
};
