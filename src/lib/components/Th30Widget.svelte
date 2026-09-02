<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import {
	type LiveConnectPhase,
	LiveSessionClient,
	type LiveSessionStatus,
} from '$lib/client/live-client';
import { playTh30ReadyChime } from '$lib/client/th30-chime';
import { acceptTh30GeminiConsent, hasTh30GeminiConsent } from '$lib/client/th30-consent';
import Th30Cloud from '$lib/components/Th30Cloud.svelte';
import Th30ConsentModal from '$lib/components/Th30ConsentModal.svelte';
import Th30Overlays from '$lib/components/Th30Overlays.svelte';
import { readDocSection, searchDocumentation } from '$lib/docs/unified-docs';
import {
	highlightLines as applyLineHighlight,
	clearLineHighlights,
} from '$lib/th30/line-highlight';
import { runTh30ToolCall } from '$lib/th30/tool-handlers';
import type { Th30Caption, Th30CloudState } from '$lib/types/th30';

const GREETING_TRIGGER = '(call connected)';

type StatusLineMode = 'connecting' | 'listening' | 'speaking' | 'thinking' | 'muted';

let client: LiveSessionClient | null = null;
let status = $state<LiveSessionStatus>('disconnected');
let cloudState: Th30CloudState = $state('idle');
let isMuted = $state(false);
let sessionLive = $state(false);
let showConsent = $state(false);
let showBye = $state(false);
let permissionDenied = $state(false);
let connectPhase = $state<LiveConnectPhase | null>(null);
let micPermission = $state<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
let greetingSent = false;
let toolBusy = false;
let byeTimer: ReturnType<typeof setTimeout> | null = null;

let activeActionLabel = $state<string | null>(null);
let actionLabelTimer: ReturnType<typeof setTimeout> | null = null;
let activeHighlightTimer: ReturnType<typeof setTimeout> | null = null;
let activeSelectedLines: HTMLElement[] = [];
let navFrameActive = $state(false);
let navFrameTimer: ReturnType<typeof setTimeout> | null = null;

const caption = $derived.by((): Th30Caption => {
	if (sessionLive) return 'live';
	if (permissionDenied) return 'denied';
	if (status === 'connecting' || cloudState === 'connecting') {
		if (connectPhase === 'microphone' && micPermission === 'prompt') return 'requesting';
		return 'connecting';
	}
	return 'none';
});

const statusLineMode = $derived.by((): StatusLineMode | null => {
	if (!sessionLive && status !== 'connecting') return null;
	if (isMuted) return 'muted';
	if (toolBusy || cloudState === 'thinking') return 'thinking';
	if (cloudState === 'speaking') return 'speaking';
	if (cloudState === 'listening' || cloudState === 'connecting' || status === 'connecting') {
		return status === 'connecting' || cloudState === 'connecting' ? 'connecting' : 'listening';
	}
	return 'listening';
});

function mapCloudState(next: LiveSessionStatus): Th30CloudState {
	if (toolBusy) return 'thinking';
	switch (next) {
		case 'connecting':
			return 'connecting';
		case 'speaking':
			return 'speaking';
		case 'ready':
		case 'listening':
			return 'listening';
		default:
			return 'idle';
	}
}

function flashNavFrame() {
	navFrameActive = true;
	if (navFrameTimer) clearTimeout(navFrameTimer);
	navFrameTimer = setTimeout(() => {
		navFrameActive = false;
	}, 1200);
}

function showActionLabel(text: string) {
	activeActionLabel = text;
	if (actionLabelTimer) clearTimeout(actionLabelTimer);
	actionLabelTimer = setTimeout(() => {
		activeActionLabel = null;
	}, 4000);
}

function highlightLines(container: Element, start: number, end?: number) {
	applyLineHighlight(container, start, end, activeSelectedLines, {
		onLinesSelected: (lines) => {
			activeSelectedLines = lines;
		},
		clearExistingTimer: () => {
			if (activeHighlightTimer) clearTimeout(activeHighlightTimer);
		},
		scheduleAutoClear: (clearFn) => {
			activeHighlightTimer = setTimeout(() => {
				clearFn();
				activeSelectedLines = [];
			}, 7000);
		},
	});
}

function initClient() {
	if (client) return;

	client = new LiveSessionClient({
		profile: 'theorum.site.th30',
		onConnectPhase: (phase) => {
			connectPhase = phase;
		},
		onStatusChange: (newStatus) => {
			const previous = status;
			status = newStatus;
			cloudState = mapCloudState(newStatus);

			if (newStatus === 'ready' || newStatus === 'listening') {
				permissionDenied = false;
			}

			if (
				(newStatus === 'listening' || newStatus === 'ready') &&
				(previous === 'connecting' || previous === 'disconnected')
			) {
				void onSessionReady();
			}

			if (newStatus === 'disconnected' || newStatus === 'error') {
				sessionLive = false;
				greetingSent = false;
				toolBusy = false;
				cloudState = 'idle';
				connectPhase = null;
			}
		},
		onError: (err) => {
			permissionDenied = /permission denied/i.test(err);
			cloudState = 'idle';
			sessionLive = false;
			connectPhase = null;
		},
		onToolCall: async (name, args) => {
			toolBusy = true;
			cloudState = 'thinking';
			try {
				return runTh30ToolCall(name, args, {
					showActionLabel,
					flashNavFrame,
					highlightLines,
					readDocSection,
					searchDocumentation,
				});
			} finally {
				toolBusy = false;
				cloudState = mapCloudState(status);
			}
		},
	});
}

async function onSessionReady() {
	if (greetingSent || !client) return;
	if (status !== 'ready' && status !== 'listening') return;

	greetingSent = true;
	sessionLive = true;
	permissionDenied = false;
	cloudState = 'listening';

	void playTh30ReadyChime();
	await new Promise((resolve) => setTimeout(resolve, 320));
	if (client && (status === 'ready' || status === 'listening' || status === 'speaking')) {
		client.sendText(GREETING_TRIGGER);
	}
}

async function startSession() {
	initClient();
	if (!client) return;
	if (status !== 'disconnected' && status !== 'error') return;

	permissionDenied = false;
	greetingSent = false;
	connectPhase = null;
	await client.connect();
}

function handleCloudActivate() {
	if (sessionLive || status === 'connecting') return;

	if (!hasTh30GeminiConsent()) {
		showConsent = true;
		return;
	}

	void startSession();
}

function handleConsentAccept() {
	acceptTh30GeminiConsent();
	showConsent = false;
	void startSession();
}

function handleConsentDecline() {
	showConsent = false;
	showBye = true;
	if (byeTimer) clearTimeout(byeTimer);
	byeTimer = setTimeout(() => {
		showBye = false;
	}, 1600);
}

function handleMute() {
	if (!client || !sessionLive) return;
	isMuted = client.toggleMute();
}

function handleDisconnect() {
	if (!client) return;
	client.disconnect();
	sessionLive = false;
	isMuted = false;
	greetingSent = false;
	toolBusy = false;
	cloudState = 'idle';
	connectPhase = null;
	status = 'disconnected';
}

onMount(() => {
	const refreshMicPermission = async () => {
		try {
			const result = await navigator.permissions.query({
				name: 'microphone' as PermissionName,
			});
			micPermission = result.state as typeof micPermission;
			result.onchange = () => {
				micPermission = result.state as typeof micPermission;
			};
		} catch {
			micPermission = 'unknown';
		}
	};
	void refreshMicPermission();
});

onDestroy(() => {
	if (byeTimer) clearTimeout(byeTimer);
	if (navFrameTimer) clearTimeout(navFrameTimer);
	if (actionLabelTimer) clearTimeout(actionLabelTimer);
	if (activeHighlightTimer) clearTimeout(activeHighlightTimer);
	clearLineHighlights(activeSelectedLines);
	if (client) client.disconnect();
});
</script>

<Th30Overlays {statusLineMode} {navFrameActive} {showBye} {activeActionLabel} />

<div id="th30-dock" class="th30-dock">
	<Th30Cloud
		mode={cloudState}
		muted={isMuted}
		{caption}
		onActivate={handleCloudActivate}
		onMute={handleMute}
		onDisconnect={handleDisconnect}
	/>
</div>

<Th30ConsentModal
	open={showConsent}
	onAccept={handleConsentAccept}
	onDecline={handleConsentDecline}
/>

<style>
.th30-dock {
	position: fixed;
	top: 16px;
	right: 16px;
	z-index: 60;
}

@media (min-width: 768px) {
	.th30-dock {
		top: 24px;
		right: 24px;
	}
}
</style>
