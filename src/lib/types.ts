export interface Team {
	id: number;
	name: string;
	school: string;
	color: string;
}

export interface Challenge {
	id: number;
	name: string;
	description: string;
}

export interface ScoreEvent {
	id: number;
	team_id: number;
	challenge_id: number;
	points: number;
	judge: string;
	created_at: string;
}

export interface LeaderboardEntry {
	rank: number;
	team_id: number;
	name: string;
	school: string;
	color: string;
	total: number;
}
