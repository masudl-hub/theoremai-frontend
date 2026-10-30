import { defineTheme } from '@astryxdesign/core/theme';
import { tablerIcons } from '@theoremjs/react/ui/icons';
import { studioTheme } from '@theoremjs/studio/ui/studio-theme.ts';

/**
 * Source of the site look: the studio's theme (the black base, the rail and the page panel, which
 * the studio shows on its own too), plus what only the website's pages draw.
 * `npm run theme` compiles it to app/built/, which is what the app imports.
 */
export const siteTheme = defineTheme({
	name: 'theorem-site',
	extends: studioTheme,
	// Restated so the built module carries the registry; a build keeps only the icons its source imports.
	icons: tablerIcons,
	components: {
		// A docs figure's backdrop: the still its `figure` fence names, shaded like the package tiles.
		card: {
			'variant:still': {
				backgroundImage:
					'linear-gradient(to top, rgb(0 0 0 / 0.82), rgb(0 0 0 / 0.62) 30%, rgb(0 0 0 / 0.2) 58%, rgb(0 0 0 / 0)), var(--figure-still)',
				backgroundPosition: 'center, var(--figure-position)',
				backgroundRepeat: 'no-repeat',
				backgroundSize: 'cover',
			},
			// A card drawn on a still: the still shows through, blurred.
			'variant:glass': {
				backgroundColor: 'color-mix(in srgb, var(--color-background-surface) 88%, transparent)',
				backdropFilter: 'blur(28px) saturate(1.6)',
			},
		},
		// The landing wordmark: Astryx's heading type, set at poster scale.
		heading: {
			'type:wordmark': {
				fontSize: 'clamp(3.5rem, 14vw, 13rem)',
			},
		},
	},
});
