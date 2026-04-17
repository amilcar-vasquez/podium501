import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

type ExportRow = {
	team: string;
	table_number: string;
	challenge: string;
	points: number;
	judge: string;
	created_at: string;
};

export const GET: RequestHandler = async () => {
	const db = await getDb();
	const result = await db.query<ExportRow>(
		`SELECT
        t.name   AS team,
        t.table_number,
        c.name   AS challenge,
        se.points,
        se.judge,
        TO_CHAR(se.created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at
      FROM score_events se
      JOIN teams      t ON t.id = se.team_id
      JOIN challenges c ON c.id = se.challenge_id
      ORDER BY se.created_at ASC`
	);
	const rows = result.rows as ExportRow[];

	const header = 'Team,Table,Challenge,Points,Coach,Created At\n';
	const body = rows
		.map(
			(r: ExportRow) =>
				`"${r.team}","${r.table_number}","${r.challenge}",${r.points},"${r.judge}","${r.created_at}"`
		)
		.join('\n');

	return new Response(header + body, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': 'attachment; filename="podium501-scores.csv"'
		}
	});
};
