<script lang="ts">
	import type { PageData } from './$types';
	import type { Team, Challenge } from '$lib/types';
	import Snackbar from '$lib/components/Snackbar.svelte';

	let { data }: { data: PageData } = $props();

	// eslint-disable-next-line svelte/state-referenced-locally
	let teams: Team[] = $state([...data.teams]);
	// eslint-disable-next-line svelte/state-referenced-locally
	let challenges: Challenge[] = $state([...data.challenges]);

	// Snackbar
	let snackbar: Snackbar;

	// Team form
	let newTeamName = $state('');
	let newTeamSchool = $state('');
	let newTeamColor = $state('#6750A4');
	let teamLoading = $state(false);

	// Challenge form
	let newChallengeName = $state('');
	let newChallengeDesc = $state('');
	let challengeLoading = $state(false);

	// ---- Teams ----
	async function addTeam() {
		if (!newTeamName.trim() || !newTeamSchool.trim()) return;
		teamLoading = true;
		const res = await fetch('/api/teams', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newTeamName, school: newTeamSchool, color: newTeamColor })
		});
		if (res.ok) {
			const t = await res.json();
			teams = [...teams, t];
			newTeamName = '';
			newTeamSchool = '';
			newTeamColor = '#6750A4';
			snackbar.show(`✅ Team "${t.name}" added`);
		} else {
			const e = await res.json();
			snackbar.show(`⚠️ ${e.error}`);
		}
		teamLoading = false;
	}

	async function deleteTeam(id: number, name: string) {
		if (!confirm(`Delete team "${name}"? This will remove all their scores.`)) return;
		await fetch(`/api/teams/${id}`, { method: 'DELETE' });
		teams = teams.filter((t) => t.id !== id);
		snackbar.show(`🗑 Team "${name}" deleted`);
	}

	// ---- Challenges ----
	async function addChallenge() {
		if (!newChallengeName.trim()) return;
		challengeLoading = true;
		const res = await fetch('/api/challenges', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newChallengeName, description: newChallengeDesc })
		});
		if (res.ok) {
			const c = await res.json();
			challenges = [...challenges, c];
			newChallengeName = '';
			newChallengeDesc = '';
			snackbar.show(`✅ Challenge "${c.name}" added`);
		} else {
			const e = await res.json();
			snackbar.show(`⚠️ ${e.error}`);
		}
		challengeLoading = false;
	}

	async function deleteChallenge(id: number, name: string) {
		if (!confirm(`Delete challenge "${name}"? This will remove all associated scores.`)) return;
		await fetch(`/api/challenges/${id}`, { method: 'DELETE' });
		challenges = challenges.filter((c) => c.id !== id);
		snackbar.show(`🗑 Challenge "${name}" deleted`);
	}

	// ---- Reset ----
	async function resetScores() {
		if (!confirm('Reset ALL scores? This cannot be undone.')) return;
		await fetch('/api/scores/reset', { method: 'POST' });
		snackbar.show('🔄 All scores reset');
	}

	// ---- Export ----
	function exportCsv() {
		window.location.href = '/api/scores/export';
	}

	const PRESET_COLORS = [
		'#e21b3c', '#1368ce', '#d89e00', '#26890c',
		'#864cbf', '#e15f2c', '#6750a4', '#00897b'
	];
</script>

<svelte:head>
	<title>Admin — Podium501</title>
</svelte:head>

<div class="admin-page">
	<h1 class="page-title">⚙️ Admin</h1>

	<div class="admin-grid">
		<!-- Teams -->
		<section class="card">
			<h2>👥 Teams</h2>

			<form class="form" onsubmit={(e) => { e.preventDefault(); addTeam(); }}>
				<div class="field">
					<label for="team-name">Team name *</label>
					<input id="team-name" bind:value={newTeamName} placeholder="e.g. Team Rocket" required />
				</div>
				<div class="field">
					<label for="team-school">School *</label>
					<input id="team-school" bind:value={newTeamSchool} placeholder="e.g. Lincoln High" required />
				</div>
				<div class="field">
					<label for="color-native">Color</label>
					<div class="color-row">
						{#each PRESET_COLORS as c}
							<button
								type="button"
								class="color-dot"
								class:selected={newTeamColor === c}
								style="background:{c};"
								aria-label="Select color {c}"
								onclick={() => (newTeamColor = c)}
							></button>
						{/each}
						<input id="color-native" type="color" bind:value={newTeamColor} class="color-native" />
					</div>
				</div>
				<button class="btn btn-primary" type="submit" disabled={teamLoading}>
					{teamLoading ? 'Adding…' : '+ Add Team'}
				</button>
			</form>

			<ul class="item-list">
				{#each teams as t (t.id)}
					<li>
						<span class="dot" style="background:{t.color};"></span>
						<div class="item-info">
							<strong>{t.name}</strong>
							<small>{t.school}</small>
						</div>
						<button class="btn btn-danger btn-sm" onclick={() => deleteTeam(t.id, t.name)}>
							Delete
						</button>
					</li>
				{:else}
					<li class="empty-item">No teams yet.</li>
				{/each}
			</ul>
		</section>

		<!-- Challenges -->
		<section class="card">
			<h2>📋 Challenges</h2>

			<form class="form" onsubmit={(e) => { e.preventDefault(); addChallenge(); }}>
				<div class="field">
					<label for="challenge-name">Challenge name *</label>
					<input id="challenge-name" bind:value={newChallengeName} placeholder="e.g. Bridge Building" required />
				</div>
				<div class="field">
					<label for="challenge-desc">Description</label>
					<input id="challenge-desc" bind:value={newChallengeDesc} placeholder="Optional description" />
				</div>
				<button class="btn btn-primary" type="submit" disabled={challengeLoading}>
					{challengeLoading ? 'Adding…' : '+ Add Challenge'}
				</button>
			</form>

			<ul class="item-list">
				{#each challenges as c (c.id)}
					<li>
						<span class="material-icons" style="color:#eaddff; font-size:1.1rem;">assignment</span>
						<div class="item-info">
							<strong>{c.name}</strong>
							{#if c.description}<small>{c.description}</small>{/if}
						</div>
						<button class="btn btn-danger btn-sm" onclick={() => deleteChallenge(c.id, c.name)}>
							Delete
						</button>
					</li>
				{:else}
					<li class="empty-item">No challenges yet.</li>
				{/each}
			</ul>
		</section>

		<!-- Danger Zone -->
		<section class="card danger-zone">
			<h2>⚠️ Danger Zone</h2>
			<p>These actions affect all scores.</p>
			<div class="danger-btns">
				<button class="btn btn-danger" onclick={resetScores}>🔄 Reset All Scores</button>
				<button class="btn btn-secondary" onclick={exportCsv}>📥 Export CSV</button>
			</div>
		</section>
	</div>
</div>

<Snackbar bind:this={snackbar} />

<style>
	.admin-page {
		max-width: 1000px;
		margin: 0 auto;
	}

	.admin-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	@media (max-width: 700px) {
		.admin-grid {
			grid-template-columns: 1fr;
		}
	}

	h2 {
		font-size: 1.15rem;
		font-weight: 700;
		margin-bottom: 1rem;
		color: #eaddff;
	}

	.form {
		margin-bottom: 1.25rem;
	}

	.color-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.color-dot {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		border: 3px solid transparent;
		cursor: pointer;
		transition: transform 0.15s;
	}

	.color-dot.selected {
		border-color: #fff;
		transform: scale(1.15);
	}

	.color-native {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		border: none;
		cursor: pointer;
		padding: 0;
		background: none;
	}

	.item-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.item-list li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: #1c1b1f;
		border-radius: var(--radius-sm);
		padding: 0.625rem 0.75rem;
	}

	.dot {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.item-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		font-size: 0.95rem;
	}

	.item-info small {
		color: var(--md-on-surface-variant);
		font-size: 0.8rem;
	}

	.empty-item {
		color: var(--md-on-surface-variant);
		font-size: 0.9rem;
		justify-content: center;
	}

	.danger-zone {
		grid-column: 1 / -1;
		border: 1px solid #e21b3c44;
	}

	.danger-zone p {
		color: var(--md-on-surface-variant);
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.danger-btns {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
</style>
