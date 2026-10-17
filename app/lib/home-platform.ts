/**
 * The screen after the goals. Its names are placeholders until the content is written: each tab's
 * id is its hash. `readouts` puts the performance readouts in the preview.
 */
export const PLATFORM_TABS = [
	{ id: 'tab-one', label: 'Tab one', readouts: false },
	{ id: 'tab-two', label: 'Tab two', readouts: false },
	{ id: 'performance', label: 'Performance', readouts: true },
	{ id: 'tab-four', label: 'Tab four', readouts: false },
	{ id: 'tab-five', label: 'Tab five', readouts: false },
] as const;

/**
 * Whether the capabilities screen is on the home page. It is off until the screen is ready to ship:
 * the screen, its hashes and its stops are all held back while this is false.
 */
export const PLATFORM_SHOWN = false;

export type PlatformId = (typeof PLATFORM_TABS)[number]['id'];

export function isPlatformId(id: string): id is PlatformId {
	return PLATFORM_TABS.some((tab) => tab.id === id);
}
