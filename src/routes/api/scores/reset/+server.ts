import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = () => {
	const db = getDb();
	db.prepare('DELETE FROM score_events').run();
	return new Response(null, { status: 204 });
};
