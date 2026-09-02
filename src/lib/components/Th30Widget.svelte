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
import { readDocSection, searchDocumentation } from '$lib/docs/unified-docs';
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
				return await handleToolCall(name, args);
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

function showActionLabel(text: string) {
	activeActionLabel = text;
	if (actionLabelTimer) clearTimeout(actionLabelTimer);
	actionLabelTimer = setTimeout(() => {
		activeActionLabel = null;
	}, 4000);
}

function clearLineHighlights() {
	for (const el of activeSelectedLines) {
		el.classList.remove('th30-line-selected');
	}
	activeSelectedLines = [];
}

function highlightLines(container: Element, start: number, end?: number) {
	clearLineHighlights();
	const endLine = end ?? start;
	const selected: HTMLElement[] = [];
	for (let line = start; line <= endLine; line++) {
		const lineEl = container.querySelector<HTMLElement>(`[data-line="${line}"]`);
		if (lineEl) {
			lineEl.classList.add('th30-line-selected');
			selected.push(lineEl);
		}
	}
	activeSelectedLines = selected;
	if (selected.length > 0) {
		selected[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	if (activeHighlightTimer) clearTimeout(activeHighlightTimer);
	activeHighlightTimer = setTimeout(() => {
		clearLineHighlights();
	}, 7000);
}

async function handleToolCall(
	name: string,
	args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	if (name === 'navigate') {
		const targetPath = (args.path as string) || '/';
		const subTarget = args.subTarget as string | undefined;

		showActionLabel(`Navigating to ${targetPath}${subTarget ? ` · ${subTarget}` : ''}`);
		flashNavFrame();

		if (targetPath.startsWith('/#') || targetPath.startsWith('#')) {
			const hash = targetPath.includes('#')
				? targetPath.slice(targetPath.indexOf('#'))
				: targetPath;
			const el = document.querySelector(hash);
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'start' });

				if (subTarget) {
					const subEl = el.querySelector(
						`[data-node="${subTarget}"], [data-pillar="${subTarget}"], [data-facet="${subTarget}"], #${subTarget}`,
					);
					if (subEl) {
						subEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
					}
				}
			} else {
				window.location.href = targetPath;
			}
		} else {
			window.location.href = targetPath;
		}
		return { success: true, navigatedTo: targetPath, subTarget };
	}

	if (name === 'highlight' || name === 'highlightSection') {
		const target = ((args.target ?? args.selector) as string) || '#use';
		const lineStart = typeof args.lineStart === 'number' ? args.lineStart : undefined;
		const lineEnd = typeof args.lineEnd === 'number' ? args.lineEnd : undefined;
		const subTarget = args.subTarget as string | undefined;
		const label = args.label as string | undefined;

		const desc =
			label ??
			(lineStart !== undefined
				? `Lines L${lineStart}${lineEnd ? `-L${lineEnd}` : ''} in ${target}`
				: `Target ${target}`);
		showActionLabel(`Selecting: ${desc}`);

		const container = document.querySelector(target);
		if (container) {
			if (lineStart !== undefined) {
				highlightLines(container, lineStart, lineEnd);
			} else if (subTarget) {
				const subEl = container.querySelector(
					`[data-node="${subTarget}"], [data-pillar="${subTarget}"], [data-facet="${subTarget}"], #${subTarget}`,
				);
				if (subEl) {
					subEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
				} else {
					container.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			} else {
				container.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
			return {
				success: true,
				highlighted: target,
				lineRange:
					lineStart !== undefined
						? `L${lineStart}${lineEnd && lineEnd !== lineStart ? `-L${lineEnd}` : ''}`
						: undefined,
				subTarget,
				label,
			};
		}
		return { success: false, error: `Element not found for selector: ${target}` };
	}

	if (name === 'read') {
		const target = (args.target as string) || '#overview';
		const detail = (args.detail as 'summary' | 'full' | 'code_only') || 'full';
		showActionLabel(`Reading section: ${target}`);
		const doc = readDocSection(target, detail);
		return {
			target: doc.target,
			title: doc.title,
			content: doc.content,
			lineCount: doc.lineCount,
		};
	}

	if (name === 'searchDocs') {
		const query = (args.query as string) || '';
		const source = (args.source as 'all' | 'local' | 'github' | 'jsr' | 'npm') || 'all';
		const limit = typeof args.limit === 'number' ? args.limit : 5;
		showActionLabel(`Searching docs for "${query}"`);
		const searchRes = searchDocumentation(query, source, limit);
		return {
			query: searchRes.query,
			results: searchRes.results,
			totalMatches: searchRes.totalMatches,
		};
	}

	return { success: true };
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
	if (client) client.disconnect();
});
</script>

{#if statusLineMode}
	<div
		class="th30-status-line"
		class:connecting={statusLineMode === 'connecting'}
		class:listening={statusLineMode === 'listening'}
		class:speaking={statusLineMode === 'speaking'}
		class:thinking={statusLineMode === 'thinking'}
		class:muted={statusLineMode === 'muted'}
		aria-hidden="true"
	>
		{#if statusLineMode === 'thinking' || statusLineMode === 'connecting'}
			<span class="th30-status-segment"></span>
		{/if}
	</div>
{/if}

{#if navFrameActive}
	<div class="th30-nav-frame" aria-hidden="true"></div>
{/if}

{#if showBye}
	<div class="th30-bye" role="status" aria-live="polite">Bye bye.</div>
{/if}

{#if activeActionLabel}
	<div class="th30-action-pill text-xs" role="status" aria-live="polite">
		{activeActionLabel}
	</div>
{/if}

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

/* Top status line — orchidcare developer loader idiom, state-driven. */
.th30-status-line {
	pointer-events: none;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	height: 2px;
	z-index: 70;
	overflow: hidden;
	background: #000;
}

.th30-status-line.listening {
	background: repeating-linear-gradient(90deg, #000 0, #000 5px, transparent 5px, transparent 13px);
	background-size: 26px 100%;
	animation: th30-status-dash 1.4s linear infinite;
}

.th30-status-line.speaking {
	background: repeating-linear-gradient(90deg, #000 0, #000 7px, transparent 7px, transparent 11px);
	background-size: 22px 100%;
	animation: th30-status-dash 0.35s linear infinite;
}

.th30-status-line.muted {
	background: #000;
	animation: none;
}

.th30-status-line.thinking,
.th30-status-line.connecting {
	background: transparent;
	animation: none;
}

.th30-status-segment {
	display: block;
	height: 100%;
	width: 28%;
	background: #000;
	animation: th30-status-sweep 1.3s ease-in-out infinite;
}

@keyframes th30-status-dash {
	to {
		background-position: 26px 0;
	}
}

@keyframes th30-status-sweep {
	0% {
		transform: translateX(-120%);
	}
	100% {
		transform: translateX(420%);
	}
}

.th30-nav-frame {
	pointer-events: none;
	position: fixed;
	inset: 0;
	z-index: 45;
	border: 2px solid #000;
	animation: th30-nav-frame-out 1.2s ease both;
}

@keyframes th30-nav-frame-out {
	0% {
		opacity: 1;
	}
	70% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

.th30-bye {
	position: fixed;
	left: 50%;
	top: 42%;
	z-index: 80;
	transform: translate(-50%, -50%);
	font-family: var(--font-mono);
	font-size: 0.95rem;
	font-weight: 500;
	letter-spacing: 0.02em;
	color: var(--color-ink);
	background: transparent;
	border: none;
	padding: 0;
	animation: th30-bye-fade 1.6s ease both;
	pointer-events: none;
}

:global(.code-line.th30-line-selected) {
	background: rgba(255, 230, 0, 0.35);
	border-left-color: var(--color-ink);
	box-shadow:
		inset 0 0 0 1px rgba(0, 0, 0, 0.4),
		0 0 14px rgba(255, 215, 0, 0.55);
	animation: th30-line-glow 1.6s ease-in-out infinite alternate;
}

@keyframes th30-line-glow {
	0% {
		background: rgba(255, 230, 0, 0.25);
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.3),
			0 0 8px rgba(255, 215, 0, 0.4);
	}
	100% {
		background: rgba(255, 230, 0, 0.55);
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.7),
			0 0 20px rgba(255, 210, 0, 0.85);
	}
}

@keyframes th30-bye-fade {
	0% {
		opacity: 0;
		transform: translate(-50%, -46%);
	}
	15%,
	70% {
		opacity: 1;
		transform: translate(-50%, -50%);
	}
	100% {
		opacity: 0;
		transform: translate(-50%, -54%);
	}
}
</style>
