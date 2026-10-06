import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { IconKey } from '@tabler/icons-react';
import {
	clearPlaygroundRunPayload,
	loadPlaygroundRunPayload,
	type PlaygroundRunPayload,
	playgroundRunDefines,
	readPlaygroundRunIdFromUrl,
} from '@theoremjs/playground';
import { playgroundKeySlots } from '@theoremjs/playground/browser';
import { TheoremThemeProvider } from '@theoremjs/react/ui';
import { useState } from 'react';
import { redirect } from 'react-router';
import { PlaygroundKeys, usePlaygroundConnection } from '../components/playground-connection';
import { PlaygroundRunner } from '../components/playground-runner';
import type { Route } from './+types/playground.run';
import './run.css';

/** A model binding as the connection reads it. */
type ConnectionModel = Parameters<typeof usePlaygroundConnection>[0][number];

/** Where the run tab returns to. */
const PLAYGROUND_HREF = '/playground';

/** The compiled draft lives in this browser's storage, so it only loads client-side. */
export function clientLoader({ request }: Route.ClientLoaderArgs) {
	const runId = readPlaygroundRunIdFromUrl(request.url);
	const payload = runId ? loadPlaygroundRunPayload(runId) : null;
	if (!runId || !payload) return redirect(PLAYGROUND_HREF);
	if (!playgroundRunDefines(payload)) {
		clearPlaygroundRunPayload(runId);
		return redirect(PLAYGROUND_HREF);
	}
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
}: {
	connection: ReturnType<typeof usePlaygroundConnection>;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onAddSlot: (slot: string) => void;
	onRenameSlot: (from: string, to: string) => void;
}) {
	return (
		<Popover
			label="Keys"
			placement="below"
			alignment="start"
			width={360}
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			content={
				<PlaygroundKeys connection={connection} onAddSlot={onAddSlot} onRenameSlot={onRenameSlot} />
			}
		>
			<IconButton
				label="Keys"
				variant="ghost"
				icon={<Icon icon={IconKey} size="sm" />}
				tooltip="Keys"
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
	const { mode, runtime } = connection;
	// A host has no handle: it's named by its id.
	const handle = 'identity' in payload.profile ? payload.profile.identity.handle : payload.agentId;
	const renameSlot = (from: string, to: string) => {
		setPayload((current) => withRenamedSlot(current, from, to));
	};

	return (
		<TheoremThemeProvider mode="dark">
			{/* The draft exists only in the browser, so the title is set after hydration. */}
			<title>{`${handle} · Theorem Playground`}</title>
			<HStack className="iface-run-link" gap={2} vAlign="center">
				<a href={PLAYGROUND_HREF}>← Playground</a>
				<KeysPopover
					connection={connection}
					isOpen={keysOpen}
					onOpenChange={setKeysOpen}
					onAddSlot={(slot) => {
						setPayload((current) => withAddedSlot(current, slot));
					}}
					onRenameSlot={renameSlot}
				/>
			</HStack>
			<PlaygroundRunner
				key={mode}
				payload={payload}
				mode={mode}
				runtime={runtime}
				className="run-chat"
			/>
		</TheoremThemeProvider>
	);
}
