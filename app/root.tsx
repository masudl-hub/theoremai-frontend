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
import './figtree.css';
import figtreeRegular from '@fontsource/figtree/files/figtree-latin-400-normal.woff2?url';
// Astryx's documented order: reset → components → theme.
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './built/theme.css';
// After the theme: motion Astryx's theme API can't express.
import './motion.css';
import './components/layout.css';
import { theoremSiteTheme } from './built/theorem-site';
import { bootHasPlayed, SHELL_REVEAL } from './components/shell-motion';

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
				<style>
					{
						'html{color-scheme:dark}html,body{margin:0;background:#000}html[data-boot-pending],html[data-boot-pending] body{background:#262626}html[data-boot-pending] .astryx-app-shell{height:100dvh}html[data-boot-pending] .astryx-app-shell-sidenav{position:absolute;inset-block:0;inset-inline-start:0;z-index:0;width:3rem}html[data-boot-pending] #astryx-app-shell-main{position:relative;z-index:1;width:100%;height:100%;max-width:none;margin:0;border-radius:0;clip-path:none;background:#262626;color:#fff}html[data-boot-pending] #astryx-app-shell-main>:not([data-boot]){visibility:hidden}html[data-boot-pending] [data-boot]{position:absolute;inset:0;z-index:2;display:grid;place-items:center;background:#262626;color:#fff}'
					}
				</style>
				<noscript>
					<style>
						{
							'html[data-boot-pending],html[data-boot-pending] body{background:#000}html[data-boot-pending] #astryx-app-shell-main>:not([data-boot]){visibility:visible !important}[data-boot]{display:none !important}'
						}
					</style>
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
