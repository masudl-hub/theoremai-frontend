<script lang="ts">
import { onMount } from 'svelte';
import { defineProfile } from 'theorum';
import {
	branchInterfaceTurnSession,
	defaultInterfaceEffort,
	defaultInterfaceModel,
	emptyInterfaceTurnSession,
	type InterfaceTurnSession,
	interfaceFromProfile,
	type TranscriptBlock,
} from 'theorum/interface';
import type { ToolCredential } from 'theorum/kernel';
import { base, resolve } from '$app/paths';
import InterfaceRunner from '$lib/components/interface/InterfaceRunner.svelte';
import LiveRunner from '$lib/components/interface/live/LiveRunner.svelte';
import {
	clearPlaygroundRunPayload,
	loadPlaygroundRunPayload,
	type PlaygroundRunPayload,
} from '$lib/interface/run-payload';
import {
	applyTurnResultToTranscript,
	resumeInterfaceTool,
	streamInterfaceTurn,
} from '$lib/interface/run-session';
import type { ToolDecisionAction } from '$lib/interface/tool-resume';

let payload = $state<PlaygroundRunPayload | null>(null);
let ready = $state(false);
let blocks = $state<TranscriptBlock[]>([]);
let streamBlocks = $state<TranscriptBlock[]>([]);
let draftText = $state('');
let pendingFiles = $state<File[]>([]);
let pendingVoice = $state<File[]>([]);
let issues = $state<string[]>([]);
let error = $state('');
let busy = $state(false);
let chatStarted = $state(false);
let streaming = $state(false);
let session = $state<InterfaceTurnSession>(emptyInterfaceTurnSession());

const isLive = $derived(payload?.profile.type === 'live');
const iface = $derived.by(() => {
	if (!payload || payload.profile.type === 'live') return null;
	return interfaceFromProfile(defineProfile(payload.profile));
});
const liveIface = $derived.by(() => {
	if (payload?.profile.type !== 'live') return null;
	return interfaceFromProfile(defineProfile(payload.profile));
});
const playgroundHref = $derived(`${resolve('/', {})}#playground`);
const paused = $derived(session.pausedTool !== null);

const canSubmit = $derived(
	!busy &&
		!paused &&
		Boolean(
			(iface?.inputs.text && draftText.trim().length > 0) ||
				(iface?.inputs.attachments && pendingFiles.length > 0) ||
				(iface?.inputs.voice && pendingVoice.length > 0),
		),
);

onMount(() => {
	const loaded = loadPlaygroundRunPayload();
	if (!loaded) {
		window.location.href = `${base}/#playground`;
		return;
	}
	clearPlaygroundRunPayload();
	payload = loaded;
	ready = true;
});

$effect(() => {
	const composer = iface;
	if (!composer) return;
	const model = session.selectedModel ?? defaultInterfaceModel(composer);
	if (!model) return;
	const effort = defaultInterfaceEffort(composer, model);
	if (!session.selectedModel || (effort && !session.selectedEffort)) {
		session = {
			...session,
			selectedModel: session.selectedModel ?? model,
			...(effort ? { selectedEffort: session.selectedEffort ?? effort } : {}),
		};
	}
});

function handleGenerationChange(next: { modelId: string; effort?: string }) {
	const composer = iface;
	const effort =
		next.effort ?? (composer ? defaultInterfaceEffort(composer, next.modelId) : undefined);
	session = {
		...session,
		selectedModel: next.modelId,
		...(effort ? { selectedEffort: effort } : { selectedEffort: undefined }),
	};
}

type TurnOk = {
	ok: true;
	session: InterfaceTurnSession;
	userBlocks?: TranscriptBlock[];
	assistantBlocks: TranscriptBlock[];
};

async function runTurnStream(
	run: (
		onStream: (partial: TranscriptBlock[]) => void,
	) => Promise<TurnOk | { ok: false; error: string; issues?: string[] }>,
	options: { userBlocksAlreadyApplied?: boolean } = {},
) {
	if (!iface || !payload || busy) return;
	error = '';
	busy = true;
	streaming = true;

	const result = await run((partial) => {
		streamBlocks = partial;
	});

	busy = false;
	streaming = false;

	if (!result.ok) {
		error = result.error;
		if (result.issues) {
			issues = result.issues;
		}
		streamBlocks = [];
		return;
	}

	const merged = applyTurnResultToTranscript({
		blocks,
		streamBlocks,
		session: result.session,
		userBlocks: options.userBlocksAlreadyApplied ? undefined : result.userBlocks,
		assistantBlocks: result.assistantBlocks,
	});
	blocks = merged.blocks;
	streamBlocks = merged.streamBlocks;
	session = merged.session;
}

async function handleSubmit() {
	const composer = iface;
	const runPayload = payload;
	if (!composer || !runPayload || paused) return;
	issues = [];

	const textSnapshot = draftText;
	const pendingSnapshot = [...pendingFiles];
	const voiceSnapshot = [...pendingVoice];

	await runTurnStream(
		(onStream) =>
			streamInterfaceTurn({
				iface: composer,
				payload: runPayload,
				session,
				text: textSnapshot,
				pendingFiles: pendingSnapshot,
				pendingVoice: voiceSnapshot,
				onStream,
				onUserBlocks: (userBlocks) => {
					blocks = [...blocks, ...userBlocks];
					chatStarted = true;
					draftText = '';
					pendingFiles = [];
					pendingVoice = [];
				},
			}),
		{ userBlocksAlreadyApplied: true },
	);
}

async function handleToolDecision(
	_index: number,
	action: ToolDecisionAction,
	interactiveValue?: unknown,
) {
	const composer = iface;
	const runPayload = payload;
	if (!composer || !runPayload) return;

	await runTurnStream((onStream) =>
		resumeInterfaceTool({
			iface: composer,
			payload: runPayload,
			session,
			action,
			interactiveValue,
			onStream,
		}),
	);
}

async function handleAuthCredential(_index: number, slot: string, credential: ToolCredential) {
	const composer = iface;
	const runPayload = payload;
	if (!composer || !runPayload) return;

	await runTurnStream((onStream) =>
		resumeInterfaceTool({
			iface: composer,
			payload: runPayload,
			session,
			action: 'allow',
			credentials: { [slot]: credential },
			onStream,
		}),
	);
}

function handleBranch(index: number) {
	const kept = [...blocks, ...streamBlocks].slice(0, index + 1);
	blocks = kept;
	streamBlocks = [];
	streaming = false;
	busy = false;
	chatStarted = kept.length > 0;
	session = branchInterfaceTurnSession(session, kept);
}
</script>

<svelte:head>
	<title>{(liveIface ?? iface)?.identity.handle ?? 'Run'} · Theorum Playground</title>
</svelte:head>

<a class="iface-run-link" href={playgroundHref}>← Playground</a>

{#if error}
	<p class="iface-run-error" role="alert">{error}</p>
{/if}

{#if paused}
	<p class="iface-run-hint" role="status">Waiting for tool approval before you can continue.</p>
{/if}

{#if !ready}
	<p class="iface-run-loading" aria-busy="true">Loading…</p>
{:else if isLive && liveIface && payload}
	<LiveRunner iface={liveIface} {payload} />
{:else if iface && payload}
	<InterfaceRunner
		{blocks}
		{busy}
		{canSubmit}
		{chatStarted}
		{draftText}
		{iface}
		issues={[...issues]}
		onAuthCredential={handleAuthCredential}
		onBranch={handleBranch}
		onDraftTextChange={(value) => {
			draftText = value;
		}}
		onFilesSelected={(files) => {
			pendingFiles = [...pendingFiles, ...files];
			issues = [];
		}}
		onAttachmentRemove={(index) => {
			pendingFiles = pendingFiles.filter((_, i) => i !== index);
		}}
		onVoiceStaged={(file) => {
			pendingVoice = [file];
			issues = [];
		}}
		onVoiceClear={() => {
			pendingVoice = [];
		}}
		onSubmit={handleSubmit}
		onToolDecision={handleToolDecision}
		onGenerationChange={handleGenerationChange}
		{pendingFiles}
		{pendingVoice}
		selectedEffort={session.selectedEffort ?? ''}
		selectedModel={session.selectedModel ?? ''}
		{streamBlocks}
		{streaming}
	/>
{:else}
	<p class="iface-run-error">
		No compiled agent in session. Return to the playground and press Run.
	</p>
{/if}

<style>
:global(body) {
	margin: 0;
	min-height: 100dvh;
}

:global(html) {
	height: 100%;
}

:global(body:has(.iface-stage)),
:global(body:has(.live-stage)) {
	height: 100dvh;
	overflow: hidden;
}

.iface-run-hint {
	margin: 0.5rem 1rem;
	font-size: 0.82rem;
	color: #555;
}
</style>
