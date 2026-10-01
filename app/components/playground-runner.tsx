import { EmptyState } from '@astryxdesign/core/EmptyState';
import {
	createPlaygroundHostTransport,
	createPlaygroundTransport,
	type PlaygroundConnectionMode,
	type PlaygroundRunPayload,
	playgroundInterface,
	playgroundLiveConnection,
} from '@theoremjs/playground';
import {
	browserPlaygroundLiveConnection,
	createBrowserPlaygroundHostTransport,
	createBrowserPlaygroundTransport,
	type PlaygroundBrowserRuntime,
} from '@theoremjs/playground/browser';
import { createTraceFeed, type TraceFeed } from '@theoremjs/react/client';
import { LiveRunner } from '@theoremjs/react/live';
import { TheoremChat, TheoremHost } from '@theoremjs/react/ui';
import { useMemo, useState } from 'react';
import { PLAYGROUND_LABELS } from '../lib/playground-labels';
import { PlaygroundDecision } from './playground-decision';

/**
 * The builder preview and existing run page select transports under the same runner UI.
 *
 * A runner is one conversation. The chat keeps its transcript when an edit recompiles the draft,
 * so its trace feed outlives each transport too; remount the runner (a new `key`) to start over.
 */
export function PlaygroundRunner({
	payload,
	mode,
	runtime,
	trace,
	className,
}: {
	payload: PlaygroundRunPayload;
	mode: PlaygroundConnectionMode;
	runtime: PlaygroundBrowserRuntime | null;
	trace?: boolean;
	className?: string;
}) {
	const [traces] = useState(createTraceFeed);
	if (mode !== 'demo' && !runtime)
		return (
			<EmptyState
				title="Connect to run"
				description="Enter your provider keys or local endpoint above."
			/>
		);
	if (payload.profile.type === 'decision')
		return (
			<PlaygroundDecision
				payload={payload}
				runtime={runtime}
				traces={traces}
				className={className}
			/>
		);
	if (payload.profile.type === 'host')
		return (
			<HostRun
				payload={payload}
				runtime={runtime}
				traces={traces}
				trace={trace}
				className={className}
			/>
		);
	return (
		<TurnRun
			payload={payload}
			runtime={runtime}
			traces={traces}
			trace={trace}
			className={className}
		/>
	);
}

type RunProps = Omit<Parameters<typeof PlaygroundRunner>[0], 'mode'> & { traces: TraceFeed };
function HostRun({ payload, runtime, traces, trace, className }: RunProps) {
	const transport = useMemo(
		() =>
			runtime
				? createBrowserPlaygroundHostTransport(payload, runtime, { traces })
				: createPlaygroundHostTransport(payload, { traces }),
		[payload, runtime, traces],
	);
	return (
		<TheoremHost
			labels={PLAYGROUND_LABELS}
			transport={transport}
			trace={trace}
			className={className}
		/>
	);
}
function TurnRun({ payload, runtime, traces, trace, className }: RunProps) {
	const iface = useMemo(() => playgroundInterface(payload), [payload]);
	const transport = useMemo(
		() =>
			runtime
				? createBrowserPlaygroundTransport(payload, runtime, { traces })
				: createPlaygroundTransport(payload, { traces }),
		[payload, runtime, traces],
	);
	return iface.type === 'live' ? (
		<LiveRunner
			labels={PLAYGROUND_LABELS}
			iface={iface}
			connection={() =>
				runtime
					? browserPlaygroundLiveConnection(payload, runtime)
					: playgroundLiveConnection(payload)
			}
			trace={trace}
		/>
	) : (
		<TheoremChat
			labels={PLAYGROUND_LABELS}
			transport={transport}
			trace={trace}
			className={className}
		/>
	);
}
