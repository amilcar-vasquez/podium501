<script lang="ts">
	import type { PageData } from './$types';
	import type { Team, Challenge, Coach } from '$lib/types';
	import Snackbar from '$lib/components/Snackbar.svelte';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	// eslint-disable-next-line svelte/state-referenced-locally
	let teams: Team[] = $state([...data.teams]);
	// eslint-disable-next-line svelte/state-referenced-locally
	let challenges: Challenge[] = $state([...data.challenges]);
	// eslint-disable-next-line svelte/state-referenced-locally
	let coaches: Coach[] = $state([...data.coaches]);

	// Snackbar
	let snackbar: Snackbar;

	// --- PIN authentication (same keys as coach page) ---
	const PIN_KEY = 'podium501_coach_pin';
	const NAME_KEY = 'podium501_coach_name';
	const ROLE_KEY = 'podium501_coach_role';

	let mounted = $state(false);
	let pinVerified = $state(false);
	let coachName = $state('');
	let pinInput = $state('');
	let pinError = $state('');
	let isVerifying = $state(false);

	onMount(() => {
		mounted = true;
		const storedPin = localStorage.getItem(PIN_KEY);
		const storedName = localStorage.getItem(NAME_KEY);
		const storedRole = localStorage.getItem(ROLE_KEY);
		if (storedPin && storedName && storedRole === 'admin') {
			coachName = storedName;
			pinVerified = true;
		}
	});

	async function verifyPin() {
		const pin = pinInput.trim();
		if (!pin) return;
		isVerifying = true;
		pinError = '';
		try {
			const res = await fetch('/api/coach-login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ pin })
			});
			const result = await res.json();
			if (result.success) {
				if (result.role !== 'admin') {
					pinError = 'Admin access only.';
					pinInput = '';
					return;
				}
				localStorage.setItem(PIN_KEY, pin);
				localStorage.setItem(NAME_KEY, result.coachName);
				localStorage.setItem(ROLE_KEY, 'admin');
				coachName = result.coachName;
				pinVerified = true;
			} else {
				pinError = 'Invalid PIN. Try again.';
				pinInput = '';
			}
		} catch {
			pinError = 'Connection error. Try again.';
		} finally {
			isVerifying = false;
		}
	}

	// Team form
	let newTeamName = $state('');
	let newTableNumber = $state('');
	let newTeamColor = $state('#6750A4');
	let teamLoading = $state(false);

	// Challenge form
	let newChallengeName = $state('');
	let newChallengeDesc = $state('');
	let challengeLoading = $state(false);

	// ---- Teams ----
	async function addTeam() {
		if (!newTeamName.trim()) return;
		teamLoading = true;
		const res = await fetch('/api/teams', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newTeamName, table_number: newTableNumber, color: newTeamColor })
		});
		if (res.ok) {
			const t = await res.json();
			teams = [...teams, t];
			newTeamName = '';
			newTableNumber = '';
			// newTeamColor is auto-updated by the $effect above
			snackbar.show(`Team "${t.name}" added`);
		} else {
			const e = await res.json();
			snackbar.show(e.error);
		}
		teamLoading = false;
	}

	async function deleteTeam(id: number, name: string) {
		if (!confirm(`Delete team "${name}"? This will remove all their scores.`)) return;
		await fetch(`/api/teams/${id}`, { method: 'DELETE' });
		teams = teams.filter((t) => t.id !== id);
		snackbar.show(`Team "${name}" deleted`);
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
			snackbar.show(`Challenge "${c.name}" added`);
		} else {
			const e = await res.json();
			snackbar.show(e.error);
		}
		challengeLoading = false;
	}

	async function deleteChallenge(id: number, name: string) {
		if (!confirm(`Delete challenge "${name}"? This will remove all associated scores.`)) return;
		await fetch(`/api/challenges/${id}`, { method: 'DELETE' });
		challenges = challenges.filter((c) => c.id !== id);
		snackbar.show(`Challenge "${name}" deleted`);
	}

	// ---- Coaches ----
	let newCoachName = $state('');
	let newCoachRole = $state<'coach' | 'admin'>('coach');
	let newCoachTeamId = $state<number | ''>('');
	let coachLoading = $state(false);
	let revealedPin = $state<{ name: string; pin: string } | null>(null);

	async function addCoach() {
		if (!newCoachName.trim()) return;
		coachLoading = true;
		const res = await fetch('/api/coaches', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newCoachName.trim(), team_id: newCoachTeamId || null, role: newCoachRole })
		});
		if (res.ok) {
			const c = await res.json();
			coaches = [...coaches, c];
			revealedPin = { name: c.name, pin: c.pin };
			newCoachName = '';
			newCoachTeamId = '';
			newCoachRole = 'coach';
		} else {
			const e = await res.json();
			snackbar.show(e.error ?? 'Error adding coach');
		}
		coachLoading = false;
	}

	async function deleteCoach(id: number, name: string) {
		if (!confirm(`Remove coach "${name}"?`)) return;
		const res = await fetch(`/api/coaches/${id}`, { method: 'DELETE' });
		if (res.ok) {
			coaches = coaches.filter((c) => c.id !== id);
			snackbar.show(`Coach "${name}" removed`);
		}
	}
	async function resetScores() {
		if (!confirm('Reset ALL scores? This cannot be undone.')) return;
		await fetch('/api/scores/reset', { method: 'POST' });
		snackbar.show('All scores reset');
	}

	// ---- Export ----
	function exportCsv() {
		window.location.href = '/api/scores/export';
	}

	const PRESET_COLORS = [
		// reds / oranges
		'#e53935', '#f4511e', '#fb8c00', '#f9a825',
		// greens
		'#c0ca33', '#43a047', '#26890c', '#00897b',
		// cyans / blues
		'#00acc1', '#039be5', '#1e88e5', '#3949ab',
		// purples / pinks
		'#5e35b1', '#8e24aa', '#d81b60', '#e91e63',
		// bright accent row 1
		'#00bfa5', '#00b0ff', '#64dd17', '#ffab40',
		// bright accent row 2
		'#ff6d00', '#ff4081', '#7c4dff', '#1de9b6',
		// pastel / extra
		'#ffd740', '#ff6e40', '#40c4ff', '#69f0ae',
		// varied
		'#ea80fc', '#f06292', '#4fc3f7', '#546e7a'
	];

	// Colors already assigned to existing teams (normalised to lowercase)
	let usedColors = $derived(new Set(teams.map((t) => t.color.toLowerCase())));

	// Available preset colors — excludes those already in use
	let availableColors = $derived(PRESET_COLORS.filter((c) => !usedColors.has(c.toLowerCase())));

	// Keep newTeamColor pointing at a valid available preset whenever the list changes
	$effect(() => {
		if (availableColors.length > 0 && !availableColors.includes(newTeamColor)) {
			newTeamColor = availableColors[0];
		}
	});
</script>

<svelte:head>
	<title>Admin — Podium501</title>
</svelte:head>

{#if !mounted}
	<!-- avoid flash before localStorage check -->
{:else if !pinVerified}
	<div class="pin-gate">
		<div class="pin-card">
			<h2><span class="material-icons" style="vertical-align:middle;font-size:1.2rem">lock</span> Admin Access</h2>
			<p>Enter your coach PIN to continue.</p>
			<form onsubmit={(e) => { e.preventDefault(); verifyPin(); }}>
				<input
					type="password"
					inputmode="numeric"
					pattern="\d*"
					maxlength="8"
					placeholder="PIN"
					bind:value={pinInput}
				/>
				{#if pinError}<p class="pin-error">{pinError}</p>{/if}
				<button class="btn btn-primary" type="submit" disabled={isVerifying} style="margin-top:1rem;">
					{isVerifying ? 'Checking…' : 'Unlock'}
				</button>
			</form>
		</div>
	</div>
{:else}

<div class="admin-page">
	<h1 class="page-title"><span class="material-icons" style="vertical-align:middle;font-size:1.5rem">settings</span> Admin</h1>

	<div class="admin-grid">
		<!-- Teams -->
		<section class="card">
			<h2><span class="material-icons" style="vertical-align:middle;font-size:1.2rem">groups</span> Teams</h2>

			<form class="form" onsubmit={(e) => { e.preventDefault(); addTeam(); }}>
				<div class="field">
					<label for="team-name">Team name *</label>
					<input id="team-name" bind:value={newTeamName} placeholder="e.g. Team Tapir" required />
				</div>
				<div class="field">
					<label for="team-table">Table number</label>
					<input id="team-table" bind:value={newTableNumber} placeholder="e.g. 5" />
				</div>
				<div class="field">
					<label for="color-native">Color</label>
					<div class="color-row">
					{#each availableColors as c}
						<button
							type="button"
							class="color-dot"
							class:selected={newTeamColor === c}
							style="background:{c};"
							aria-label="Select color {c}"
							onclick={() => (newTeamColor = c)}
						></button>
					{/each}
					{#if availableColors.length === 0}
						<span class="no-colors">All preset colors in use</span>
					{/if}
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
							{#if t.table_number}<small>Table {t.table_number}</small>{/if}
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
			<h2><span class="material-icons" style="vertical-align:middle;font-size:1.2rem">assignment</span> Challenges</h2>

			<form class="form" onsubmit={(e) => { e.preventDefault(); addChallenge(); }}>
				<div class="field">
					<label for="challenge-name">Challenge name *</label>
					<input id="challenge-name" bind:value={newChallengeName} placeholder="e.g. CryptoCraze" required />
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

		<!-- Coaches -->
		<section class="card coaches-card">
			<h2><span class="material-icons" style="vertical-align:middle;font-size:1.2rem">badge</span> Coaches</h2>

			{#if revealedPin}
				<div class="pin-reveal">
					<span class="material-icons pin-reveal-icon">key</span>
					<div class="pin-reveal-text">
						<strong>{revealedPin.name}</strong> added —
						PIN: <span class="pin-code">{revealedPin.pin}</span>
						<br><small>Share this with the coach. It won't be shown again.</small>
					</div>
					<button class="btn btn-sm btn-secondary" onclick={() => revealedPin = null}>✕ Dismiss</button>
				</div>
			{/if}

			<form class="form" onsubmit={(e) => { e.preventDefault(); addCoach(); }}>
				<div class="field">
					<label for="coach-name">Name *</label>
					<input id="coach-name" bind:value={newCoachName} placeholder="e.g. Coach Smith" required />
				</div>
				<div class="field">
					<label for="coach-role">Role</label>
					<select id="coach-role" bind:value={newCoachRole} class="select-input">
						<option value="coach">Coach</option>
						<option value="admin">Admin</option>
					</select>
				</div>
				<div class="field">
					<label for="coach-team">Assign to team</label>
					<select id="coach-team" bind:value={newCoachTeamId} class="select-input">
						<option value="">— Unassigned —</option>
						{#each teams.filter(t => !coaches.some(c => c.team_id === t.id)) as t}
							<option value={t.id}>{t.name}</option>
						{/each}
					</select>
				</div>
				<button class="btn btn-primary" type="submit" disabled={coachLoading}>
					{coachLoading ? 'Adding…' : '+ Add Coach'}
				</button>
			</form>

			<ul class="item-list">
				{#each coaches as c (c.id)}
					<li>
						<span class="material-icons" style="color:#cac4d0;font-size:1.1rem;flex-shrink:0">person</span>
						<div class="item-info">
							<strong>{c.name}</strong>
							<small>
								{c.role === 'admin' ? '⭐ Admin' : (c.team_name ? `Team: ${c.team_name}` : 'Unassigned')}
								· PIN: <code class="pin-inline">{c.pin}</code>
							</small>
						</div>
						<button class="btn btn-danger btn-sm" onclick={() => deleteCoach(c.id, c.name)}>Remove</button>
					</li>
				{:else}
					<li class="empty-item">No coaches yet.</li>
				{/each}
			</ul>
		</section>

		<!-- Danger Zone -->
		<section class="card danger-zone">
			<h2><span class="material-icons" style="vertical-align:middle;font-size:1.2rem;color:#f2b8b8">warning</span> Danger Zone</h2>
			<p>These actions affect all scores.</p>
			<div class="danger-btns">
				<button class="btn btn-danger" onclick={resetScores}><span class="material-icons" style="vertical-align:middle;font-size:1rem">restart_alt</span> Reset All Scores</button>
				<button class="btn btn-secondary" onclick={exportCsv}><span class="material-icons" style="vertical-align:middle;font-size:1rem">download</span> Export CSV</button>
			</div>
		</section>
	</div>
</div>

<Snackbar bind:this={snackbar} />

{/if}

<style>
	.pin-gate {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.pin-card {
		background: #1c1b1f;
		border: 1px solid #49454f;
		border-radius: 16px;
		padding: 2rem;
		width: 100%;
		max-width: 320px;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.pin-card h2 {
		margin: 0;
		color: #eaddff;
	}

	.pin-card input {
		width: 100%;
		padding: 0.75rem;
		border-radius: 8px;
		border: 1px solid #49454f;
		background: #2b2930;
		color: #e6e1e5;
		font-size: 1.25rem;
		text-align: center;
		letter-spacing: 0.25em;
		box-sizing: border-box;
	}

	.pin-error {
		color: #f2b8b8;
		margin: 0;
		font-size: 0.875rem;
	}

	.admin-page {
		max-width: 1000px;
		margin: 0 auto;
	}

	.admin-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
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
		gap: 0.35rem;
		flex-wrap: wrap;
		max-width: 320px;
	}

	.color-dot {
		width: 1.4rem;
		height: 1.4rem;
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

	.no-colors {
		font-size: 0.8rem;
		color: #938f99;
		font-style: italic;
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

	.coaches-card {
		grid-column: 1 / -1;
	}

	.pin-reveal {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: #1a3a1a;
		border: 1px solid #26890c55;
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
		margin-bottom: 1.25rem;
		color: #a5d6a7;
	}

	.pin-reveal-icon {
		color: #66bb6a;
		flex-shrink: 0;
	}

	.pin-reveal-text {
		flex: 1;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.pin-code {
		font-family: monospace;
		font-size: 1.15rem;
		font-weight: 700;
		color: #a5d6a7;
		letter-spacing: 0.15em;
	}

	.pin-inline {
		font-family: monospace;
		color: #b0bec5;
		font-size: 0.85rem;
	}

	.select-input {
		width: 100%;
		padding: 0.6rem 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid #49454f;
		background: #2b2930;
		color: #e6e1e5;
		font-size: 0.95rem;
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

	/* ===== RESPONSIVE BREAKPOINTS ===== */

	/* 1400 px – large desktop */
	@media (min-width: 1400px) {
		.admin-page { max-width: 1300px; }
		h2 { font-size: 1.3rem; }
		.item-info { font-size: 1rem; }
		.item-info small { font-size: 0.875rem; }
		.color-dot { width: 1.6rem; height: 1.6rem; }
		.color-native { width: 2.2rem; height: 2.2rem; }
		.color-row { max-width: 420px; gap: 0.45rem; }
	}

	/* 1920 px – Full HD */
	@media (min-width: 1920px) {
		.admin-page { max-width: 100%; padding: 0 3rem; }
		.admin-grid { grid-template-columns: 1fr 1fr; gap: 2.5rem; }
		h2 { font-size: 1.6rem; margin-bottom: 1.5rem; }
		.page-title { font-size: 2rem; }
		input { font-size: 1.15rem; padding: 0.9rem 1.1rem; }
		label { font-size: 1rem; }
		.btn { font-size: 1.1rem; padding: 0.875rem 1.75rem; }
		.btn-sm { font-size: 0.95rem; }
		.item-list li { padding: 0.875rem 1rem; }
		.item-info { font-size: 1.1rem; }
		.item-info small { font-size: 0.9rem; }
		.dot { width: 1rem; height: 1rem; }
		.color-dot { width: 1.85rem; height: 1.85rem; }
		.color-native { width: 2.5rem; height: 2.5rem; }
		.color-row { max-width: 520px; gap: 0.5rem; }
		.pin-card { max-width: 420px; padding: 3rem; }
		.pin-card input { font-size: 1.75rem; }
	}

	/* 2560 px – QHD */
	@media (min-width: 2560px) {
		.admin-page { padding: 0 5rem; }
		.admin-grid { gap: 3.5rem; }
		h2 { font-size: 2rem; margin-bottom: 2rem; }
		.page-title { font-size: 2.75rem; }
		input { font-size: 1.5rem; padding: 1.1rem 1.4rem; }
		label { font-size: 1.3rem; }
		.btn { font-size: 1.4rem; padding: 1.1rem 2.25rem; }
		.item-list li { padding: 1.25rem 1.5rem; }
		.item-info { font-size: 1.4rem; }
		.item-info small { font-size: 1.1rem; }
		.dot { width: 1.3rem; height: 1.3rem; }
		.color-dot { width: 2.25rem; height: 2.25rem; }
		.color-native { width: 3rem; height: 3rem; }
		.color-row { max-width: 700px; gap: 0.65rem; }
		.no-colors { font-size: 1.1rem; }
	}

	/* 3840 px – 4K */
	@media (min-width: 3840px) {
		.admin-page { padding: 0 8rem; }
		.admin-grid { gap: 5rem; }
		h2 { font-size: 3rem; margin-bottom: 2.5rem; }
		.page-title { font-size: 4rem; }
		input { font-size: 2.25rem; padding: 1.5rem 2rem; }
		label { font-size: 1.9rem; }
		.btn { font-size: 2rem; padding: 1.5rem 3rem; }
		.item-list { gap: 0.875rem; }
		.item-list li { padding: 1.75rem 2rem; }
		.item-info { font-size: 2rem; }
		.item-info small { font-size: 1.6rem; }
		.dot { width: 1.75rem; height: 1.75rem; }
		.color-dot { width: 3.25rem; height: 3.25rem; }
		.color-native { width: 4rem; height: 4rem; }
		.color-row { max-width: 1000px; gap: 0.85rem; }
		.no-colors { font-size: 1.6rem; }
	}
</style>
