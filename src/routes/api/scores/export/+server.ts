import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT
        t.name   AS team,
        t.school,
        c.name   AS challenge,
        se.points,
        se.judge,
        se.created_at
      FROM score_events se
      JOIN teams      t ON t.id = se.team_id
      JOIN challenges c ON c.id = se.challenge_id
      ORDER BY se.created_at ASC`
		)
		.all() as Array<{
		team: string;
		school: string;
		challenge: string;
		points: number;
		judge: string;
		created_at: string;
	}>;

	const header = 'Team,School,Challenge,Points,Judge,Created At\n';
	const body = rows
		.map(
			(r) =>
				`"${r.team}","${r.school}","${r.challenge}",${r.points},"${r.judge}","${r.created_at}"`
		)
		.join('\n');

	return new Response(header + body, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': 'attachment; filename="podium501-scores.csv"'
		}
	});
};
