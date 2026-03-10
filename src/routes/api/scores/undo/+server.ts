import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

// DELETE /api/scores/undo?team_id=X&challenge_id=Y[&judge=Name]
// Removes the last score event for the team+challenge pair.
// When `judge` is provided, only that judge's last event is removed.
export const DELETE: RequestHandler = ({ url }) => {
	const team_id = Number(url.searchParams.get('team_id'));
	const challenge_id = Number(url.searchParams.get('challenge_id'));
	const judge = url.searchParams.get('judge') || null;

	if (!team_id || !challenge_id) {
		return json({ error: 'team_id and challenge_id are required' }, { status: 400 });
	}

	const db = getDb();
	let last: { id: number } | undefined;

	if (judge) {
		last = db
			.prepare(
				'SELECT id FROM score_events WHERE team_id = ? AND challenge_id = ? AND judge = ? ORDER BY id DESC LIMIT 1'
			)
			.get(team_id, challenge_id, judge) as { id: number } | undefined;
	} else {
		last = db
			.prepare(
				'SELECT id FROM score_events WHERE team_id = ? AND challenge_id = ? ORDER BY id DESC LIMIT 1'
			)
			.get(team_id, challenge_id) as { id: number } | undefined;
	}

	if (!last) return json({ error: 'No events to undo' }, { status: 404 });
	db.prepare('DELETE FROM score_events WHERE id = ?').run(last.id);
	return json({ ok: true, deleted_id: last.id });
};
