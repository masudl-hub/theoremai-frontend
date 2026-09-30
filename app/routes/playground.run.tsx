import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { IconKey } from '@tabler/icons-react';
import { loadPlaygroundRunPayload, readPlaygroundRunIdFromUrl } from '@theoremjs/playground';
import { playgroundKeySlots } from '@theoremjs/playground/browser';
import { TheoremThemeProvider } from '@theoremjs/react/ui';
import { useState } from 'react';
import { redirect } from 'react-router';
import { PlaygroundKeys, usePlaygroundConnection } from '../components/playground-connection';
import { PlaygroundRunner } from '../components/playground-runner';
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

export default function PlaygroundRun({ loaderData }: Route.ComponentProps) {
	const [payload, setPayload] = useState(loaderData.payload);
	const models = payload.profile.type === 'host' ? [] : Object.values(payload.profile.models);
	const connection = usePlaygroundConnection(
		models,
		payload.localBaseUrl,
		playgroundKeySlots(payload.profile),
	);
	const [keysOpen, setKeysOpen] = useState(payload.connectionMode === 'byok');
	const { mode, runtime } = connection;
	// A host has no handle: it's named by its id.
	const handle = 'identity' in payload.profile ? payload.profile.identity.handle : payload.agentId;
	const renameSlot = (from: string, to: string) => {
		setPayload((current) => {
			const profile = current.profile;
			if (profile.type === 'host') return current;
			const rename = <T extends { key?: string; fallbackKey?: string }>(value: T): T => ({
				...value,
				...(value.key === from ? { key: to } : {}),
				...(value.fallbackKey === from ? { fallbackKey: to } : {}),
			});
			return {
				...current,
				profile: {
					...rename(profile),
					models: Object.fromEntries(
						Object.entries(profile.models).map(([id, model]) => [id, rename(model)]),
					),
				},
			};
		});
	};

	return (
		<TheoremThemeProvider>
			{/* The draft exists only in the browser, so the title is set after hydration. */}
			<title>{`${handle} · Theorem Playground`}</title>
			<HStack className="iface-run-link" gap={2} vAlign="center">
				<a href={PLAYGROUND_HREF}>← Playground</a>
				<IconButton
					label="Keys"
					variant="ghost"
					icon={<Icon icon={IconKey} size="sm" />}
					onClick={() => {
						setKeysOpen((open) => !open);
					}}
				/>
			</HStack>
			{keysOpen && (
				<PlaygroundKeys
					connection={connection}
					onAddSlot={(slot) => {
						setPayload((current) =>
							current.profile.type === 'host' || current.profile.key
								? current
								: { ...current, profile: { ...current.profile, key: slot } },
						);
					}}
					onRenameSlot={renameSlot}
				/>
			)}
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
