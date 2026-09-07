<script lang="ts">
import { onMount } from 'svelte';
import { defineProfile } from 'theorum';
import { interfaceFromProfile, type TranscriptBlock } from 'theorum/interface';
import { base, resolve } from '$app/paths';
import InterfaceRunner from '$lib/components/interface/InterfaceRunner.svelte';
import LiveRunner from '$lib/components/interface/live/LiveRunner.svelte';
import { filesToPending } from '$lib/interface/encode-files';
import {
	clearPlaygroundRunPayload,
	loadPlaygroundRunPayload,
	type PlaygroundRunPayload,
} from '$lib/interface/run-payload';
import { prepareInterfaceDraft, streamInterfaceTurn } from '$lib/interface/run-session';

let payload = $state<PlaygroundRunPayload | null>(null);
let ready = $state(false);
let blocks = $state<TranscriptBlock[]>([]);
let streamBlocks = $state<TranscriptBlock[]>([]);
let draftText = $state('');
let pendingFiles = $state<File[]>([]);
let issues = $state<string[]>([]);
let error = $state('');
let busy = $state(false);
let chatStarted = $state(false);
let streaming = $state(false);

const isLive = $derived(payload?.profile.type === 'live');
const iface = $derived(
	payload && !isLive ? interfaceFromProfile(defineProfile(payload.profile)) : null,
);
const liveIface = $derived(
	payload && isLive ? interfaceFromProfile(defineProfile(payload.profile)) : null,
);
const pendingLabels = $derived(filesToPending(pendingFiles).map((file) => file.name));

const canSubmit = $derived(
	!busy &&
		Boolean(
			(iface?.inputs.text && draftText.trim().length > 0) ||
				(iface?.inputs.attachments && pendingFiles.length > 0),
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

async function handleSubmit() {
	if (!iface || !payload || busy) return;
	issues = [];
	error = '';

	const prepared = prepareInterfaceDraft(iface, draftText, pendingFiles);
	if (!prepared.ok) {
		issues = prepared.issues;
		return;
	}

	chatStarted = true;
	blocks = [...blocks, ...prepared.blocks];
	const pendingSnapshot = [...pendingFiles];
	draftText = '';
	pendingFiles = [];
	busy = true;
	streaming = true;
	streamBlocks = [];

	const result = await streamInterfaceTurn({
		iface,
		payload,
		text: prepared.draft.text ?? '',
		pendingFiles: pendingSnapshot,
		onStream: (partial) => {
			streamBlocks = partial;
		},
	});

	busy = false;
	streaming = false;

	if (!result.ok) {
		error = result.error;
		streamBlocks = [];
		return;
	}

	blocks = [...blocks, ...result.assistantBlocks];
	streamBlocks = [];
}
</script>

<svelte:head>
	<title>{(liveIface ?? iface)?.identity.handle ?? 'Run'} · Theorum Playground</title>
</svelte:head>

<a class="iface-run-link" href="{resolve('/')}#playground">← Playground</a>

{#if error}
	<p class="iface-run-error" role="alert">{error}</p>
{/if}

{#if pendingLabels.length && !chatStarted}
	<ul class="iface-pending" aria-label="Pending attachments">
		{#each pendingLabels as name (name)}
			<li>{name}</li>
		{/each}
	</ul>
{/if}

{#if !ready}
	<p class="iface-run-loading" aria-busy="true">Loading…</p>
{:else if isLive && liveIface && payload}
	<LiveRunner iface={liveIface} {payload} />
{:else if iface && payload}
	<InterfaceRunner
		attachmentCount={pendingFiles.length}
		{blocks}
		{busy}
		{canSubmit}
		{chatStarted}
		{draftText}
		{iface}
		issues={[...issues]}
		onDraftTextChange={(value) => {
			draftText = value;
		}}
		onFilesSelected={(files) => {
			pendingFiles = [...pendingFiles, ...files];
			issues = [];
		}}
		onSubmit={handleSubmit}
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
</style>
