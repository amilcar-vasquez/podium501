<script lang="ts">
	import { page } from '$app/stores';

	const links = [
		{ href: '/coach',      icon: 'laptop',      label: 'Coach'      },
		{ href: '/scoreboard', icon: 'leaderboard', label: 'Scoreboard' },
		{ href: '/admin',      icon: 'settings',    label: 'Admin'      }
	];
</script>

<!-- Top app bar -->
<header class="top-bar">
	<span class="brand">
		<span class="material-icons brand-icon">sports_score</span>
		Podium501
	</span>
	<nav class="top-links" aria-label="Main navigation">
		{#each links as link}
			<a href={link.href} class:active={$page.url.pathname.startsWith(link.href)}>
				<span class="material-icons">{link.icon}</span>
				{link.label}
			</a>
		{/each}
	</nav>
</header>

<!-- Bottom navigation bar — mobile only -->
<nav class="bottom-nav" aria-label="Main navigation">
	{#each links as link}
		<a href={link.href} class:active={$page.url.pathname.startsWith(link.href)}>
			<span class="material-icons nav-icon">{link.icon}</span>
			<span class="nav-label">{link.label}</span>
		</a>
	{/each}
</nav>

<style>
	/* ── Top app bar ──────────────────────────────────────────── */
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1rem;
		height: 56px;
		background: #2b2930;
		border-bottom: 1px solid #49454f;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-weight: 700;
		font-size: 1.1rem;
		color: #eaddff;
		white-space: nowrap;
	}

	.brand-icon {
		font-size: 1.3rem;
		vertical-align: middle;
	}

	/* ── Desktop nav links inside top bar ────────────────────── */
	.top-links {
		display: flex;
		gap: 0.25rem;
	}

	.top-links a {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1rem;
		border-radius: 50px;
		font-weight: 500;
		font-size: 0.95rem;
		color: #cac4d0;
		transition: background 0.15s, color 0.15s;
		text-decoration: none;
	}

	.top-links a .material-icons {
		font-size: 1.1rem;
	}

	.top-links a:hover,
	.top-links a.active {
		background: #6750a4;
		color: #ffffff;
	}

	/* ── Bottom nav bar — hidden on desktop ──────────────────── */
	.bottom-nav {
		display: none;
	}

	/* ── Mobile: hide top links, show bottom nav ─────────────── */
	@media (max-width: 600px) {
		.top-links {
			display: none;
		}

		.bottom-nav {
			display: flex;
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			height: 68px;
			background: #2b2930;
			border-top: 1px solid #49454f;
			z-index: 100;
		}

		.bottom-nav a {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 0.2rem;
			color: #938f99;
			text-decoration: none;
			font-size: 0.7rem;
			font-weight: 500;
			transition: color 0.15s;
			position: relative;
			padding-top: 6px;
		}

		/* M3 active indicator pill behind the icon */
		.bottom-nav a::before {
			content: '';
			position: absolute;
			top: 4px;
			left: 50%;
			transform: translateX(-50%);
			width: 64px;
			height: 32px;
			border-radius: 50px;
			background: transparent;
			transition: background 0.2s;
		}

		.bottom-nav a.active::before {
			background: #4a4458;
		}

		.bottom-nav a.active {
			color: #eaddff;
		}

		.nav-icon {
			font-size: 1.4rem;
			position: relative;
			z-index: 1;
		}

		.nav-label {
			position: relative;
			z-index: 1;
		}
	}
</style>
