import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Popover } from '@astryxdesign/core/Popover';
import { IconActivity, IconKey } from '@tabler/icons-react';
import { type ModelBinding, resolveObservabilityPolicy } from '@theoremjs/agents';
import { TheoremThemeProvider, TracePlacement } from '@theoremjs/react/ui';
import {
	clearStaleStudioRuns,
	loadStudioRunPayload,
	readStudioRunIdFromUrl,
	type StudioRunPayload,
} from '@theoremjs/studio';
import { studioKeySlots } from '@theoremjs/studio/browser';
import { useState, useSyncExternalStore } from 'react';
import { redirect } from 'react-router';
import { StudioKeys, useStudioConnection } from '../components/studio-connection';
import { StudioRunner } from '../components/studio-runner';
import { ProjectContext, projectSession } from '../lib/studio-project';
import type { Th30PageHandle } from '../lib/th30-page';
import type { Route } from './+types/studio.run';
import './run.css';

/** A model binding as the connection reads it. */
type ConnectionModel = Parameters<typeof useStudioConnection>[0][number];

/** Where a missing draft returns to. */
const STUDIO_HREF = '/studio';

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
function recordsTrace(payload: StudioRunPayload): boolean {
	return resolveObservabilityPolicy(payload.profile.observability).record;
}

/** The name the page and the document title use. A host has no handle: it's named by its id. */
function runTitle(payload: StudioRunPayload): string {
	return 'identity' in payload.profile ? payload.profile.identity.handle : payload.agentId;
}

export const handle = {
	th30Page: (data: Route.ComponentProps['loaderData'] | undefined) => ({
		// The draft loads in the browser, so the server render has no payload yet.
		title: data?.payload ? runTitle(data.payload) : 'Run',
		summary:
			'The agent opened from the studio with Open in a new tab. It fills the panel beside the rail. A decision or a host starts as the centred request. When it runs, the request moves left and the response comes in on the right. The trace docks at the right and eases open. View trace and Keys sit inside that panel, at the top right. The rail returns to the studio.',
	}),
} satisfies Th30PageHandle;

/** The compiled draft lives in this browser's storage, so it only loads client-side. */
export function clientLoader({ request }: Route.ClientLoaderArgs) {
	clearStaleStudioRuns();
	const runId = readStudioRunIdFromUrl(request.url);
	const payload = runId ? loadStudioRunPayload(runId) : null;
	if (!payload) return redirect(STUDIO_HREF);
	// A project's agent, opened from the studio: the dev server only, where a project can be open.
	const name = import.meta.env.DEV ? new URL(request.url).searchParams.get('project') : null;
	return { payload, project: name ? projectSession(name) : null };
}

export function HydrateFallback() {
	return null;
}

/** `payload` with each `from` slot, on its agent and the agents it calls, renamed to `to`. */
function withRenamedSlot(current: StudioRunPayload, from: string, to: string): StudioRunPayload {
	const rename = <T extends { keySlot?: string; fallbackKeySlot?: string }>(value: T): T => ({
		...value,
		...(value.keySlot === from ? { keySlot: to } : {}),
		...(value.fallbackKeySlot === from ? { fallbackKeySlot: to } : {}),
	});
	const renamed = (profile: StudioRunPayload['profile']): StudioRunPayload['profile'] =>
		profile.type === 'host'
			? profile
			: {
					...profile,
					models: Object.fromEntries(
						Object.entries<ModelBinding>(profile.models).map(([id, model]) => [id, rename(model)]),
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
function withAddedSlot(current: StudioRunPayload, slot: string): StudioRunPayload {
	if (current.profile.type === 'host') return current;
	return {
		...current,
		profile: {
			...current.profile,
			models: Object.fromEntries(
				Object.entries<ModelBinding>(current.profile.models).map(([id, binding]) => [
					id,
					binding.keySlot ? binding : { ...binding, keySlot: slot },
				]),
			),
		},
	};
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
	connection: ReturnType<typeof useStudioConnection>;
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
				<StudioKeys connection={connection} onAddSlot={onAddSlot} onRenameSlot={onRenameSlot} />
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

export default function StudioRun({ loaderData }: Route.ComponentProps) {
	const [payload, setPayload] = useState(loaderData.payload);
	// The agent and the agents it calls each read their own key slots.
	const profiles = [
		payload.profile,
		...(payload.dependencies ?? []).map((dependency) => dependency.profile),
	];
	const models = profiles.flatMap((profile) =>
		profile.type === 'host'
			? []
			: Object.values<ModelBinding>(profile.models).map(
					(binding): ConnectionModel => ({
						...binding,
						protocol:
							profile.type === 'decision'
								? 'decision'
								: binding.provider === 'google'
									? profile.type === 'live'
										? 'geminiLive'
										: 'geminiInteractions'
									: 'openAi',
					}),
				),
	);
	const connection = useStudioConnection(
		models,
		payload.localBaseUrl,
		profiles.flatMap((profile) => studioKeySlots(profile)),
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
			<title>{`${title} · theorem studio`}</title>
			<TracePlacement value="panel">
				<div className="run-page">
					<div className="run-controls">
						{traced ? (
							<Button
								label={traceOpen ? 'Hide trace' : 'View trace'}
								isIconOnly={phone}
								icon={<Icon icon={IconActivity} size="sm" />}
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
					<ProjectContext.Provider value={loaderData.project}>
						<StudioRunner
							key={mode}
							payload={payload}
							mode={mode}
							runtime={runtime}
							trace={traced ? traceOpen : undefined}
							flush
							columns
							className="run-chat"
						/>
					</ProjectContext.Provider>
				</div>
			</TracePlacement>
		</TheoremThemeProvider>
	);
}
