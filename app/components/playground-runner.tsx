import { EmptyState } from '@astryxdesign/core/EmptyState';
import {
	createPlaygroundHostTransport,
	createPlaygroundTransport,
	type PlaygroundConnectionMode,
	type PlaygroundRunPayload,
	playgroundInterface,
	playgroundLiveConnection,
	playgroundPageTools,
} from '@theoremjs/playground';
import {
	browserPlaygroundLiveConnection,
	createBrowserPlaygroundHostTransport,
	createBrowserPlaygroundTransport,
	type PlaygroundBrowserRuntime,
} from '@theoremjs/playground/browser';
import {
	createHostTransport,
	createHttpTransport,
	createTraceFeed,
	type TraceFeed,
} from '@theoremjs/react/client';
import { LiveRunner } from '@theoremjs/react/live';
import { TheoremChat, TheoremHost } from '@theoremjs/react/ui';
import { type ComponentProps, useMemo, useRef, useState } from 'react';
import { noting } from '../lib/playground-activity';
import { PLAYGROUND_LABELS } from '../lib/playground-labels';
import { type StudioSession, studioProfileEndpoint, useStudio } from '../lib/studio';
import { PlaygroundDecision } from './playground-decision';

export interface PlaygroundRunnerProps {
	payload: PlaygroundRunPayload;
	mode: PlaygroundConnectionMode;
	runtime: PlaygroundBrowserRuntime | null;
	trace?: boolean;
	className?: string;
	/** The run page is already the shell. A decision or host sits in it, rather than on its own ground. */
	flush?: boolean;
	/** A decision or host puts the request on the left and the response on the right. */
	columns?: boolean;
	/** Called on each request the conversation sends: a turn, call, decision or live session. */
	onActivity?: () => void;
	/** A chat conversation to resume, as `onChatChange` reported it (text and image agents). */
	initialChat?: ChatProps['initialChat'];
	/** The text a chat's composer starts with. */
	initialText?: ChatProps['initialText'];
	onChatChange?: ChatProps['onChatChange'];
	chatRef?: ChatProps['chatRef'];
	/** The value the page picked for each slot, for a chat's turns and a call's start. */
	slots?: ChatProps['slots'];
	/** What the page tells the agent. */
	context?: ChatProps['context'];
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
	flush,
	columns,
	onActivity,
	initialChat,
	initialText,
	onChatChange,
	chatRef,
	slots,
	context,
}: PlaygroundRunnerProps) {
	const [traces] = useState(createTraceFeed);
	const activity = useRef(onActivity);
	activity.current = onActivity;
	const [note] = useState(() => () => activity.current?.());
	const studio = useStudio();
	if (studio)
		return (
			<StudioRun
				studio={studio}
				payload={payload}
				trace={trace}
				className={className}
				flush={flush}
				columns={columns}
				note={note}
				chatRef={chatRef}
				slots={slots}
				context={context}
			/>
		);
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
				trace={trace}
				className={className}
				onActivity={note}
				flush={flush}
				columns={columns}
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
				flush={flush}
				columns={columns}
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
			slots={slots}
			context={context}
		/>
	);
}

export type ChatProps = ComponentProps<typeof TheoremChat>;
type RunProps = Omit<Parameters<typeof PlaygroundRunner>[0], 'mode' | 'onActivity'> & {
	traces: TraceFeed;
	note: () => void;
};
/**
 * A project's profile, run by the studio's local server: the project's own tools and models, not
 * the draft on the page. The page names the profile by its id.
 */
function StudioRun({
	studio,
	payload,
	trace,
	className,
	flush,
	columns,
	note,
	chatRef,
	slots,
	context,
}: Omit<RunProps, 'runtime' | 'traces'> & { studio: StudioSession }) {
	const { type } = payload.profile;
	const endpoint = studioProfileEndpoint(studio, payload.agentId);
	const host = useMemo(
		() => (type === 'host' ? noting(createHostTransport({ endpoint }), note) : null),
		[type, endpoint, note],
	);
	const turn = useMemo(
		() =>
			type === 'host' || type === 'decision' || type === 'live'
				? null
				: noting(createHttpTransport({ endpoint }), note),
		[type, endpoint, note],
	);
	if (host)
		return (
			<TheoremHost
				detectCodeLanguage
				labels={PLAYGROUND_LABELS}
				transport={host}
				trace={trace}
				flush={flush}
				columns={columns}
				className={className}
			/>
		);
	if (turn)
		return (
			<TheoremChat
				detectCodeLanguage
				labels={PLAYGROUND_LABELS}
				transport={turn}
				trace={trace}
				className={className}
				chatRef={chatRef}
				slots={slots}
				context={context}
			/>
		);
	return (
		<EmptyState
			title="Not run here yet"
			description={`The studio shows a ${type} profile but does not run one yet.`}
		/>
	);
}
function HostRun({ payload, runtime, traces, trace, className, flush, columns, note }: RunProps) {
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
			detectCodeLanguage
			labels={PLAYGROUND_LABELS}
			transport={transport}
			trace={trace}
			flush={flush}
			columns={columns}
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
	slots,
	context,
}: RunProps) {
	const iface = useMemo(() => playgroundInterface(payload), [payload]);
	/** The playground's page answers each page tool with the tool's stub. */
	const pageTools = useMemo(() => playgroundPageTools(payload), [payload]);
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
			slots={slots}
			context={context}
			pageTools={pageTools}
		/>
	) : (
		<TheoremChat
			detectCodeLanguage
			labels={PLAYGROUND_LABELS}
			transport={transport}
			trace={trace}
			className={className}
			initialChat={initialChat}
			initialText={initialText}
			onChatChange={onChatChange}
			chatRef={chatRef}
			slots={slots}
			context={context}
			pageTools={pageTools}
		/>
	);
}
