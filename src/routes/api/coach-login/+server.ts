import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

// Hardcoded fallback for local development.
// In production, set COACH_PINS_JSON env var: {"PIN":"Name", ...}
const DEV_PINS: Record<string, string> = {
	'2346': 'Amilcar',
	'1000': 'Myron',
	'1001': 'Coach Dulce',
	'1002': 'Namrita',
	'1003': 'Coach Carlos'
};

function loadCoachPins(): Record<string, string> {
	if (env.COACH_PINS_JSON) {
		try {
			return JSON.parse(env.COACH_PINS_JSON);
		} catch {
			console.error('Invalid COACH_PINS_JSON — falling back to dev PINs');
		}
	}
	return DEV_PINS;
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

	const coachName = loadCoachPins()[pin];
	if (!coachName) {
		return json({ success: false, error: 'Invalid PIN' }, { status: 401 });
	}

	return json({ success: true, coachName });
};
