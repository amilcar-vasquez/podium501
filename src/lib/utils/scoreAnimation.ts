/**
 * Animates a value from `from` to `to` over `duration` milliseconds.
 * Uses cubic ease-out for smooth deceleration.
 * Calls `onUpdate` on each animation frame with the interpolated value.
 */
export function animateValue(
	from: number,
	to: number,
	duration: number,
	onUpdate: (value: number) => void
): void {
	if (from === to) return;
	const start = performance.now();

	function tick(now: number): void {
		const elapsed = now - start;
		const t = Math.min(elapsed / duration, 1);
		const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
		onUpdate(Math.round(from + (to - from) * eased));
		if (t < 1) requestAnimationFrame(tick);
	}

	requestAnimationFrame(tick);
}
