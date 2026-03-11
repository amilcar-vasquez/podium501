import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

// Static admin/override PINs loaded from env var (backwards compat + admin access).
// In production set COACH_PINS_JSON: {"PIN":"Name", ...}
// DEV_ADMIN_PIN is a fallback for local development when no env var is set.
const DEV_ADMIN_PIN = '2346';
const DEV_ADMIN_NAME = 'Admin';

function loadStaticPins(): Record<string, string> {
	if (env.COACH_PINS_JSON) {
		try {
			return JSON.parse(env.COACH_PINS_JSON);
		} catch {
			console.error('Invalid COACH_PINS_JSON');
		}
	}
	// Only use dev fallback when no env override is configured
	return { [DEV_ADMIN_PIN]: DEV_ADMIN_NAME };
}

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid request body' }, { status: 400 });
	}

	const b = body as Record<string, unknown>;
	if (!b || typeof b.pin !== 'string') {
		return json({ success: false, error: 'PIN required' }, { status: 400 });
	}

	const pin = b.pin.trim();

	// Accept only short numeric PINs to prevent enumeration abuse
	if (!/^\d{1,8}$/.test(pin)) {
		return json({ success: false, error: 'Invalid PIN' }, { status: 401 });
	}

	// 1. Check static env-var pins (admin / master access — no team assignment)
	const staticName = loadStaticPins()[pin];
	if (staticName) {
		return json({ success: true, coachName: staticName, teamId: null, teamName: null, role: 'admin' });
	}

	// 2. Check coaches table
	const db = getDb();
	const coach = db
		.prepare(
			`SELECT c.name, c.team_id, c.role, t.name AS team_name
       FROM coaches c
       LEFT JOIN teams t ON t.id = c.team_id
       WHERE c.pin = ?`
		)
		.get(pin) as { name: string; team_id: number | null; role: string; team_name: string | null } | undefined;

	if (!coach) {
		return json({ success: false, error: 'Invalid PIN' }, { status: 401 });
	}

	return json({ success: true, coachName: coach.name, teamId: coach.team_id, teamName: coach.team_name, role: coach.role });
};
