<script lang="ts">
	import { page } from '$app/stores';

	const links = [
		{ href: '/judge',      label: '⚖️ Judge'      },
		{ href: '/scoreboard', label: '🏆 Scoreboard' },
		{ href: '/admin',      label: '⚙️ Admin'      }
	];
</script>

<nav class="nav">
	<span style="font-weight: 700; font-size: 1.1rem; color: #eaddff; margin-right: 0.5rem;">🎯 Podium501</span>
	{#each links as link}
		<a href={link.href} class:active={$page.url.pathname.startsWith(link.href)}>
			{link.label}
		</a>
	{/each}
</nav>
