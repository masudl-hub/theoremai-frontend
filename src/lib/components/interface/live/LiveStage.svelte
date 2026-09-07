<script lang="ts">
import {
	IconMicrophone,
	IconMicrophoneOff,
	IconPhone,
	IconPhoneOff,
	IconSend,
	IconVideo,
	IconVideoOff,
} from '@tabler/icons-svelte';
import type { LiveSessionStatus } from '$lib/client/live-client';
import InkWaveform from '$lib/components/interface/live/InkWaveform.svelte';
import LiveCaptionRail from '$lib/components/interface/live/LiveCaptionRail.svelte';
import type { CaptionFocus } from '$lib/interface/live/caption-focus';
import type { LiveCaptionTurn } from '$lib/interface/live/live-captions';
import '$lib/styles/live-stage.css';

let {
	handle,
	stateLabel,
	status = 'disconnected',
	inputLevel = 0,
	outputLevel = 0,
	toolActive = false,
	captionTurns = [],
	interimUser = '',
	interimAgent = '',
	captionFocus = null,
	isMuted = false,
	isVideoOn = false,
	voiceEnabled = false,
	videoEnabled = false,
	textEnabled = false,
	textDraft = '',
	sessionActive = false,
	canRestart = false,
	error = '',
	onCaptionFocusChange,
	onToggleMic,
	onToggleVideo,
	onTextDraftChange,
	onSendText,
	onRestart,
	onEnd,
}: {
	handle: string;
	stateLabel: string;
	status?: LiveSessionStatus;
	inputLevel?: number;
	outputLevel?: number;
	toolActive?: boolean;
	captionTurns?: LiveCaptionTurn[];
	interimUser?: string;
	interimAgent?: string;
	captionFocus?: CaptionFocus;
	isMuted?: boolean;
	isVideoOn?: boolean;
	voiceEnabled?: boolean;
	videoEnabled?: boolean;
	textEnabled?: boolean;
	textDraft?: string;
	sessionActive?: boolean;
	canRestart?: boolean;
	error?: string;
	onCaptionFocusChange?: (focus: CaptionFocus) => void;
	onToggleMic?: () => void;
	onToggleVideo?: () => void;
	onTextDraftChange?: (value: string) => void;
	onSendText?: () => void;
	onRestart?: () => void;
	onEnd?: () => void;
} = $props();

const handleLabel = $derived(`@${handle}`);
</script>

<section class="live-stage">
	<div class="live-rail">
		<header class="live-head">
			<div class="live-head__main">
				<h1 class="live-head__handle">{handleLabel}</h1>
				<p class="live-head__state">{stateLabel}</p>
			</div>
			<LiveCaptionRail
				{handle}
				focus={captionFocus}
				{interimAgent}
				{interimUser}
				onFocusChange={onCaptionFocusChange}
				turns={captionTurns}
			/>
		</header>

		<div class="live-wave-slot">
			<InkWaveform frozen={isMuted} {inputLevel} {outputLevel} {status} {toolActive} />
		</div>

		<hr class="live-divider">

		{#if error}
			<p class="live-error" role="alert">{error}</p>
		{/if}

		{#if textEnabled}
			<form
				class="live-text-compose"
				onsubmit={(e) => {
					e.preventDefault();
					onSendText?.();
				}}
			>
				<label class="live-text-compose__label" for="live-text-input">Message</label>
				<input
					id="live-text-input"
					class="live-text-compose__input"
					autocomplete="off"
					disabled={!sessionActive}
					oninput={(e) => onTextDraftChange?.(e.currentTarget.value)}
					placeholder="type to send…"
					value={textDraft}
				>
				<button
					class="live-control live-text-compose__send"
					aria-label="Send text"
					disabled={!sessionActive || !textDraft.trim()}
					type="submit"
				>
					<IconSend size={20} stroke={1.75} />
				</button>
			</form>
		{/if}

		<footer class="live-controls">
			<div class="live-controls__left">
				{#if voiceEnabled}
					<button
						class="live-control"
						aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
						disabled={!sessionActive}
						onclick={onToggleMic}
						type="button"
					>
						{#if isMuted}
							<IconMicrophoneOff size={20} stroke={1.75} />
						{:else}
							<IconMicrophone size={20} stroke={1.75} />
						{/if}
					</button>
				{/if}
				{#if videoEnabled}
					<button
						class="live-control"
						class:live-control--active={isVideoOn}
						aria-label={isVideoOn ? 'Turn off video' : 'Turn on video'}
						disabled={!sessionActive}
						onclick={onToggleVideo}
						type="button"
					>
						{#if isVideoOn}
							<IconVideoOff size={20} stroke={1.75} />
						{:else}
							<IconVideo size={20} stroke={1.75} />
						{/if}
					</button>
				{/if}
			</div>
			<div class="live-controls__right">
				{#if canRestart}
					<button
						class="live-control live-control--restart"
						aria-label="Restart live session"
						onclick={onRestart}
						type="button"
					>
						<IconPhone size={20} stroke={1.75} />
					</button>
				{:else}
					<button
						class="live-control live-control--end"
						aria-label="End live session"
						onclick={onEnd}
						type="button"
					>
						<IconPhoneOff size={20} stroke={1.75} />
					</button>
				{/if}
			</div>
		</footer>
	</div>
</section>
