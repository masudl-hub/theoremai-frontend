import {
	createPlaygroundHostTransport,
	createPlaygroundTransport,
	loadPlaygroundRunPayload,
	type PlaygroundRunPayload,
	playgroundInterface,
	playgroundLiveConnection,
	readPlaygroundRunIdFromUrl,
} from '@theoremjs/playground';
import { LiveRunner } from '@theoremjs/react/live';
import { TheoremChat, TheoremHost, TheoremThemeProvider } from '@theoremjs/react/ui';
import { useMemo } from 'react';
import { redirect } from 'react-router';
import { PlaygroundDecision } from '../components/playground-decision';
import type { Route } from './+types/playground.run';
import './run.css';

/** Where the run tab returns to. */
const PLAYGROUND_HREF = '/playground';

/** The compiled draft lives in this browser's storage, so it only loads client-side. */
export function clientLoader({ request }: Route.ClientLoaderArgs) {
	const runId = readPlaygroundRunIdFromUrl(request.url);
	const payload = runId ? loadPlaygroundRunPayload(runId) : null;
	if (!payload) return redirect(PLAYGROUND_HREF);
	return { payload };
}

export function HydrateFallback() {
	return null;
}

/** A host's run: its tools as a console, each request drawn from the tool's schema. */
function HostRun({ payload }: { payload: PlaygroundRunPayload }) {
	const transport = useMemo(() => createPlaygroundHostTransport(payload), [payload]);
	return <TheoremHost transport={transport} className="run-chat" />;
}

/** A turn-based run: the chat, or the live runner. */
function TurnRun({ payload }: { payload: PlaygroundRunPayload }) {
	const iface = useMemo(() => playgroundInterface(payload), [payload]);
	const transport = useMemo(() => createPlaygroundTransport(payload), [payload]);
	return iface.type === 'live' ? (
		<LiveRunner iface={iface} connection={() => playgroundLiveConnection(payload)} />
	) : (
		<TheoremChat transport={transport} className="run-chat" />
	);
}

export default function PlaygroundRun({ loaderData }: Route.ComponentProps) {
	const { payload } = loaderData;
	// A host has no handle: it's named by its id.
	const handle = 'identity' in payload.profile ? payload.profile.identity.handle : payload.agentId;

	return (
		<TheoremThemeProvider>
			{/* The draft exists only in the browser, so the title is set after hydration. */}
			<title>{`${handle} · Theorem Playground`}</title>
			<a className="iface-run-link" href={PLAYGROUND_HREF}>
				← Playground
			</a>
			{payload.profile.type === 'decision' ? (
				<PlaygroundDecision payload={payload} className="run-chat" />
			) : payload.profile.type === 'host' ? (
				<HostRun payload={payload} />
			) : (
				<TurnRun payload={payload} />
			)}
		</TheoremThemeProvider>
	);
}
