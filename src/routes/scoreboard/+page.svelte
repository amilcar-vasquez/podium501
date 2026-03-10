<script lang="ts">
	import type { LeaderboardEntry } from '$lib/types';
	import { onMount, onDestroy } from 'svelte';
	import { triggerScoreConfetti, triggerMilestoneConfetti } from '$lib/utils/confetti';
	import { animateValue } from '$lib/utils/scoreAnimation';
	import ScorePopup from '$lib/components/ScorePopup.svelte';

	interface DisplayEntry extends LeaderboardEntry {
		displayTotal: number;
		delta: number | null;
		flash: boolean;
		popupKey: number;
	}

	let displayEntries: DisplayEntry[] = $state([]);
	let prevTotals = new Map<number, number>();
	let reachedMilestones = new Map<number, Set<number>>();
	let pollInterval: ReturnType<typeof setInterval>;
	let milestoneBanner: string | null = $state(null);

	const MILESTONES = [100, 200, 300, 500];
	const RANK_COLORS = ['#d89e00', '#938f99', '#cd7f32'];
	const RANK_EMOJI = ['🥇', '🥈', '🥉'];

	async function fetchLeaderboard() {
		try {
			const res = await fetch('/api/leaderboard');
			const serverData: LeaderboardEntry[] = await res.json();

			for (const entry of serverData) {
				const prev = prevTotals.get(entry.team_id);
				const didChange = prev !== undefined && prev !== entry.total;
				const existing = displayEntries.find((e) => e.team_id === entry.team_id);

				if (!existing) {
					displayEntries.push({
						...entry,
						displayTotal: entry.total,
						delta: null,
						flash: false,
						popupKey: 0
					});
				} else {
					existing.rank = entry.rank;
					existing.name = entry.name;
					existing.school = entry.school;
					existing.color = entry.color;
					existing.total = entry.total;

					if (didChange) {
						const from = existing.displayTotal;
						const to = entry.total;
						existing.delta = to - prev!;
						existing.flash = true;
						existing.popupKey += 1;

						animateValue(from, to, 600, (v) => {
							existing.displayTotal = v;
						});
						triggerScoreConfetti();
						checkMilestone(entry.team_id, prev!, to);

						const tid = entry.team_id;
						setTimeout(() => {
							const e = displayEntries.find((x) => x.team_id === tid);
							if (e) {
								e.flash = false;
								e.delta = null;
							}
						}, 1200);
					}
				}

				prevTotals.set(entry.team_id, entry.total);
			}

			// Remove entries no longer on the server
			const serverIds = new Set(serverData.map((e) => e.team_id));
			for (let i = displayEntries.length - 1; i >= 0; i--) {
				if (!serverIds.has(displayEntries[i].team_id)) displayEntries.splice(i, 1);
			}

			// Keep rows ordered by current rank
			displayEntries.sort((a, b) => a.rank - b.rank);
		} catch {
			// Network error — keep current display
		}
	}

	function checkMilestone(teamId: number, prev: number, next: number) {
		if (!reachedMilestones.has(teamId)) reachedMilestones.set(teamId, new Set());
		const reached = reachedMilestones.get(teamId)!;
		for (const m of MILESTONES) {
			if (!reached.has(m) && prev < m && next >= m) {
				reached.add(m);
				triggerMilestoneConfetti();
				milestoneBanner = `🏆 Milestone Reached! ${m}+ points!`;
				setTimeout(() => {
					milestoneBanner = null;
				}, 3000);
				break; // show one milestone banner at a time
			}
		}
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

	{#if milestoneBanner}
		<div class="milestone-banner" role="status">
			{milestoneBanner}
		</div>
	{/if}

	{#if displayEntries.length === 0}
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
				{#each displayEntries as entry (entry.team_id)}
					<tr class:score-updated={entry.flash}>
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
							<div class="score-wrap">
								<span
									class="score-chip"
									class:chip-pop={entry.flash}
									style="background: {entry.color}22; border: 1px solid {entry.color}66;"
								>
									{entry.displayTotal}
								</span>
								{#if entry.delta !== null}
									{#key entry.popupKey}
										<ScorePopup delta={entry.delta} />
									{/key}
								{/if}
							</div>
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
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.4;
			transform: scale(0.8);
		}
	}

	.milestone-banner {
		text-align: center;
		background: linear-gradient(135deg, #6750a4, #1368ce);
		color: white;
		font-size: 1.3rem;
		font-weight: 700;
		padding: 0.75rem 1.5rem;
		border-radius: var(--radius-md);
		margin-bottom: 1rem;
		animation: bannerSlide 0.4s ease-out;
	}

	@keyframes bannerSlide {
		from {
			transform: translateY(-16px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
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
		transition: background 0.3s;
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
		width: 9rem;
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

	/* Score cell — needs relative positioning for the floating popup */
	.score-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
	}

	.score-chip {
		display: inline-block;
		padding: 0.35rem 0.9rem;
		border-radius: var(--radius-lg);
		font-size: 1.2rem;
		font-weight: 700;
	}

	/* Score chip springs up when a new score arrives */
	.score-chip.chip-pop {
		animation: chipPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes chipPop {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.2);
		}
		100% {
			transform: scale(1);
		}
	}

	/* Override the global .score-updated flash with a richer glow animation */
	:global(.score-updated) {
		animation: rowFlash 1.2s ease-out !important;
	}

	@keyframes rowFlash {
		0% {
			background-color: #6750a466;
			box-shadow: 0 0 28px #6750a444;
		}
		60% {
			box-shadow: 0 0 10px #6750a422;
		}
		100% {
			background-color: #2b2930;
			box-shadow: none;
		}
	}
</style>

