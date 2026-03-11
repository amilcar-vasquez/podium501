import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';
import type { Database } from 'better-sqlite3';

function generatePin(db: Database): string {
	for (let i = 0; i < 20; i++) {
		const pin = String(Math.floor(1000 + Math.random() * 9000));
		const existing = db.prepare('SELECT id FROM coaches WHERE pin = ?').get(pin);
		if (!existing) return pin;
	}
	throw new Error('Could not generate a unique PIN');
}

export const GET: RequestHandler = () => {
	const db = getDb();
	const coaches = db
		.prepare(
			`SELECT c.id, c.name, c.pin, c.team_id, c.role, t.name AS team_name
       FROM coaches c
       LEFT JOIN teams t ON t.id = c.team_id
       ORDER BY c.name ASC`
		)
		.all();
	return json(coaches);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, team_id, role } = await request.json();
	if (!name?.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}
	const safeRole = role === 'admin' ? 'admin' : 'coach';
	const db = getDb();
	const pin = generatePin(db);
	try {
		const result = db
			.prepare('INSERT INTO coaches (name, pin, team_id, role) VALUES (?, ?, ?, ?)')
			.run(name.trim(), pin, team_id ?? null, safeRole);
		const teamRow = team_id
			? (db.prepare('SELECT name FROM teams WHERE id = ?').get(team_id) as { name: string } | undefined)
			: undefined;
		return json(
			{
				id: result.lastInsertRowid,
				name: name.trim(),
				pin,
				team_id: team_id ?? null,
				team_name: teamRow?.name ?? null,
				role: safeRole
			},
			{ status: 201 }
		);
	} catch (e: unknown) {
		if (e instanceof Error && e.message.includes('UNIQUE')) {
			return json({ error: 'That team already has a coach assigned' }, { status: 409 });
		}
		throw e;
	}
};
