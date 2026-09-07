<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import type { LiveProfileInterface } from 'theorum/interface';
import {
	type LiveConnectPhase,
	LiveSessionClient,
	type LiveSessionStatus,
} from '$lib/client/live-client';
import LiveStage from '$lib/components/interface/live/LiveStage.svelte';
import type { CaptionFocus } from '$lib/interface/live/caption-focus';
import {
	applyLiveTranscript,
	emptyLiveCaptionState,
	type LiveCaptionState,
} from '$lib/interface/live/live-captions';
import {
	liveTextEnabled,
	liveVideoEnabled,
	liveVoiceEnabled,
} from '$lib/interface/live/live-inputs';
import { registerPlaygroundLiveProfile } from '$lib/interface/live/live-session';
import { liveStateLabel } from '$lib/interface/live/live-state';
import type { LiveVideoCapture } from '$lib/interface/live/live-video';
import { startLiveVideoCapture } from '$lib/interface/live/live-video';
import type { PlaygroundRunPayload } from '$lib/interface/run-payload';

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
let sessionActive = $state(false);

let everConnected = $state(false);
let client: LiveSessionClient | null = null;
let videoCapture: LiveVideoCapture | null = null;

$effect(() => {
	if (sessionActive) everConnected = true;
});

const voiceEnabled = $derived(liveVoiceEnabled(iface));
const videoEnabled = $derived(liveVideoEnabled(iface));
const textEnabled = $derived(liveTextEnabled(iface));

const stateLabel = $derived(
	liveStateLabel({
		status,
		connectPhase,
		toolName: activeTool,
		isMuted,
		voiceEnabled,
	}),
);

const toolActive = $derived(activeTool !== null);

function resetCaptions() {
	captions = emptyLiveCaptionState();
	captionFocus = null;
}

async function ensureClient(profileId: string) {
	if (client) return client;

	client = new LiveSessionClient({
		profile: profileId,
		voiceIngress: voiceEnabled,
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
			captions = applyLiveTranscript(captions, text, isUser, meta?.interim);
		},
		onVolumeLevel: (level, isUser) => {
			if (isUser) inputLevel = level;
			else outputLevel = level;
		},
		onError: (message) => {
			error = message;
		},
		onToolCall: async (name) => {
			activeTool = name;
			try {
				return { success: true, playground: true };
			} finally {
				activeTool = null;
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
	if (client) {
		client.disconnect();
		client = null;
	}
	stopVideo();
	isMuted = false;
	sessionActive = false;
	status = 'disconnected';
	connectPhase = null;
	inputLevel = 0;
	outputLevel = 0;
}

function handleSendText() {
	const text = textDraft.trim();
	if (!text || !client || !sessionActive || !textEnabled) return;
	client.sendText(text);
	textDraft = '';
	captions = applyLiveTranscript(captions, text, true, { interim: false });
}

async function handleToggleVideo() {
	if (!client || !sessionActive || !videoEnabled) return;
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
	if (!client || !sessionActive || !voiceEnabled) return;
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
	onToggleVideo={handleToggleVideo}
	{outputLevel}
	{sessionActive}
	{stateLabel}
	{status}
	{textDraft}
	{textEnabled}
	{toolActive}
	{voiceEnabled}
	{videoEnabled}
	canRestart={!sessionActive && everConnected && status !== 'connecting'}
/>
