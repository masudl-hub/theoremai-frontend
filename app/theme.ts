import { defineTheme } from '@astryxdesign/core/theme';
import { neutralPalettes } from '@astryxdesign/theme-neutral';
import { tablerIcons } from '@theoremai/react/ui/icons';
import { theoremTheme } from '@theoremai/react/ui/theme';

/**
 * Source of the site look: Theorem's theme on a black base, with each page drawn
 * as a rounded panel inset from the viewport edges beside the rail.
 * `npm run theme` compiles it to app/built/, which is what the app imports.
 */
export const siteTheme = defineTheme({
	name: 'theorem-site',
	extends: theoremTheme,
	// Restated so the built module carries the registry; a build keeps only the icons its source imports.
	icons: tablerIcons,
	tokens: {
		// Behind the rail and the page panel, in both modes.
		'--color-background-body': neutralPalettes.black,
	},
	components: {
		// AppShell's elevated variant only rounds the panel when a TopNav is
		// present; with the rail alone, inset its main content on every side.
		'layout-content': {
			base: {
				':where([role="main"])': {
					height: 'calc(100% - 2 * var(--spacing-2))',
					marginBlock: 'var(--spacing-2)',
					marginInlineEnd: 'var(--spacing-2)',
					borderRadius: 'var(--radius-page)',
				},
			},
		},
		// A clear gap between rail groups; Astryx's own section spacing reads as one list.
		'side-nav-section': {
			base: {
				paddingBlock: 'var(--spacing-3)',
			},
		},
		// The hero's scrim over its footage: a light dim, not Astryx's modal-strength overlay.
		'overlay-scrim': {
			base: {
				backgroundColor: 'rgb(0 0 0 / 0.3)',
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
