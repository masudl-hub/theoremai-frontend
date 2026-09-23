import {
	createPlaygroundTransport,
	loadPlaygroundRunPayload,
	type PlaygroundRunPayload,
	playgroundInterface,
	readPlaygroundRunIdFromUrl,
	registerPlaygroundLiveProfile,
} from '@theoremai/playground';
import { LiveRunner } from '@theoremai/react/live';
import { TheoremChat, TheoremThemeProvider } from '@theoremai/react/ui';
import { StrictMode, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import './run.css';

const PLAYGROUND_HREF = '/#playground';

/** Compiled draft handed over by the playground tab, or back to the playground. */
function loadPayload(): PlaygroundRunPayload | null {
	const runId = readPlaygroundRunIdFromUrl();
	const payload = runId ? loadPlaygroundRunPayload(runId) : null;
	if (!payload) globalThis.location.href = PLAYGROUND_HREF;
	return payload;
}

function RunApp({ payload }: { payload: PlaygroundRunPayload }) {
	const iface = useMemo(() => playgroundInterface(payload), [payload]);
	const transport = useMemo(() => createPlaygroundTransport(payload), [payload]);

	useEffect(() => {
		document.title = `${iface.identity.handle} · Theorem Playground`;
	}, [iface]);

	return (
		<TheoremThemeProvider>
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

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
const payload = loadPayload();

createRoot(root).render(<StrictMode>{payload ? <RunApp payload={payload} /> : null}</StrictMode>);
