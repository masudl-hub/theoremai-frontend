<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import type { TurnEvent } from 'theorum';
import { liveIngressEnabledFromSpec } from 'theorum';
import type { LiveProfileInterface } from 'theorum/interface';
import {
	type LiveConnectPhase,
	LiveSessionClient,
	type LiveSessionStatus,
} from '$lib/client/live-client';
import LiveStage from '$lib/components/interface/live/LiveStage.svelte';
import LiveToolPausePanel from '$lib/components/interface/live/LiveToolPausePanel.svelte';
import type { CaptionFocus } from '$lib/interface/live/caption-focus';
import {
	applyLiveTranscript,
	clearLiveCaptionInterim,
	emptyLiveCaptionState,
	type LiveCaptionState,
	latestLiveCaptionTurnId,
} from '$lib/interface/live/live-captions';
import { registerPlaygroundLiveProfile } from '$lib/interface/live/live-session';
import { liveStateLabel } from '$lib/interface/live/live-state';
import { invokePlaygroundLiveTool, type LiveToolPausePrompt } from '$lib/interface/live/live-tool';
import type { LiveVideoCapture } from '$lib/interface/live/live-video';
import { startLiveVideoCapture } from '$lib/interface/live/live-video';
import type { PlaygroundRunPayload } from '$lib/interface/run-payload';
import type { ToolPauseResolution } from '$lib/interface/tool-resume';

let {
	iface,
	payload,
}: {
	iface: LiveProfileInterface;
	payload: PlaygroundRunPayload;
} = $props();

let status = $state<LiveSessionStatus>('disconnected');
let connectPhase = $state<LiveConnectPhase | null>(null);
let inputLevel = $state(0);
let outputLevel = $state(0);
let isMuted = $state(false);
let isVideoOn = $state(false);
let activeTool = $state<string | null>(null);
let captions = $state<LiveCaptionState>(emptyLiveCaptionState());
let captionFocus = $state<CaptionFocus>(null);
let error = $state('');
let textDraft = $state('');
let textComposerOpen = $state(false);
let sessionActive = $state(false);
let sessionPermissions = $state<string[]>([]);
let pausePrompt = $state<LiveToolPausePrompt | null>(null);

let everConnected = $state(false);
let client: LiveSessionClient | null = null;
let videoCapture: LiveVideoCapture | null = null;
let pauseResolver: ((resolution: ToolPauseResolution) => void) | null = null;
let pauseReject: ((reason: Error) => void) | null = null;

$effect(() => {
	if (sessionActive) everConnected = true;
});

const voiceAvailable = $derived(liveIngressEnabledFromSpec(iface.live.ingress, 'audio'));
const videoAvailable = $derived(liveIngressEnabledFromSpec(iface.live.ingress, 'video'));
const textAvailable = $derived(liveIngressEnabledFromSpec(iface.live.ingress, 'text'));

const stateLabel = $derived(
	liveStateLabel({
		status,
		connectPhase,
		toolName: activeTool,
		isMuted,
		voiceEnabled: voiceAvailable,
	}),
);

const toolActive = $derived(activeTool !== null || pausePrompt !== null);

function focusLatestCaption(next: LiveCaptionState) {
	const latestId = latestLiveCaptionTurnId(next);
	if (latestId) captionFocus = latestId;
}

function toolFailureMessage(tool: NonNullable<TurnEvent['tool']>): string {
	if (tool.failure?.message) return tool.failure.message;
	if (tool.name) return `Tool '${tool.name}' failed`;
	return 'Tool call failed';
}

function handleLiveTurnEvent(event: TurnEvent) {
	if (event.type === 'done') {
		captions = clearLiveCaptionInterim(captions);
		if (!pausePrompt) activeTool = null;
		return;
	}
	if (event.type !== 'tool' || !event.tool) return;

	const tool = event.tool;
	if (tool.phase === 'cancel') {
		if (!pausePrompt) activeTool = null;
		return;
	}
	if (tool.phase === 'error') {
		error = toolFailureMessage(tool);
		if (!pausePrompt) activeTool = null;
		return;
	}
	if (tool.phase === 'complete') {
		if (!pausePrompt) activeTool = null;
		return;
	}
	if (tool.name) {
		activeTool = tool.name;
	}
}

function waitForPauseDecision(prompt: LiveToolPausePrompt): Promise<ToolPauseResolution> {
	return new Promise((resolve, reject) => {
		pausePrompt = prompt;
		pauseResolver = resolve;
		pauseReject = reject;
	});
}

function resolvePauseDecision(resolution: ToolPauseResolution) {
	pauseResolver?.(resolution);
	pauseResolver = null;
	pauseReject = null;
	pausePrompt = null;
}

function cancelPauseDecision(reason = 'Live session ended') {
	if (pauseReject) {
		pauseReject(new Error(reason));
	}
	pauseResolver = null;
	pauseReject = null;
	pausePrompt = null;
}

function resetCaptions() {
	captions = emptyLiveCaptionState();
	captionFocus = null;
}

async function ensureClient(profileId: string) {
	if (client) return client;

	client = new LiveSessionClient({
		profile: profileId,
		voiceIngress: voiceAvailable,
		onConnectPhase: (phase) => {
			connectPhase = phase;
		},
		onStatusChange: (next) => {
			status = next;
			if (next === 'listening' || next === 'ready') {
				sessionActive = true;
				error = '';
			}
			if (next === 'disconnected' || next === 'error') {
				sessionActive = false;
				stopVideo();
			}
		},
		onTranscript: (text, isUser, meta) => {
			const next = applyLiveTranscript(captions, text, isUser, meta?.interim);
			captions = next;
			if (!meta?.interim) focusLatestCaption(next);
		},
		onTurnEvent: handleLiveTurnEvent,
		onVolumeLevel: (level, isUser) => {
			if (isUser) {
				inputLevel = isMuted ? 0 : level;
			} else {
				outputLevel = level;
			}
		},
		onError: (message) => {
			error = message;
		},
		onToolCall: async (name, args) => {
			activeTool = name;
			error = '';
			try {
				const result = await invokePlaygroundLiveTool({
					payload,
					name,
					input: args,
					sessionPermissions,
					onPause: waitForPauseDecision,
				});
				sessionPermissions = result.sessionPermissions;
				const outputError =
					typeof result.output.error === 'string' ? result.output.error : undefined;
				if (outputError) error = outputError;
				return result.output;
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				error = message;
				return { error: message };
			} finally {
				if (!pausePrompt) activeTool = null;
			}
		},
	});

	return client;
}

async function startSession() {
	error = '';
	resetCaptions();
	try {
		const profileId = await registerPlaygroundLiveProfile(payload);
		const liveClient = await ensureClient(profileId);
		if (status === 'disconnected' || status === 'error') {
			await liveClient.connect();
		}
	} catch (err) {
		error = err instanceof Error ? err.message : String(err);
	}
}

function stopVideo() {
	if (videoCapture) {
		videoCapture.stop();
		videoCapture = null;
	}
	isVideoOn = false;
}

function teardownSession() {
	cancelPauseDecision();
	if (client) {
		client.disconnect();
		client = null;
	}
	stopVideo();
	isMuted = false;
	textComposerOpen = false;
	sessionActive = false;
	sessionPermissions = [];
	status = 'disconnected';
	connectPhase = null;
	inputLevel = 0;
	outputLevel = 0;
}

function handleSendText() {
	const text = textDraft.trim();
	if (!text || !client || !sessionActive || !textAvailable) return;
	client.sendText(text);
	textDraft = '';
	const next = applyLiveTranscript(captions, text, true, false, { forceNew: true });
	captions = next;
	focusLatestCaption(next);
}

function handleToggleTextComposer() {
	if (!textAvailable) return;
	textComposerOpen = !textComposerOpen;
}

async function handleToggleVideo() {
	if (!client || !sessionActive || !videoAvailable) return;
	if (isVideoOn) {
		stopVideo();
		return;
	}
	try {
		videoCapture = await startLiveVideoCapture((base64) => {
			client?.sendVideo(base64);
		});
		isVideoOn = true;
	} catch (err) {
		error = err instanceof Error ? err.message : String(err);
		stopVideo();
	}
}

function handleToggleMic() {
	if (!client || !sessionActive || !voiceAvailable) return;
	isMuted = client.toggleMute();
}

function handleEnd() {
	teardownSession();
}

async function handleRestart() {
	teardownSession();
	await startSession();
}

onMount(() => {
	void startSession();
});

onDestroy(() => {
	teardownSession();
});
</script>

<div class="live-runner">
	<LiveStage
		{captionFocus}
		captionTurns={captions.turns}
		{error}
		handle={iface.identity.handle}
		{inputLevel}
		interimAgent={captions.interimAgent}
		interimUser={captions.interimUser}
		{isMuted}
		{isVideoOn}
		onCaptionFocusChange={(focus) => {
			captionFocus = focus;
		}}
		onEnd={handleEnd}
		onRestart={handleRestart}
		onSendText={handleSendText}
		onTextDraftChange={(value) => {
			textDraft = value;
		}}
		onToggleMic={handleToggleMic}
		onToggleTextComposer={handleToggleTextComposer}
		onToggleVideo={handleToggleVideo}
		{outputLevel}
		{sessionActive}
		{stateLabel}
		{status}
		{textAvailable}
		{textComposerOpen}
		{textDraft}
		{toolActive}
		{videoAvailable}
		{voiceAvailable}
		canRestart={!sessionActive && everConnected && status !== 'connecting'}
	/>

	{#if pausePrompt}
		<LiveToolPausePanel pause={pausePrompt.pause} onResolve={resolvePauseDecision} />
	{/if}
</div>

<style>
.live-runner {
	position: relative;
	height: 100%;
}
</style>
