/**
 * Overlay-only exposure match to lavender. Does not rewrite files.
 * Set STILL_MATCH to false to see the originals.
 */
export const STILL_MATCH: boolean = true;

/** Landscape aerials (1536×656 and 1536×864). Reader headers and landing covers share these. */
const WIDE_STILLS: ReadonlySet<string> = new Set([
	'/imagery/th30_cherryblossoms.png',
	'/imagery/th30_copperandobsidian.png',
	'/imagery/th30_floodedpaddy.png',
	'/imagery/th30_goldenmarsh.png',
	'/imagery/th30_hayss.png',
	'/imagery/th30_mistyforest.png',
	'/imagery/th30_orchards.png',
	'/imagery/th30_reeds.png',
	'/imagery/th30_roads.png',
	'/imagery/th30_rustsand.png',
	'/imagery/th30_saltflats.png',
	'/imagery/th30_steppe.png',
	'/imagery/th30_terracedgarden.png',
	'/imagery/th30_tidalmudflats.png',
	'/imagery/th30_wildflowerroad.png',
]);

export function isWideStill(src: string): boolean {
	return WIDE_STILLS.has(src);
}

const STILL_MATCH_FILTERS: {
	readonly [src: string]: { brightness: number; contrast: number } | undefined;
} = {
	'/imagery/th30_alpinelake.png': { brightness: 0.783, contrast: 0.78 },
	'/imagery/th30_arctic.png': { brightness: 0.62, contrast: 0.862 },
	'/imagery/th30_atoll.png': { brightness: 0.882, contrast: 0.78 },
	'/imagery/th30_autumn.png': { brightness: 1.153, contrast: 0.899 },
	'/imagery/th30_basaltplanes.png': { brightness: 0.919, contrast: 0.78 },
	'/imagery/th30_braidedriver.png': { brightness: 0.834, contrast: 0.971 },
	'/imagery/th30_canyon.png': { brightness: 0.863, contrast: 0.974 },
	'/imagery/th30_cherryblossoms.png': { brightness: 0.62, contrast: 0.871 },
	'/imagery/th30_copperandobsidian.png': { brightness: 1.021, contrast: 0.847 },
	'/imagery/th30_drysavannah.png': { brightness: 0.689, contrast: 1.053 },
	'/imagery/th30_farm.png': { brightness: 0.909, contrast: 0.931 },
	'/imagery/th30_fjord.png': { brightness: 0.988, contrast: 0.9 },
	'/imagery/th30_floodedpaddy.png': { brightness: 0.743, contrast: 0.862 },
	'/imagery/th30_geothermal.png': { brightness: 0.703, contrast: 0.813 },
	'/imagery/th30_glacialcrevass.png': { brightness: 0.62, contrast: 0.895 },
	'/imagery/th30_goldenmarsh.png': { brightness: 0.952, contrast: 0.977 },
	'/imagery/th30_gypsumdunes.png': { brightness: 0.62, contrast: 1.032 },
	'/imagery/th30_hayss.png': { brightness: 0.854, contrast: 1.32 },
	'/imagery/th30_hill.png': { brightness: 0.867, contrast: 1.009 },
	'/imagery/th30_larchmountain.png': { brightness: 0.924, contrast: 0.793 },
	'/imagery/th30_lichentundra.png': { brightness: 0.749, contrast: 0.96 },
	'/imagery/th30_meadow.png': { brightness: 0.745, contrast: 1.082 },
	'/imagery/th30_mineralhills.png': { brightness: 0.74, contrast: 1.124 },
	'/imagery/th30_mistyforest.png': { brightness: 0.74, contrast: 0.935 },
	'/imagery/th30_mountain.png': { brightness: 0.909, contrast: 0.796 },
	'/imagery/th30_ocean.png': { brightness: 1.141, contrast: 0.945 },
	'/imagery/th30_orchards.png': { brightness: 0.88, contrast: 1.091 },
	'/imagery/th30_peninsula.png': { brightness: 1.237, contrast: 0.93 },
	'/imagery/th30_pond.png': { brightness: 1.112, contrast: 1.016 },
	'/imagery/th30_rapeseedflowers.png': { brightness: 0.62, contrast: 1.093 },
	'/imagery/th30_reeds.png': { brightness: 1.014, contrast: 0.901 },
	'/imagery/th30_roads.png': { brightness: 0.894, contrast: 0.922 },
	'/imagery/th30_rustsand.png': { brightness: 0.646, contrast: 1.019 },
	'/imagery/th30_salt.png': { brightness: 0.674, contrast: 1.009 },
	'/imagery/th30_saltflats.png': { brightness: 0.644, contrast: 0.878 },
	'/imagery/th30_sanddunes.png': { brightness: 0.783, contrast: 1.146 },
	'/imagery/th30_steppe.png': { brightness: 0.888, contrast: 1.31 },
	'/imagery/th30_sulfurvolcano.png': { brightness: 0.667, contrast: 0.78 },
	'/imagery/th30_terrace.png': { brightness: 0.877, contrast: 0.862 },
	'/imagery/th30_terracedgarden.png': { brightness: 0.875, contrast: 0.78 },
	'/imagery/th30_tidalmudflats.png': { brightness: 0.854, contrast: 1.141 },
	'/imagery/th30_wildflowerroad.png': { brightness: 0.885, contrast: 0.923 },
};

export function stillFilter(src: string): { filter: string } | undefined {
	if (!STILL_MATCH) return undefined;
	const match = STILL_MATCH_FILTERS[src];
	if (match === undefined) return undefined;
	return {
		filter: `brightness(${String(match.brightness)}) contrast(${String(match.contrast)})`,
	};
}
