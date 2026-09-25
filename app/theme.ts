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
		// present; with the rail alone, inset top, bottom, and the trailing edge.
		// The leading edge stays flush to the rail. The matching start inset
		// is added in shell.css only below the drawer breakpoint.
		'layout-content': {
			base: {
				':where([role="main"])': {
					height: 'calc(100% - 2 * var(--spacing-4))',
					marginBlock: 'var(--spacing-4)',
					marginInlineEnd: 'var(--spacing-4)',
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
		// Neutral's selected fill (accent-muted) matches the dark page surface, so a selected row
		// vanishes; the pressed overlay reads on any surface in either mode.
		'tree-list-item': {
			'selected:selected': {
				backgroundColor: 'var(--color-overlay-pressed)',
			},
		},
		// Same fill and corners as the elevated shell's page panel (surface + radius-page, no border),
		// for pages that sit on the base and draw their own panels.
		section: {
			'variant:raised': {
				backgroundColor: 'var(--color-background-surface)',
				borderRadius: 'var(--radius-page)',
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
