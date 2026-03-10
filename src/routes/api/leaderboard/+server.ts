import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT
        t.id   AS team_id,
        t.name,
        t.school,
        t.color,
        COALESCE(SUM(se.points), 0) AS total
      FROM teams t
      LEFT JOIN score_events se ON se.team_id = t.id
      GROUP BY t.id
      ORDER BY total DESC, t.name ASC`
		)
		.all() as Array<{
		team_id: number;
		name: string;
		school: string;
		color: string;
		total: number;
	}>;

	const leaderboard = rows.map((r, i) => ({ ...r, rank: i + 1 }));
	return json(leaderboard);
};
