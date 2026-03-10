<script lang="ts">
	import type { LeaderboardEntry } from '$lib/types';
	import confetti from 'canvas-confetti';
	import { onMount, onDestroy } from 'svelte';

	let entries: LeaderboardEntry[] = $state([]);
	let prevTotals: Map<number, number> = new Map();
	let flashSet: Set<number> = $state(new Set());
	let pollInterval: ReturnType<typeof setInterval>;
	let milestones = new Set<number>([100, 200, 500]);
	let reachedMilestones: Map<number, Set<number>> = new Map(); // team_id -> milestones hit

	const RANK_COLORS = ['#d89e00', '#938f99', '#cd7f32'];
	const RANK_EMOJI = ['🥇', '🥈', '🥉'];

	async function fetchLeaderboard() {
		try {
			const res = await fetch('/api/leaderboard');
			const data: LeaderboardEntry[] = await res.json();

			const newFlash = new Set<number>();

			for (const entry of data) {
				const prev = prevTotals.get(entry.team_id);
				if (prev !== undefined && prev !== entry.total) {
					newFlash.add(entry.team_id);
					checkMilestone(entry.team_id, prev, entry.total);
				}
				prevTotals.set(entry.team_id, entry.total);
			}

			entries = data;

			if (newFlash.size > 0) {
				flashSet = newFlash;
				setTimeout(() => {
					flashSet = new Set();
				}, 1200);
			}
		} catch {
			// Network error, ignore
		}
	}

	function checkMilestone(teamId: number, prev: number, next: number) {
		if (!reachedMilestones.has(teamId)) reachedMilestones.set(teamId, new Set());
		const reached = reachedMilestones.get(teamId)!;
		for (const m of milestones) {
			if (!reached.has(m) && prev < m && next >= m) {
				reached.add(m);
				triggerConfetti();
			}
		}
	}

	function triggerConfetti() {
		confetti({
			particleCount: 120,
			spread: 70,
			origin: { y: 0.6 },
			colors: ['#6750a4', '#e21b3c', '#1368ce', '#d89e00', '#26890c']
		});
	}

	onMount(() => {
		fetchLeaderboard();
		pollInterval = setInterval(fetchLeaderboard, 2000);
	});

	onDestroy(() => clearInterval(pollInterval));
</script>

<svelte:head>
	<title>Scoreboard — Podium501</title>
</svelte:head>

<div class="scoreboard">
	<div class="sb-header">
		<h1>🏆 Live Scoreboard</h1>
		<span class="pulse-dot" title="Live updates every 2s"></span>
	</div>

	{#if entries.length === 0}
		<div class="empty-state">
			<p>No teams yet. <a href="/admin">Add teams in Admin</a> and start scoring!</p>
		</div>
	{:else}
		<table class="leaderboard-table">
			<thead>
				<tr>
					<th class="col-rank">Rank</th>
					<th class="col-team">Team</th>
					<th class="col-school">School</th>
					<th class="col-score">Score</th>
				</tr>
			</thead>
			<tbody>
				{#each entries as entry (entry.team_id)}
					<tr class:score-updated={flashSet.has(entry.team_id)}>
						<td class="col-rank">
							<span class="rank-badge" style="color: {RANK_COLORS[entry.rank - 1] ?? '#e6e1e5'}">
								{RANK_EMOJI[entry.rank - 1] ?? entry.rank}
							</span>
						</td>
						<td class="col-team">
							<div class="team-name-wrap">
								<span class="team-dot" style="background: {entry.color};"></span>
								<span class="team-name">{entry.name}</span>
							</div>
						</td>
						<td class="col-school">{entry.school}</td>
						<td class="col-score">
							<span class="score-chip" style="background: {entry.color}22; border: 1px solid {entry.color}66;">
								{entry.total}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.scoreboard {
		max-width: 900px;
		margin: 0 auto;
	}

	.sb-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.sb-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #eaddff;
	}

	.pulse-dot {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		background: #26890c;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.4; transform: scale(0.8); }
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: var(--md-on-surface-variant);
		font-size: 1.1rem;
	}

	.leaderboard-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0 0.5rem;
	}

	thead th {
		text-align: left;
		padding: 0.5rem 1rem;
		color: var(--md-on-surface-variant);
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	tbody tr {
		background: #2b2930;
		border-radius: var(--radius-md);
		transition: background 0.2s;
	}

	tbody tr td:first-child {
		border-radius: var(--radius-md) 0 0 var(--radius-md);
	}

	tbody tr td:last-child {
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}

	tbody td {
		padding: 1rem;
		vertical-align: middle;
	}

	.col-rank {
		width: 5rem;
		text-align: center;
	}

	.col-school {
		color: var(--md-on-surface-variant);
		font-size: 0.95rem;
	}

	.col-score {
		width: 8rem;
		text-align: right;
	}

	.rank-badge {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.team-name-wrap {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.team-dot {
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.team-name {
		font-weight: 600;
		font-size: 1.05rem;
	}

	.score-chip {
		display: inline-block;
		padding: 0.35rem 0.9rem;
		border-radius: var(--radius-lg);
		font-size: 1.2rem;
		font-weight: 700;
	}

	/* override global flash with better colors */
	:global(.score-updated) {
		animation: rowFlash 1.2s ease-out !important;
	}

	@keyframes rowFlash {
		0% { background-color: #6750a466; }
		100% { background-color: #2b2930; }
	}
</style>
