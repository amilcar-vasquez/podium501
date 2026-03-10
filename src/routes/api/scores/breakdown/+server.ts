import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export interface BreakdownRow {
	team_id: number;
	challenge_id: number;
	challenge_name: string;
	points: number;
}

// GET /api/scores/breakdown
// Returns the sum of score_events per team per challenge (only non-zero rows).
export const GET: RequestHandler = () => {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT
        se.team_id,
        c.id   AS challenge_id,
        c.name AS challenge_name,
        SUM(se.points) AS points
      FROM score_events se
      JOIN challenges c ON c.id = se.challenge_id
      GROUP BY se.team_id, se.challenge_id
      ORDER BY se.team_id, c.name ASC`
		)
		.all() as BreakdownRow[];

	return json(rows);
};
