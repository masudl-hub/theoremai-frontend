import { Theme } from '@astryxdesign/core/theme';
import type { ReactNode } from 'react';
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from 'react-router';
import type { Route } from './+types/root';
// Figtree is the neutral theme's font; Astryx names it but ships no files. Self-hosted, Latin, the four theme weights.
import '@fontsource/figtree/latin-400.css';
import '@fontsource/figtree/latin-500.css';
import '@fontsource/figtree/latin-600.css';
import '@fontsource/figtree/latin-700.css';
// Astryx's documented order: reset → components → theme.
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './built/theme.css';
import { theoremSiteTheme } from './built/theorem-site';

export const links: Route.LinksFunction = () => [
	{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
];

/** Documents must not be edge-cached across deploys (the custom domain once served max-age=7200). */
export function headers() {
	return { 'Cache-Control': 'no-cache, must-revalidate' };
}

export function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="theme-color" content={theoremSiteTheme.tokens['--color-background-body']} />
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
		<Theme theme={theoremSiteTheme} mode="system">
			<Outlet />
		</Theme>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	const status = isRouteErrorResponse(error) ? error.status : 500;
	return (
		<main>
			<h1>{status === 404 ? 'Not found' : 'Something went wrong'}</h1>
		</main>
	);
}
