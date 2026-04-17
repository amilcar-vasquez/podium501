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
		return json({
			success: true,
			coachName: staticName,
			teamIds: [],
			teamNames: [],
			teamId: null,
			teamName: null,
			role: 'admin'
		});
	}

	// 2. Check coaches table
	const db = getDb();
	const coach = db
		.prepare(
			`SELECT
				c.name,
				c.team_id AS legacy_team_id,
				c.role,
				legacy_team.name AS legacy_team_name,
				COALESCE(GROUP_CONCAT(ct.team_id), '') AS team_ids_csv,
				COALESCE(GROUP_CONCAT(t.name), '') AS team_names_csv
       FROM coaches c
	       LEFT JOIN teams legacy_team ON legacy_team.id = c.team_id
	       LEFT JOIN coach_teams ct ON ct.coach_id = c.id
	       LEFT JOIN teams t ON t.id = ct.team_id
       WHERE c.pin = ?`
		)
		.get(pin) as
			| {
					name: string;
					legacy_team_id: number | null;
					role: string;
					legacy_team_name: string | null;
					team_ids_csv: string;
					team_names_csv: string;
			  }
			| undefined;

	if (!coach) {
		return json({ success: false, error: 'Invalid PIN' }, { status: 401 });
	}

	let teamIds = coach.team_ids_csv
		? coach.team_ids_csv
				.split(',')
				.map((v) => Number(v.trim()))
				.filter((v) => Number.isInteger(v) && v > 0)
		: [];
	let teamNames = coach.team_names_csv
		? coach.team_names_csv
				.split(',')
				.map((v) => v.trim())
				.filter(Boolean)
		: [];

	if (teamIds.length === 0 && coach.legacy_team_id) {
		teamIds = [coach.legacy_team_id];
		teamNames = coach.legacy_team_name ? [coach.legacy_team_name] : [];
	}

	return json({
		success: true,
		coachName: coach.name,
		teamIds,
		teamNames,
		teamId: teamIds[0] ?? null,
		teamName: teamNames[0] ?? null,
		role: coach.role
	});
};
