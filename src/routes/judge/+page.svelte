<script lang="ts">
	import type { PageData } from './$types';
	import type { Team, Challenge } from '$lib/types';
	import Snackbar from '$lib/components/Snackbar.svelte';

	let { data }: { data: PageData } = $props();

	// eslint-disable-next-line svelte/state-referenced-locally
	let teams: Team[] = $state([...data.teams]);
	// eslint-disable-next-line svelte/state-referenced-locally
	let challenges: Challenge[] = $state([...data.challenges]);

	let selectedChallenge: Challenge | null = $state(null);
	let selectedTeam: Team | null = $state(null);
	let judgeName = $state('Judge');
	let step: 1 | 2 | 3 = $state(1);

	let snackbar: Snackbar;

	// Audio feedback
	function playBeep(type: 'add' | 'subtract') {
		try {
			const ctx = new AudioContext();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.frequency.value = type === 'add' ? 880 : 330;
			gain.gain.setValueAtTime(0.3, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
			osc.start(ctx.currentTime);
			osc.stop(ctx.currentTime + 0.3);
		} catch {
			// AudioContext not available
		}
	}

	const SCORE_BUTTONS = [
		{ label: '+10', points: 10, color: '#26890c' },
		{ label: '+20', points: 20, color: '#1368ce' },
		{ label: '+30', points: 30, color: '#6750a4' },
		{ label: '-10', points: -10, color: '#e21b3c' }
	];

	async function addScore(points: number) {
		if (!selectedTeam || !selectedChallenge) return;
		const res = await fetch('/api/scores', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				team_id: selectedTeam.id,
				challenge_id: selectedChallenge.id,
				points,
				judge: judgeName
			})
		});
		if (res.ok) {
			playBeep(points > 0 ? 'add' : 'subtract');
			snackbar.show(`${points > 0 ? '+' : ''}${points} pts → ${selectedTeam.name}`);
		}
	}

	async function undoLast() {
		if (!selectedTeam || !selectedChallenge) return;
		const res = await fetch(
			`/api/scores/undo?team_id=${selectedTeam.id}&challenge_id=${selectedChallenge.id}`,
			{ method: 'DELETE' }
		);
		if (res.ok) {
			snackbar.show('↩ Last score undone');
		} else {
			snackbar.show('Nothing to undo');
		}
	}

	function selectChallenge(c: Challenge) {
		selectedChallenge = c;
		step = 2;
	}

	function selectTeam(t: Team) {
		selectedTeam = t;
		step = 3;
	}

	function reset() {
		selectedChallenge = null;
		selectedTeam = null;
		step = 1;
	}
</script>

<svelte:head>
	<title>Judge — Podium501</title>
</svelte:head>

<div class="judge-page">
	<div class="header">
		<h1 class="page-title">⚖️ Judge</h1>
		<div class="field" style="max-width: 200px; margin-bottom: 0;">
			<label for="judge-name">Your name</label>
			<input id="judge-name" bind:value={judgeName} placeholder="Judge name" />
		</div>
	</div>

	<!-- Breadcrumb -->
	<div class="breadcrumb">
		<button onclick={reset} class:active={step === 1}>1. Challenge</button>
		<span>›</span>
		<button onclick={() => { if (step === 3) step = 2; }} class:active={step === 2} disabled={step < 2}>
			2. Team
		</button>
		<span>›</span>
		<button class:active={step === 3} disabled={step < 3}>3. Score</button>
	</div>

	<!-- Step 1: Select Challenge -->
	{#if step === 1}
		<section>
			<p class="step-hint">Select a challenge to judge:</p>
			{#if challenges.length === 0}
				<p class="empty">No challenges yet. <a href="/admin">Add one in Admin</a>.</p>
			{:else}
				<div class="grid">
					{#each challenges as c}
						<button class="pick-card" onclick={() => selectChallenge(c)}>
							<span class="pick-title">{c.name}</span>
							{#if c.description}
								<span class="pick-sub">{c.description}</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	<!-- Step 2: Select Team -->
	{#if step === 2}
		<section>
			<p class="step-hint">Challenge: <strong>{selectedChallenge?.name}</strong> — Select team:</p>
			{#if teams.length === 0}
				<p class="empty">No teams yet. <a href="/admin">Add one in Admin</a>.</p>
			{:else}
				<div class="grid">
					{#each teams as t}
						<button
							class="pick-card team-card"
							style="border-left: 6px solid {t.color};"
							onclick={() => selectTeam(t)}
						>
							<span class="pick-title">{t.name}</span>
							<span class="pick-sub">{t.school}</span>
						</button>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	<!-- Step 3: Score -->
	{#if step === 3}
		<section>
			<div class="score-context card">
				<div class="score-badge" style="background: {selectedTeam?.color};">
					{selectedTeam?.name[0]}
				</div>
				<div>
					<div class="score-team">{selectedTeam?.name}</div>
					<div class="score-school">{selectedTeam?.school}</div>
					<div class="score-challenge">📋 {selectedChallenge?.name}</div>
				</div>
			</div>

			<div class="score-buttons">
				{#each SCORE_BUTTONS as btn}
					<button
						class="score-btn"
						style="background: {btn.color};"
						onclick={() => addScore(btn.points)}
					>
						{btn.label}
					</button>
				{/each}
			</div>

			<button class="btn btn-secondary undo-btn" onclick={undoLast}>
				↩ Undo Last
			</button>
		</section>
	{/if}
</div>

<Snackbar bind:this={snackbar} />

<style>
	.judge-page {
		max-width: 600px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		font-size: 0.95rem;
	}

	.breadcrumb button {
		background: none;
		border: none;
		color: var(--md-on-surface-variant);
		font-family: inherit;
		font-size: inherit;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		transition: color 0.15s, background 0.15s;
	}

	.breadcrumb button.active {
		color: #eaddff;
		background: #3b3549;
		font-weight: 600;
	}

	.breadcrumb button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.step-hint {
		margin-bottom: 1rem;
		color: var(--md-on-surface-variant);
	}

	.step-hint strong {
		color: #eaddff;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.75rem;
	}

	.pick-card {
		background: #2b2930;
		border: 2px solid transparent;
		border-radius: var(--radius-md);
		padding: 1rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		text-align: left;
		transition: border-color 0.15s, transform 0.1s;
		color: var(--md-on-surface);
	}

	.pick-card:hover {
		border-color: var(--md-primary);
		transform: translateY(-2px);
	}

	.pick-title {
		font-weight: 600;
		font-size: 1rem;
	}

	.pick-sub {
		font-size: 0.8rem;
		color: var(--md-on-surface-variant);
	}

	.score-context {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.score-badge {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 700;
		color: #fff;
		flex-shrink: 0;
	}

	.score-team {
		font-size: 1.15rem;
		font-weight: 700;
		color: #eaddff;
	}

	.score-school {
		font-size: 0.875rem;
		color: var(--md-on-surface-variant);
	}

	.score-challenge {
		font-size: 0.875rem;
		color: var(--md-on-surface-variant);
		margin-top: 0.2rem;
	}

	.score-buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.score-btn {
		font-family: inherit;
		font-size: 2rem;
		font-weight: 700;
		color: #fff;
		border: none;
		border-radius: var(--radius-md);
		padding: 2rem 1rem;
		cursor: pointer;
		transition: filter 0.15s, transform 0.1s;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	}

	.score-btn:hover {
		filter: brightness(1.15);
	}

	.score-btn:active {
		transform: scale(0.94);
	}

	.undo-btn {
		width: 100%;
		font-size: 1.1rem;
		padding: 1rem;
	}

	.empty {
		color: var(--md-on-surface-variant);
		padding: 2rem;
		text-align: center;
	}
</style>
