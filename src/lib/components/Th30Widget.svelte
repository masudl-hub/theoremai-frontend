<script lang="ts">
import { onDestroy } from 'svelte';
import { volumeBar } from '$lib/actions/volume-bar';
import { LiveSessionClient, type LiveSessionStatus } from '$lib/client/live-client';

let client: LiveSessionClient | null = null;
let status: LiveSessionStatus = $state('disconnected');
let isExpanded = $state(false);
let isMuted = $state(false);
let volumeLevel = $state(0);
let textInput = $state('');
let errorMessage = $state<string | null>(null);

type TranscriptItem = {
	id: string;
	speaker: 'user' | 'th30';
	text: string;
	time: string;
};

const transcripts = $state<TranscriptItem[]>([]);
let transcriptContainer = $state<HTMLDivElement | null>(null);

function scrollToBottom() {
	if (transcriptContainer) {
		transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
	}
}

function handleToolCall(name: string, args: Record<string, unknown>) {
	if (name === 'navigate' && typeof args.path === 'string') {
		const targetPath = args.path;
		if (targetPath.startsWith('/#') || targetPath.startsWith('#')) {
			const hash = targetPath.includes('#')
				? targetPath.slice(targetPath.indexOf('#'))
				: targetPath;
			const el = document.querySelector(hash);
			if (el) {
				el.scrollIntoView({ behavior: 'smooth' });
				highlightElement(el);
			} else {
				window.location.href = targetPath;
			}
		} else {
			window.location.href = targetPath;
		}
		return { success: true, navigatedTo: targetPath };
	}

	if (name === 'highlightSection' && typeof args.selector === 'string') {
		const el = document.querySelector(args.selector);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			highlightElement(el);
			return { success: true, highlighted: args.selector };
		}
		return { success: false, error: `Element not found: ${args.selector}` };
	}

	return { success: true };
}

function highlightElement(el: Element) {
	el.classList.add('th30-highlight-pulse');
	setTimeout(() => {
		el.classList.remove('th30-highlight-pulse');
	}, 3500);
}

function initClient() {
	if (client) return;

	client = new LiveSessionClient({
		profile: 'theorum.site.th30',
		onStatusChange: (newStatus) => {
			status = newStatus;
			if (newStatus === 'ready' || newStatus === 'listening') {
				errorMessage = null;
			}
		},
		onTranscript: (text, isUser) => {
			const speaker = isUser ? 'user' : 'th30';
			const time = new Date().toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			});

			// If the last message is from the same speaker, append or update
			const last = transcripts[transcripts.length - 1];
			if (last && last.speaker === speaker && Date.now() - Number(last.id) < 4000) {
				last.text += (last.text ? ' ' : '') + text;
			} else {
				transcripts.push({
					id: Date.now().toString(),
					speaker,
					text,
					time,
				});
			}
			setTimeout(scrollToBottom, 50);
		},
		onError: (err) => {
			errorMessage = err;
		},
		onToolCall: handleToolCall,
		onVolumeLevel: (level) => {
			volumeLevel = level;
		},
	});
}

async function toggleConnect() {
	initClient();
	if (!client) return;

	if (status === 'disconnected' || status === 'error') {
		errorMessage = null;
		await client.connect();
	} else {
		client.disconnect();
	}
}

function toggleMute() {
	if (client) {
		isMuted = client.toggleMute();
	}
}

function sendTextMessage() {
	const trimmed = textInput.trim();
	if (!trimmed || !client) return;

	transcripts.push({
		id: Date.now().toString(),
		speaker: 'user',
		text: trimmed,
		time: new Date().toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		}),
	});

	client.sendText(trimmed);
	textInput = '';
	setTimeout(scrollToBottom, 50);
}

function sendPrompt(prompt: string) {
	if (!client || status === 'disconnected') {
		toggleConnect().then(() => {
			setTimeout(() => {
				textInput = prompt;
				sendTextMessage();
			}, 1000);
		});
	} else {
		textInput = prompt;
		sendTextMessage();
	}
}

onDestroy(() => {
	if (client) {
		client.disconnect();
	}
});
</script>

<div class="fixed right-4 bottom-4 z-50 font-mono select-none">
	{#if isExpanded}
		<div
			class="flex h-[480px] w-[340px] sm:w-[390px] flex-col border-[2px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-black dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b-[2px] border-black bg-[#f0f0f0] px-3 py-2 dark:border-white dark:bg-[#1a1a1a]"
			>
				<div class="flex items-center gap-2">
					<span
						class="inline-block h-2.5 w-2.5 rounded-full {status === 'listening' ? 'bg-emerald-500 animate-pulse' : status === 'speaking' ? 'bg-blue-500 animate-ping' : status === 'connecting' ? 'bg-amber-500 animate-pulse' : status === 'error' ? 'bg-rose-500' : 'bg-neutral-400'}"
					></span>
					<span class="text-xs font-black tracking-wider uppercase text-black dark:text-white">
						TH30 // LIVE GUIDE
					</span>
				</div>
				<div class="flex items-center gap-1.5">
					<button
						type="button"
						class="px-1.5 py-0.5 text-xs font-bold text-black hover:bg-black hover:text-white dark:text-white dark:hover:bg-white dark:hover:text-black"
						onclick={() => (isExpanded = false)}
						title="Minimize"
					>
						[ _ ]
					</button>
				</div>
			</div>

			<!-- Status Bar & Waveform -->
			<div
				class="flex items-center justify-between border-b border-black/20 bg-neutral-100 px-3 py-1.5 text-[11px] text-neutral-600 dark:border-white/20 dark:bg-neutral-900 dark:text-neutral-400"
			>
				<span class="uppercase font-semibold">
					STATUS: <span class="text-black dark:text-white font-bold">{status}</span>
				</span>
				{#if status === 'listening' || status === 'speaking'}
					<div class="flex items-center gap-1">
						{#each Array(6) as _bar, i (i)}
							<div
								use:volumeBar={{ level: volumeLevel, index: i }}
								class="w-1 bg-black dark:bg-white transition-all duration-75"
							></div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Transcript Area -->
			<div
				bind:this={transcriptContainer}
				class="flex-1 overflow-y-auto p-3 text-xs leading-relaxed space-y-3 bg-neutral-50 dark:bg-neutral-950"
			>
				{#if transcripts.length === 0}
					<div
						class="flex h-full flex-col items-center justify-center text-center text-neutral-400 p-4"
					>
						<span class="text-2xl mb-2">☁</span>
						<p class="font-bold text-black dark:text-white text-xs mb-1">Th30 is ready</p>
						<p class="text-[11px] leading-normal max-w-[240px]">
							Tap Connect to speak live with Gemini 3.1 Flash Live, explore features, or navigate
							the site.
						</p>

						<div class="mt-4 flex flex-wrap gap-1.5 justify-center">
							<button
								type="button"
								class="text-[10px] border border-black/30 dark:border-white/30 px-2 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
								onclick={() => sendPrompt('Explain the Flat Kernel architecture')}
							>
								"Explain Flat Kernel"
							</button>
							<button
								type="button"
								class="text-[10px] border border-black/30 dark:border-white/30 px-2 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
								onclick={() => sendPrompt('Show me the Pillars section')}
							>
								"Show Pillars"
							</button>
						</div>
					</div>
				{:else}
					{#each transcripts as item (item.id)}
						<div class="flex flex-col {item.speaker === 'user' ? 'items-end' : 'items-start'}">
							<div class="text-[9px] text-neutral-400 mb-0.5 flex gap-1">
								<span>{item.speaker === 'user' ? 'YOU' : 'TH30'}</span>
								<span>•</span>
								<span>{item.time}</span>
							</div>
							<div
								class="max-w-[85%] rounded px-2.5 py-1.5 {item.speaker === 'user' ? 'bg-black text-white dark:bg-white dark:text-black font-medium' : 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-black/10 dark:border-white/10'}"
							>
								{item.text}
							</div>
						</div>
					{/each}
				{/if}

				{#if errorMessage}
					<div
						class="border border-rose-500 bg-rose-50 p-2 text-[11px] text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
					>
						Error: {errorMessage}
					</div>
				{/if}
			</div>

			<!-- Input & Controls Bar -->
			<div
				class="border-t-[2px] border-black bg-white p-2.5 dark:border-white dark:bg-black flex flex-col gap-2"
			>
				<form
					class="flex gap-1.5"
					onsubmit={(e) => {
						e.preventDefault();
						sendTextMessage();
					}}
				>
					<input
						class="flex-1 border border-black px-2 py-1 text-xs text-black placeholder:text-neutral-400 focus:outline-none dark:border-white dark:bg-neutral-900 dark:text-white"
						placeholder={status === 'listening' ? 'Speak or type here...' : 'Connect to speak...'}
						type="text"
						bind:value={textInput}
					>
					<button
						class="border border-black bg-black px-3 py-1 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-40 dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
						disabled={!textInput.trim() || status === 'disconnected'}
						type="submit"
					>
						SEND
					</button>
				</form>

				<div class="flex items-center justify-between pt-1">
					<button
						type="button"
						class="flex items-center gap-1.5 border border-black px-2.5 py-1 text-xs font-bold transition {status === 'disconnected' || status === 'error' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-600 text-white hover:bg-rose-700'}"
						onclick={toggleConnect}
					>
						{status === 'disconnected' || status === 'error' ? '▶ CONNECT' : '■ DISCONNECT'}
					</button>

					{#if status !== 'disconnected' && status !== 'error'}
						<button
							type="button"
							class="border border-black px-2 py-1 text-xs font-bold {isMuted ? 'bg-amber-200 text-amber-900' : 'bg-neutral-100 text-black'} dark:border-white dark:bg-neutral-800 dark:text-white"
							onclick={toggleMute}
						>
							{isMuted ? '🔇 MUTED' : '🎙 MIC ON'}
						</button>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<!-- Collapsed Floating Cloud Button -->
		<button
			type="button"
			class="group flex items-center gap-2.5 border-[2px] border-black bg-white px-3.5 py-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 dark:border-white dark:bg-black dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
			aria-label="Open Th30 Live Agent"
			onclick={() => {
				isExpanded = true;
				if (status === 'disconnected') {
					toggleConnect();
				}
			}}
		>
			<span class="relative flex h-3 w-3">
				<span
					class="absolute inline-flex h-full w-full rounded-full opacity-75 {status === 'listening' ? 'animate-ping bg-emerald-400' : status === 'speaking' ? 'animate-ping bg-blue-400' : status === 'connecting' ? 'animate-ping bg-amber-400' : 'bg-neutral-400'}"
				></span>
				<span
					class="relative inline-flex h-3 w-3 rounded-full {status === 'listening' ? 'bg-emerald-500' : status === 'speaking' ? 'bg-blue-500' : status === 'connecting' ? 'bg-amber-500' : 'bg-neutral-500'}"
				></span>
			</span>
			<span class="text-xs font-black tracking-wide uppercase text-black dark:text-white">
				☁ TH30 LIVE
			</span>
		</button>
	{/if}
</div>

<style>
:global(.th30-highlight-pulse) {
	animation: th30-pulse-ring 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	outline: 3px solid #10b981;
	outline-offset: 4px;
}

@keyframes th30-pulse-ring {
	0%,
	100% {
		outline-color: #10b981;
		box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
	}
	50% {
		outline-color: #34d399;
		box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
	}
}
</style>
