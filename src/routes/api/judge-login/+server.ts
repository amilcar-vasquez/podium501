import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Judge PIN registry — update these before each event.
// For production deployments, consider moving PINs to an environment variable.
const JUDGE_PINS: Record<string, string> = {
	'2346': 'Amilcar',
	'1000': 'Myron',
	'1001': 'Coach Dulce' ,
    '1002': 'Namrita',
    '1003': 'Coach Carlos',
};

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

	const judgeName = JUDGE_PINS[pin];
	if (!judgeName) {
		return json({ success: false, error: 'Invalid PIN' }, { status: 401 });
	}

	return json({ success: true, judgeName });
};
