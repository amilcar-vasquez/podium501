<script lang="ts">
	import { page } from '$app/stores';

	const links = [
		{ href: '/coach',      icon: 'laptop',      label: 'Coach'      },
		{ href: '/scoreboard', icon: 'leaderboard', label: 'Scoreboard' },
		{ href: '/admin',      icon: 'settings',    label: 'Admin'      }
	];
</script>

<nav class="nav">
	<span style="font-weight: 700; font-size: 1.1rem; color: #eaddff; margin-right: 0.5rem;">
		<span class="material-icons" style="vertical-align:middle;font-size:1.2rem">sports_score</span> Podium501
	</span>
	{#each links as link}
		<a href={link.href} class:active={$page.url.pathname.startsWith(link.href)}>
			<span class="material-icons" style="vertical-align:middle;font-size:1.1rem">{link.icon}</span> {link.label}
		</a>
	{/each}
</nav>
