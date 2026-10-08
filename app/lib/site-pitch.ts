/**
 * What the landing page's overview says about Theorem, as plain data with no build-time
 * imports, so the screens and th30 read the same words.
 */

export const HOME_TAGLINE =
	'Typed, composable agents for text, image, speech, and live voice — guarded on every turn.';

export const ARGUMENT =
	'Agent outputs vary every turn. Users still need an experience they can understand and trust. theorem helps you build that experience around a clear agent contract.';

/**
 * Each still is the idea.
 * One river through orange rock. Saffron laid out to try.
 * Obsidian shores are the boundary.
 */
export const GOALS = [
	{
		id: 'source-of-truth',
		title: 'One source of truth',
		text: 'Keep execution and interface aligned, rather than maintaining separate versions of what your agent can do.',
		src: '/imagery/th30_orangecanyon.png',
		alt: 'A single river cutting through an orange canyon, with clouds and their shadows',
	},
	{
		id: 'experiment',
		title: 'Room to experiment',
		text: 'Change models, providers, and modalities without rebuilding the surrounding application. Find what works for your agent.',
		src: '/imagery/th30_dryingsaffron.png',
		alt: 'Purple saffron laid out in plots divided by dirt paths, with clouds and their shadows',
	},
	{
		id: 'boundaries',
		title: 'Built-in boundaries',
		text: 'Check what enters, what leaves, and what tools can access. Keep protections and permissions explicit.',
		src: '/imagery/th30_obsidianshores.png',
		alt: 'Black obsidian rock meeting deep teal water, with pale foam along the shore',
	},
] as const;
