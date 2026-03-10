import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const [teams, challenges] = await Promise.all([
		fetch('/api/teams').then((r) => r.json()),
		fetch('/api/challenges').then((r) => r.json())
	]);
	return { teams, challenges };
};
