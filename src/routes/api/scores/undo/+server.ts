import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

// DELETE /api/scores/undo?team_id=X&challenge_id=Y[&coach=Name]
// Removes the last score event for the team+challenge pair.
// When `coach` is provided, only that coach's last event is removed.
export const DELETE: RequestHandler = async ({ url }) => {
	const team_id = Number(url.searchParams.get('team_id'));
	const challenge_id = Number(url.searchParams.get('challenge_id'));
	const coach = url.searchParams.get('coach') || null;

	if (!team_id || !challenge_id) {
		return json({ error: 'team_id and challenge_id are required' }, { status: 400 });
	}

	const db = await getDb();
	let last: { id: number } | undefined;

	if (coach) {
		const result = await db.query<{ id: number }>(
			'SELECT id FROM score_events WHERE team_id = $1 AND challenge_id = $2 AND judge = $3 ORDER BY id DESC LIMIT 1',
			[team_id, challenge_id, coach]
		);
		last = result.rows[0];
	} else {
		const result = await db.query<{ id: number }>(
			'SELECT id FROM score_events WHERE team_id = $1 AND challenge_id = $2 ORDER BY id DESC LIMIT 1',
			[team_id, challenge_id]
		);
		last = result.rows[0];
	}

	if (!last) return json({ error: 'No events to undo' }, { status: 404 });
	await db.query('DELETE FROM score_events WHERE id = $1', [last.id]);
	return json({ ok: true, deleted_id: last.id });
};
