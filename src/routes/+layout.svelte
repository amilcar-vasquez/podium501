<script lang="ts">
	import NavBar from '$lib/components/NavBar.svelte';
	import '$lib/styles/global.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Podium501</title>
</svelte:head>

<NavBar />
<main>
	{@render children()}
</main>

<style>
	main {
		min-height: calc(100dvh - 56px);
		padding: 1rem;
	}
</style>
