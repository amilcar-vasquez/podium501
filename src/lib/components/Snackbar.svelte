<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let message = '';
	export let duration = 2500;

	let visible = false;
	let timer: ReturnType<typeof setTimeout>;

	export function show(msg: string) {
		message = msg;
		visible = true;
		clearTimeout(timer);
		timer = setTimeout(() => (visible = false), duration);
	}

	onDestroy(() => clearTimeout(timer));
</script>

{#if visible}
	<div class="snackbar">{message}</div>
{/if}
