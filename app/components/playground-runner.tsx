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
import { type ComponentProps, useMemo, useRef, useState } from 'react';
import { noting } from '../lib/playground-activity';
import { PLAYGROUND_LABELS } from '../lib/playground-labels';
import { PlaygroundDecision } from './playground-decision';

export interface PlaygroundRunnerProps {
	payload: PlaygroundRunPayload;
	mode: PlaygroundConnectionMode;
	runtime: PlaygroundBrowserRuntime | null;
	trace?: boolean;
	className?: string;
	/** Called on each request the conversation sends: a turn, call, decision or live session. */
	onActivity?: () => void;
	/** A chat conversation to resume, as `onChatChange` reported it (text and image agents). */
	initialChat?: ChatProps['initialChat'];
	/** The text a chat's composer starts with. */
	initialText?: ChatProps['initialText'];
	onChatChange?: ChatProps['onChatChange'];
	chatRef?: ChatProps['chatRef'];
}

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
	onActivity,
	initialChat,
	initialText,
	onChatChange,
	chatRef,
}: PlaygroundRunnerProps) {
	const [traces] = useState(createTraceFeed);
	const activity = useRef(onActivity);
	activity.current = onActivity;
	const [note] = useState(() => () => activity.current?.());
	if (mode !== 'demo' && !runtime)
		return (
			<EmptyState
				title="Connect to run"
				description="Add your provider keys or local endpoint under Keys."
			/>
		);
	if (payload.profile.type === 'decision')
		return (
			<PlaygroundDecision
				payload={payload}
				runtime={runtime}
				traces={traces}
				className={className}
				onActivity={note}
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
				note={note}
			/>
		);
	return (
		<TurnRun
			payload={payload}
			runtime={runtime}
			traces={traces}
			trace={trace}
			className={className}
			note={note}
			initialChat={initialChat}
			initialText={initialText}
			onChatChange={onChatChange}
			chatRef={chatRef}
		/>
	);
}

export type ChatProps = ComponentProps<typeof TheoremChat>;
type RunProps = Omit<Parameters<typeof PlaygroundRunner>[0], 'mode' | 'onActivity'> & {
	traces: TraceFeed;
	note: () => void;
};
function HostRun({ payload, runtime, traces, trace, className, note }: RunProps) {
	const transport = useMemo(
		() =>
			noting(
				runtime
					? createBrowserPlaygroundHostTransport(payload, runtime, { traces })
					: createPlaygroundHostTransport(payload, { traces }),
				note,
			),
		[payload, runtime, traces, note],
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
function TurnRun({
	payload,
	runtime,
	traces,
	trace,
	className,
	note,
	initialChat,
	initialText,
	onChatChange,
	chatRef,
}: RunProps) {
	const iface = useMemo(() => playgroundInterface(payload), [payload]);
	const transport = useMemo(
		() =>
			noting(
				runtime
					? createBrowserPlaygroundTransport(payload, runtime, { traces })
					: createPlaygroundTransport(payload, { traces }),
				note,
			),
		[payload, runtime, traces, note],
	);
	return iface.type === 'live' ? (
		<LiveRunner
			labels={PLAYGROUND_LABELS}
			iface={iface}
			connection={() => {
				note();
				return runtime
					? browserPlaygroundLiveConnection(payload, runtime)
					: playgroundLiveConnection(payload);
			}}
			trace={trace}
		/>
	) : (
		<TheoremChat
			labels={PLAYGROUND_LABELS}
			transport={transport}
			trace={trace}
			className={className}
			initialChat={initialChat}
			initialText={initialText}
			onChatChange={onChatChange}
			chatRef={chatRef}
		/>
	);
}
