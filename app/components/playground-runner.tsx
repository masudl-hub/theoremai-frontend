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
import { LiveRunner } from '@theoremjs/react/live';
import { TheoremChat, TheoremHost } from '@theoremjs/react/ui';
import { useMemo } from 'react';
import { PLAYGROUND_LABELS } from '../lib/playground-labels';
import { PlaygroundDecision } from './playground-decision';

/** The builder preview and existing run page select transports under the same runner UI. */
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
	if (mode !== 'demo' && !runtime)
		return (
			<EmptyState
				title="Connect to run"
				description="Enter your provider keys or local endpoint above."
			/>
		);
	if (payload.profile.type === 'decision')
		return <PlaygroundDecision payload={payload} runtime={runtime} className={className} />;
	if (payload.profile.type === 'host')
		return <HostRun payload={payload} runtime={runtime} trace={trace} className={className} />;
	return <TurnRun payload={payload} runtime={runtime} trace={trace} className={className} />;
}

type RunProps = Omit<Parameters<typeof PlaygroundRunner>[0], 'mode'>;
function HostRun({ payload, runtime, trace, className }: RunProps) {
	const transport = useMemo(
		() =>
			runtime
				? createBrowserPlaygroundHostTransport(payload, runtime)
				: createPlaygroundHostTransport(payload),
		[payload, runtime],
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
function TurnRun({ payload, runtime, trace, className }: RunProps) {
	const iface = useMemo(() => playgroundInterface(payload), [payload]);
	const transport = useMemo(
		() =>
			runtime
				? createBrowserPlaygroundTransport(payload, runtime)
				: createPlaygroundTransport(payload),
		[payload, runtime],
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
