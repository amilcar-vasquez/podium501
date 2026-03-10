import confetti from 'canvas-confetti';

const COLORS = ['#6750a4', '#e21b3c', '#1368ce', '#d89e00', '#26890c'];

/** Small confetti burst when any score is awarded. */
export function triggerScoreConfetti(): void {
	confetti({
		particleCount: 50,
		spread: 70,
		origin: { y: 0.6 },
		colors: COLORS
	});
}

/** Large confetti burst for milestone achievements. */
export function triggerMilestoneConfetti(): void {
	confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: COLORS });
	setTimeout(() => {
		confetti({ particleCount: 80, spread: 80, origin: { x: 0.1, y: 0.5 }, angle: 60, colors: COLORS });
		confetti({ particleCount: 80, spread: 80, origin: { x: 0.9, y: 0.5 }, angle: 120, colors: COLORS });
	}, 300);
}
