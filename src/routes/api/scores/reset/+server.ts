import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	const db = await getDb();
	await db.query('DELETE FROM score_events');
	return new Response(null, { status: 204 });
};
