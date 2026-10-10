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
		title: 'Manage the frontend and backend from one source',
		text: 'Declare what your agent accepts, returns and can call once. The server enforces it and the interface builds from it.',
		src: '/imagery/th30_orangecanyon.png',
		alt: 'A single river cutting through an orange canyon, with clouds and their shadows',
	},
	{
		id: 'experiment',
		title: 'Switch models, providers, modalities and behaviour without rebuilding',
		text: 'Change one line of the profile and your application keeps working, whatever runs the agent and whatever it makes.',
		src: '/imagery/th30_dryingsaffron.png',
		alt: 'Purple saffron laid out in plots divided by dirt paths, with clouds and their shadows',
	},
	{
		id: 'boundaries',
		title: 'Protect data with guardrails at every boundary',
		text: 'Built-in and custom checks read what comes in, what goes out and what tools can reach, with a setting for each boundary.',
		src: '/imagery/th30_obsidianshores.png',
		alt: 'Black obsidian rock meeting deep teal water, with pale foam along the shore',
	},
] as const;
