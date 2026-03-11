<script lang="ts">
	import type { LeaderboardEntry } from '$lib/types';
	import { onMount, onDestroy } from 'svelte';
	import { triggerScoreConfetti, triggerMilestoneConfetti } from '$lib/utils/confetti';
	import { animateValue } from '$lib/utils/scoreAnimation';
	import ScorePopup from '$lib/components/ScorePopup.svelte';

	interface ChallengeScore {
		challenge_id: number;
		challenge_name: string;
		points: number;
	}

	interface DisplayEntry extends LeaderboardEntry {
		displayTotal: number;
		delta: number | null;
		flash: boolean;
		popupKey: number;
		challenges: ChallengeScore[];
	}

	let displayEntries: DisplayEntry[] = $state([]);
	let prevTotals = new Map<number, number>();
	let reachedMilestones = new Map<number, Set<number>>();
	let pollInterval: ReturnType<typeof setInterval>;
	let milestoneBanner: string | null = $state(null);

	// Wide-screen two-column layout
	let isWide = $state(false);
	let mq: MediaQueryList;
	let mqHandler: (e: MediaQueryListEvent) => void;
	let colSplit = $derived(Math.ceil(displayEntries.length / 2));
	let colA = $derived(displayEntries.slice(0, colSplit));
	let colB = $derived(displayEntries.slice(colSplit));
	let useTwoCols = $derived(isWide && displayEntries.length >= 4);

	const MILESTONES = [100, 200, 300, 500];
	const RANK_COLORS = ['#d89e00', '#938f99', '#cd7f32'];
	const RANK_ICONS = ['emoji_events', 'workspace_premium', 'military_tech'];

	async function fetchLeaderboard() {
		try {
			const [res, bRes] = await Promise.all([
				fetch('/api/leaderboard'),
				fetch('/api/scores/breakdown')
			]);
			const serverData: LeaderboardEntry[] = await res.json();
			const breakdown: ChallengeScore[] & { team_id: number }[] = await bRes.json();

			// Group breakdown by team_id
			const bMap = new Map<number, ChallengeScore[]>();
			for (const row of breakdown) {
				if (!bMap.has(row.team_id)) bMap.set(row.team_id, []);
				bMap.get(row.team_id)!.push({
					challenge_id: row.challenge_id,
					challenge_name: row.challenge_name,
					points: row.points
				});
			}

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
						popupKey: 0,
						challenges: bMap.get(entry.team_id) ?? []
					});
				} else {
					existing.rank = entry.rank;
					existing.name = entry.name;
					existing.school = entry.school;
					existing.color = entry.color;
					existing.total = entry.total;
					existing.challenges = bMap.get(entry.team_id) ?? [];

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
					milestoneBanner = `Milestone Reached! ${m}+ points!`;
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
		mq = window.matchMedia('(min-width: 1920px)');
		isWide = mq.matches;
		mqHandler = (e) => { isWide = e.matches; };
		mq.addEventListener('change', mqHandler);
	});

	onDestroy(() => {
		clearInterval(pollInterval);
		mq?.removeEventListener('change', mqHandler);
	});
</script>

<svelte:head>
	<title>Scoreboard — Podium501</title>
</svelte:head>

<div class="scoreboard">
	<div class="sb-header">
		<h1><span class="material-icons" style="vertical-align:middle;font-size:2rem">leaderboard</span> Live Scoreboard</h1>
		<span class="pulse-dot" title="Live updates every 2s"></span>
	</div>

	{#if milestoneBanner}
		<div class="milestone-banner" role="status">
			<span class="material-icons" style="vertical-align:middle;font-size:1.2rem">emoji_events</span> {milestoneBanner}
		</div>
	{/if}

	{#snippet tableHead()}
		<thead>
			<tr>
				<th class="col-rank">Rank</th>
				<th class="col-team">Team</th>
				<th class="col-challenges">By Challenge</th>
				<th class="col-score">Score</th>
			</tr>
		</thead>
	{/snippet}

	{#snippet tableRows(entries: DisplayEntry[])}
		{#each entries as entry (entry.team_id)}
			<tr class="team-row" class:score-updated={entry.flash} style="--tc: {entry.color}">
				<td class="col-rank">
					<span class="rank-badge" style="color: {RANK_COLORS[entry.rank - 1] ?? '#e6e1e5'}">
					{#if entry.rank <= 3}
						<span class="material-icons rank-icon">{RANK_ICONS[entry.rank - 1]}</span>
					{:else}
						{entry.rank}
					{/if}
					</span>
				</td>
				<td class="col-team">
					<div class="team-name-wrap">
						<span class="team-dot" style="background: {entry.color};"></span>
						<span class="team-name">{entry.name}</span>
					</div>
				</td>
				<td class="col-challenges">
					{#if entry.challenges.length > 0}
						<div class="challenge-pills">
							{#each entry.challenges as cs}
								<span class="challenge-pill" class:pill-neg={cs.points < 0}>
									<span class="pill-name">{cs.challenge_name}</span>
									<span class="pill-pts">{cs.points > 0 ? '+' : ''}{cs.points}</span>
								</span>
							{/each}
						</div>
					{:else}
						<span class="no-scores">—</span>
					{/if}
				</td>
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
	{/snippet}

	{#if displayEntries.length === 0}
		<div class="empty-state">
			<p>No teams yet. <a href="/admin">Add teams in Admin</a> and start scoring!</p>
		</div>
	{:else if useTwoCols}
		<div class="sb-two-col">
			<table class="leaderboard-table">
				{@render tableHead()}
				<tbody>{@render tableRows(colA)}</tbody>
			</table>
			<table class="leaderboard-table">
				{@render tableHead()}
				<tbody>{@render tableRows(colB)}</tbody>
			</table>
		</div>
	{:else}
		<table class="leaderboard-table">
			{@render tableHead()}
			<tbody>{@render tableRows(displayEntries)}</tbody>
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

	.team-row {
		background: color-mix(in srgb, var(--tc, transparent) 7%, #2b2930);
		border-radius: var(--radius-md);
		transition: background 0.3s;
	}

	.team-row td:first-child {
		border-radius: var(--radius-md) 0 0 var(--radius-md);
		border-left: 3px solid color-mix(in srgb, var(--tc, #49454f) 55%, transparent);
	}

	.team-row td:last-child {
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

	.col-challenges {
		padding-right: 0.5rem;
	}

	.challenge-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.challenge-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: #3a3640;
		border: 1px solid #534e5e;
		border-radius: var(--radius-sm);
		padding: 0.2rem 0.55rem;
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.challenge-pill.pill-neg {
		border-color: #e21b3c55;
	}

	.pill-name {
		color: var(--md-on-surface-variant);
	}

	.pill-pts {
		font-weight: 700;
		color: #eaddff;
	}

	.challenge-pill.pill-neg .pill-pts {
		color: #e21b3c;
	}

	.no-scores {
		color: var(--md-outline);
	}

	.col-score {
		width: 9rem;
		text-align: right;
	}

	.rank-badge {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.rank-icon {
		font-size: 1.3rem;
		vertical-align: middle;
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

	/* ===== LARGE-SCREEN BREAKPOINTS ===== */

	/* Two-column grid (activated via JS matchMedia at ≥ 1920 px) */
	.sb-two-col {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3rem;
		align-items: start;
	}

	/* 1400 px – large desktop / small TV */
	@media (min-width: 1400px) {
		.scoreboard { max-width: 1400px; }
		.sb-header h1 { font-size: 2.5rem; }
		tbody td { padding: 1.1rem 1.25rem; }
		.team-name { font-size: 1.2rem; }
		.score-chip { font-size: 1.4rem; }
		.rank-badge { font-size: 1.8rem; }
		.rank-icon { font-size: 1.6rem; }
		.team-dot { width: 1rem; height: 1rem; }
		.challenge-pill { font-size: 0.85rem; padding: 0.25rem 0.65rem; }
	}

	/* 1920 px – Full HD TV / projector */
	@media (min-width: 1920px) {
		.scoreboard { max-width: 100%; padding: 0 3rem 2rem; }
		.sb-header { margin-bottom: 2rem; justify-content: center; gap: 1.25rem; }
		.sb-header h1 { font-size: 3.5rem; }
		.pulse-dot { width: 1.1rem; height: 1.1rem; }
		thead th { font-size: 1rem; padding: 0.75rem 1.5rem; letter-spacing: 0.07em; }
		tbody td { padding: 1.4rem 1.5rem; }
		.leaderboard-table { border-spacing: 0 0.6rem; }
		.team-name { font-size: 1.5rem; }
		.score-chip { font-size: 1.9rem; padding: 0.4rem 1.2rem; }
		.rank-badge { font-size: 2.2rem; }
		.rank-icon { font-size: 2rem; }
		.col-rank { width: 6rem; }
		.col-score { width: 12rem; }
		.team-dot { width: 1.2rem; height: 1.2rem; }
		.challenge-pill { font-size: 0.9rem; padding: 0.3rem 0.75rem; }
		.milestone-banner { font-size: 2.5rem; padding: 1.25rem 2.5rem; }
	}

	/* 2560 px – QHD / large-format TV */
	@media (min-width: 2560px) {
		.sb-header { margin-bottom: 2.5rem; }
		.sb-header h1 { font-size: 5rem; }
		.pulse-dot { width: 1.4rem; height: 1.4rem; }
		thead th { font-size: 1.2rem; padding: 1rem 2rem; }
		tbody td { padding: 1.8rem 2rem; }
		.leaderboard-table { border-spacing: 0 0.75rem; }
		.team-name { font-size: 2rem; }
		.score-chip { font-size: 2.6rem; padding: 0.5rem 1.5rem; }
		.rank-badge { font-size: 3rem; }
		.rank-icon { font-size: 2.75rem; }
		.col-rank { width: 8rem; }
		.col-score { width: 15rem; }
		.team-dot { width: 1.5rem; height: 1.5rem; }
		.challenge-pill { font-size: 1.1rem; padding: 0.4rem 1rem; }
		.milestone-banner { font-size: 3.5rem; padding: 1.5rem 3rem; }
		.sb-two-col { gap: 5rem; }
	}

	/* 3840 px – 4K / LED video wall */
	@media (min-width: 3840px) {
		.sb-header { margin-bottom: 3.5rem; }
		.sb-header h1 { font-size: 7.5rem; }
		.pulse-dot { width: 1.75rem; height: 1.75rem; }
		thead th { font-size: 1.75rem; padding: 1.5rem 3rem; }
		tbody td { padding: 2.5rem 3rem; }
		.leaderboard-table { border-spacing: 0 1rem; }
		.team-name { font-size: 3rem; }
		.score-chip { font-size: 3.75rem; padding: 0.75rem 2rem; }
		.rank-badge { font-size: 4.5rem; }
		.rank-icon { font-size: 4.25rem; }
		.col-rank { width: 12rem; }
		.col-score { width: 22rem; }
		.team-dot { width: 2rem; height: 2rem; }
		.challenge-pill { font-size: 1.5rem; padding: 0.5rem 1.25rem; }
		.milestone-banner { font-size: 5.5rem; padding: 2.5rem 5rem; border-radius: 2rem; }
		.sb-two-col { gap: 8rem; }
	}
</style>

