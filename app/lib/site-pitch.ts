/**
 * What the landing page's overview says about Theorem, as plain data with no build-time
 * imports, so the screens and th30 read the same words.
 */

export const HOME_TAGLINE =
	'One typed definition connects your agent’s runtime, interface, and guardrails.';

export const ARGUMENT =
	'Your intent belongs in the system itself. Theorem turns what you design into an explicit contract—carried through the interface, the agent, and the rules governing each interaction.';

/**
 * Each still is the idea.
 * One river through orange rock. Saffron laid out to try.
 * Obsidian shores are the boundary.
 */
export const GOALS = [
	{
		id: 'experience',
		title: 'Build the user experience directly into your agent definition.',
		src: '/imagery/th30_orangecanyon.png',
		alt: 'A single river cutting through an orange canyon, with clouds and their shadows',
	},
	{
		id: 'experiment',
		title: 'Experiment with models without rebuilding your application.',
		src: '/imagery/th30_dryingsaffron.png',
		alt: 'Purple saffron laid out in plots divided by dirt paths, with clouds and their shadows',
	},
	{
		id: 'boundaries',
		title: 'Protect your data at every agent boundary.',
		src: '/imagery/th30_obsidianshores.png',
		alt: 'Black obsidian rock meeting deep teal water, with pale foam along the shore',
	},
] as const;
