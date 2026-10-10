import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { Theme } from '@astryxdesign/core/theme';
import { IconAlertTriangle, IconMapOff } from '@tabler/icons-react';
import { type ReactNode, useEffect, useState } from 'react';
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from 'react-router';
import type { Route } from './+types/root';
// Figtree is the neutral theme's font; Astryx names it but ships no files. Self-hosted, with its metrics rebalanced.
import '@theoremjs/studio/ui/figtree.css';
import figtreeRegular from '@fontsource/figtree/files/figtree-latin-400-normal.woff2?url';
// Astryx's documented order: reset → components → theme.
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './built/theme.css';
// After the theme: motion Astryx's theme API can't express.
import '@theoremjs/studio/ui/motion.css';
import './components/layout.css';
import { BOOT_PAINT, BOOT_PAINT_NOSCRIPT } from '@theoremjs/studio/ui/boot-paint.ts';
import { bootHasPlayed, SHELL_REVEAL } from '@theoremjs/studio/ui/shell-motion.ts';
import { theoremSiteTheme } from './built/theorem-site';

export const links: Route.LinksFunction = () => [
	{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
	// Body text's face, fetched with the document instead of after the stylesheet is parsed.
	{
		rel: 'preload',
		href: figtreeRegular,
		as: 'font',
		type: 'font/woff2',
		crossOrigin: 'anonymous',
	},
];

/** Documents must not be edge-cached across deploys (the custom domain once served max-age=7200). */
export function headers() {
	return { 'Cache-Control': 'no-cache, must-revalidate' };
}

export function Layout({ children }: { children: ReactNode }) {
	const [pending, setPending] = useState(() => !bootHasPlayed());
	useEffect(() => {
		const reveal = () => {
			setPending(false);
		};
		window.addEventListener(SHELL_REVEAL, reveal);
		return () => {
			window.removeEventListener(SHELL_REVEAL, reveal);
		};
	}, []);
	return (
		<html lang="en" data-boot-pending={pending ? '' : undefined}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="theme-color" content={theoremSiteTheme.tokens['--color-background-body']} />
				{/* The shell paint is inline so the first frame is already the panel the mark draws in. */}
				<style>{BOOT_PAINT}</style>
				<noscript>
					<style>{BOOT_PAINT_NOSCRIPT}</style>
				</noscript>
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return (
		<Theme theme={theoremSiteTheme} mode="dark">
			{/* AppShell doesn't mount the layer systems; toasts need this to have a viewport. */}
			<LayerProvider>
				<Outlet />
			</LayerProvider>
		</Theme>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	const missing = isRouteErrorResponse(error) && error.status === 404;
	useEffect(() => {
		delete document.documentElement.dataset.bootPending;
	}, []);
	return (
		<Theme theme={theoremSiteTheme} mode="dark">
			<main>
				<Center className="app-error">
					<EmptyState
						headingLevel={1}
						icon={<Icon icon={missing ? IconMapOff : IconAlertTriangle} size="lg" />}
						title={missing ? 'Page not found' : 'Something went wrong'}
						description={
							missing
								? "This page doesn't exist or has moved."
								: 'The page hit an error. Try again, or head back home.'
						}
						actions={
							missing ? (
								<Button label="Go home" variant="primary" href="/" />
							) : (
								<>
									<Button
										label="Try again"
										variant="primary"
										onClick={() => {
											window.location.reload();
										}}
									/>
									<Button label="Go home" href="/" />
								</>
							)
						}
					/>
				</Center>
			</main>
		</Theme>
	);
}
