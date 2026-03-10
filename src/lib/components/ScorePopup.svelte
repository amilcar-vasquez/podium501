<script lang="ts">
	interface Props {
		delta: number;
	}
	let { delta }: Props = $props();
</script>

<span class="popup" class:positive={delta > 0} class:negative={delta < 0}>
	{delta > 0 ? `+${delta}` : `${delta}`}
</span>

<style>
	.popup {
		position: absolute;
		top: -0.25rem;
		right: 0.25rem;
		font-size: 1.1rem;
		font-weight: 800;
		pointer-events: none;
		animation: floatUp 1s ease-out forwards;
		white-space: nowrap;
		z-index: 10;
	}

	.positive {
		color: #4caf50;
		text-shadow: 0 0 10px #4caf5088;
	}

	.negative {
		color: #e21b3c;
		text-shadow: 0 0 10px #e21b3c88;
	}

	@keyframes floatUp {
		0% {
			transform: translateY(0);
			opacity: 1;
		}
		100% {
			transform: translateY(-40px);
			opacity: 0;
		}
	}
</style>
