export interface Team {
	id: number;
	name: string;
	table_number: string;
	color: string;
}

export interface Challenge {
	id: number;
	name: string;
	description: string;
}

export interface Coach {
	id: number;
	name: string;
	pin: string;
	team_id: number | null;
	team_name: string | null;
	role: 'coach' | 'admin';
}

export interface ScoreEvent {
	id: number;
	team_id: number;
	challenge_id: number;
	points: number;
	coach: string;
	created_at: string;
}

export interface LeaderboardEntry {
	rank: number;
	team_id: number;
	name: string;
	table_number: string;
	color: string;
	total: number;
}
