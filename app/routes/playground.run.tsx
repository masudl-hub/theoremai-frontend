import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Popover } from '@astryxdesign/core/Popover';
import { IconKey, IconTimeline } from '@tabler/icons-react';
import { resolveObservabilityPolicy } from '@theoremjs/agents';
import {
	clearStalePlaygroundRuns,
	loadPlaygroundRunPayload,
	type PlaygroundRunPayload,
	readPlaygroundRunIdFromUrl,
} from '@theoremjs/playground';
import { playgroundKeySlots } from '@theoremjs/playground/browser';
import { TheoremThemeProvider, TracePlacement } from '@theoremjs/react/ui';
import { useState, useSyncExternalStore } from 'react';
import { redirect } from 'react-router';
import { PlaygroundKeys, usePlaygroundConnection } from '../components/playground-connection';
import { PlaygroundRunner } from '../components/playground-runner';
import type { Th30PageHandle } from '../lib/th30-page';
import type { Route } from './+types/playground.run';
import './run.css';

/** A model binding as the connection reads it. */
type ConnectionModel = Parameters<typeof usePlaygroundConnection>[0][number];

/** Where a missing draft returns to. */
const PLAYGROUND_HREF = '/playground';

/** Below the app shell's drawer breakpoint, where these controls keep only their icon. */
const PHONE = '(width < 768px)';

function usePhone() {
	return useSyncExternalStore(
		(change) => {
			const query = window.matchMedia(PHONE);
			query.addEventListener('change', change);
			return () => {
				query.removeEventListener('change', change);
			};
		},
		() => window.matchMedia(PHONE).matches,
		() => false,
	);
}

/** Whether this run records traces, so the page can offer them. */
function recordsTrace(payload: PlaygroundRunPayload): boolean {
	return resolveObservabilityPolicy(payload.profile.observability).record;
}

/** The name the page and the document title use. A host has no handle: it's named by its id. */
function runTitle(payload: PlaygroundRunPayload): string {
	return 'identity' in payload.profile ? payload.profile.identity.handle : payload.agentId;
}

export const handle = {
	th30Page: (data: Route.ComponentProps['loaderData'] | undefined) => ({
		// The draft loads in the browser, so the server render has no payload yet.
		title: data?.payload ? runTitle(data.payload) : 'Run',
		summary:
			'The agent launched from the playground. It fills the panel beside the rail. A decision or a host puts the request on the left and the response on the right. The trace docks at the right and eases open. View trace and Keys sit inside that panel, at the top right. The rail returns to the playground.',
	}),
} satisfies Th30PageHandle;

/** The compiled draft lives in this browser's storage, so it only loads client-side. */
export function clientLoader({ request }: Route.ClientLoaderArgs) {
	clearStalePlaygroundRuns();
	const runId = readPlaygroundRunIdFromUrl(request.url);
	const payload = runId ? loadPlaygroundRunPayload(runId) : null;
	if (!payload) return redirect(PLAYGROUND_HREF);
	return { payload };
}

export function HydrateFallback() {
	return null;
}

/** `payload` with each `from` slot, on its agent and the agents it calls, renamed to `to`. */
function withRenamedSlot(
	current: PlaygroundRunPayload,
	from: string,
	to: string,
): PlaygroundRunPayload {
	const rename = <T extends { key?: string; fallbackKey?: string }>(value: T): T => ({
		...value,
		...(value.key === from ? { key: to } : {}),
		...(value.fallbackKey === from ? { fallbackKey: to } : {}),
	});
	const renamed = (profile: PlaygroundRunPayload['profile']): PlaygroundRunPayload['profile'] =>
		profile.type === 'host'
			? profile
			: {
					...rename(profile),
					models: Object.fromEntries(
						Object.entries(profile.models).map(([id, model]) => [id, rename(model)]),
					),
				};
	return {
		...current,
		profile: renamed(current.profile),
		...(current.dependencies
			? {
					dependencies: current.dependencies.map((dependency) => ({
						...dependency,
						profile: renamed(dependency.profile),
					})),
				}
			: {}),
	};
}

/** `payload` with `slot` as its agent's key, unless it is a host or has a key already. */
function withAddedSlot(current: PlaygroundRunPayload, slot: string): PlaygroundRunPayload {
	return current.profile.type === 'host' || current.profile.key
		? current
		: { ...current, profile: { ...current.profile, key: slot } };
}

/** The Keys button and the popover it opens. */
function KeysPopover({
	connection,
	isOpen,
	onOpenChange,
	onAddSlot,
	onRenameSlot,
	phone,
}: {
	connection: ReturnType<typeof usePlaygroundConnection>;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onAddSlot: (slot: string) => void;
	onRenameSlot: (from: string, to: string) => void;
	phone: boolean;
}) {
	return (
		<Popover
			label="Keys"
			placement="below"
			alignment="end"
			width={360}
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			content={
				<PlaygroundKeys connection={connection} onAddSlot={onAddSlot} onRenameSlot={onRenameSlot} />
			}
		>
			<Button
				label="Keys"
				isIconOnly={phone}
				icon={<Icon icon={IconKey} size="sm" />}
				aria-pressed={isOpen}
			/>
		</Popover>
	);
}

export default function PlaygroundRun({ loaderData }: Route.ComponentProps) {
	const [payload, setPayload] = useState(loaderData.payload);
	// The agent and the agents it calls each read their own key slots.
	const profiles = [
		payload.profile,
		...(payload.dependencies ?? []).map((dependency) => dependency.profile),
	];
	const models = profiles.flatMap((profile) =>
		profile.type === 'host' ? [] : Object.values<ConnectionModel>(profile.models),
	);
	const connection = usePlaygroundConnection(
		models,
		payload.localBaseUrl,
		profiles.flatMap((profile) => playgroundKeySlots(profile)),
	);
	const [keysOpen, setKeysOpen] = useState(payload.connectionMode === 'byok');
	const traced = recordsTrace(payload);
	const [traceOpen, setTraceOpen] = useState(false);
	const phone = usePhone();
	const { mode, runtime } = connection;
	const title = runTitle(payload);
	const renameSlot = (from: string, to: string) => {
		setPayload((current) => withRenamedSlot(current, from, to));
	};

	return (
		<TheoremThemeProvider mode="dark">
			{/* The draft exists only in the browser, so the title is set after hydration. */}
			<title>{`${title} · Theorem Playground`}</title>
			<TracePlacement value="panel">
				<div className="run-page">
					<div className="run-controls">
						{traced ? (
							<Button
								label={traceOpen ? 'Hide trace' : 'View trace'}
								isIconOnly={phone}
								icon={<Icon icon={IconTimeline} size="sm" />}
								aria-pressed={traceOpen}
								onClick={() => {
									setTraceOpen((open) => !open);
								}}
							/>
						) : null}
						<KeysPopover
							connection={connection}
							isOpen={keysOpen}
							onOpenChange={setKeysOpen}
							onAddSlot={(slot) => {
								setPayload((current) => withAddedSlot(current, slot));
							}}
							onRenameSlot={renameSlot}
							phone={phone}
						/>
					</div>
					<PlaygroundRunner
						key={mode}
						payload={payload}
						mode={mode}
						runtime={runtime}
						trace={traced ? traceOpen : undefined}
						flush
						columns
						className="run-chat"
					/>
				</div>
			</TracePlacement>
		</TheoremThemeProvider>
	);
}
