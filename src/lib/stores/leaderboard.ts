import { writable } from 'svelte/store';
import type { LeaderboardEntry } from '$lib/types';

export const leaderboard = writable<LeaderboardEntry[]>([]);
export const lastUpdated = writable<number>(0);
