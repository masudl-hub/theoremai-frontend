/**
 * The screen after the goals. Its names and stills are placeholders until the content is written:
 * each tab's id is its hash, and each still is a background from the imagery folder.
 */
export const PLATFORM_TABS = [
	{ id: 'tab-one', label: 'Tab one', src: '/imagery/th30_alpinelake.png' },
	{ id: 'tab-two', label: 'Tab two', src: '/imagery/th30_arctic.png' },
	{ id: 'performance', label: 'Performance', src: '/imagery/th30_atoll.png' },
	{ id: 'tab-four', label: 'Tab four', src: '/imagery/th30_autumn.png' },
	{ id: 'tab-five', label: 'Tab five', src: '/imagery/th30_basaltplanes.png' },
] as const;

export type PlatformId = (typeof PLATFORM_TABS)[number]['id'];

export function isPlatformId(id: string): id is PlatformId {
	return PLATFORM_TABS.some((tab) => tab.id === id);
}
