import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

type LeaderboardRow = {
	team_id: number;
	name: string;
	table_number: string;
	color: string;
	total: number;
};

export const GET: RequestHandler = async () => {
	const db = await getDb();
	const result = await db.query<LeaderboardRow>(
		`SELECT
        t.id   AS team_id,
        t.name,
        t.table_number,
        t.color,
        COALESCE(SUM(se.points), 0)::int AS total
      FROM teams t
      LEFT JOIN score_events se ON se.team_id = t.id
      GROUP BY t.id, t.name, t.table_number, t.color
      ORDER BY total DESC, t.name ASC`
	);

	const rows = result.rows as LeaderboardRow[];
	const leaderboard = rows.map((r: LeaderboardRow, i: number) => ({ ...r, rank: i + 1 }));
	return json(leaderboard);
};
