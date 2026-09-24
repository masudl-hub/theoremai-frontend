import {
	createPlaygroundTransport,
	loadPlaygroundRunPayload,
	playgroundInterface,
	readPlaygroundRunIdFromUrl,
	registerPlaygroundLiveProfile,
} from '@theoremai/playground';
import { LiveRunner } from '@theoremai/react/live';
import { TheoremChat, TheoremThemeProvider } from '@theoremai/react/ui';
import { useMemo } from 'react';
import { redirect } from 'react-router';
import type { Route } from './+types/playground.run';
import './run.css';

/** Where the run tab returns to. */
const PLAYGROUND_HREF = '/playground';

/** The compiled draft lives in this browser's storage, so it only loads client-side. */
export function clientLoader({ request }: Route.ClientLoaderArgs) {
	const runId = readPlaygroundRunIdFromUrl(request.url);
	const payload = runId ? loadPlaygroundRunPayload(runId) : null;
	if (!payload) return redirect(PLAYGROUND_HREF);
	return { payload, iface: playgroundInterface(payload) };
}

export function HydrateFallback() {
	return null;
}

export default function PlaygroundRun({ loaderData }: Route.ComponentProps) {
	const { payload, iface } = loaderData;
	const transport = useMemo(() => createPlaygroundTransport(payload), [payload]);

	return (
		<TheoremThemeProvider>
			{/* The draft exists only in the browser, so the title is set after hydration. */}
			<title>{`${iface.identity.handle} · Theorem Playground`}</title>
			<a className="iface-run-link" href={PLAYGROUND_HREF}>
				← Playground
			</a>
			{iface.type === 'live' ? (
				<LiveRunner iface={iface} registerProfile={() => registerPlaygroundLiveProfile(payload)} />
			) : (
				<TheoremChat transport={transport} className="run-chat" />
			)}
		</TheoremThemeProvider>
	);
}
