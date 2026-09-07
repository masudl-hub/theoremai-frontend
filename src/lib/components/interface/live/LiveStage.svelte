<script lang="ts">
import {
	IconMessage,
	IconMicrophone,
	IconMicrophoneOff,
	IconPhone,
	IconPhoneOff,
	IconVideo,
	IconVideoOff,
} from '@tabler/icons-svelte';
import type { LiveSessionStatus } from '$lib/client/live-client';
import InkWaveform from '$lib/components/interface/InkWaveform.svelte';
import InterfaceComposer from '$lib/components/interface/InterfaceComposer.svelte';
import LiveCaptionRail from '$lib/components/interface/live/LiveCaptionRail.svelte';
import type { CaptionFocus } from '$lib/interface/live/caption-focus';
import type { LiveCaptionTurn } from '$lib/interface/live/live-captions';
import '$lib/styles/live-stage.css';
import '$lib/styles/interface-runner.css';

const liveTextInputs = { text: true, attachments: null, voice: null };

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
	voiceAvailable = false,
	videoAvailable = false,
	textAvailable = false,
	textComposerOpen = false,
	textDraft = '',
	sessionActive = false,
	canRestart = false,
	error = '',
	onCaptionFocusChange,
	onToggleMic,
	onToggleVideo,
	onToggleTextComposer,
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
	voiceAvailable?: boolean;
	videoAvailable?: boolean;
	textAvailable?: boolean;
	textComposerOpen?: boolean;
	textDraft?: string;
	sessionActive?: boolean;
	canRestart?: boolean;
	error?: string;
	onCaptionFocusChange?: (focus: CaptionFocus) => void;
	onToggleMic?: () => void;
	onToggleVideo?: () => void;
	onToggleTextComposer?: () => void;
	onTextDraftChange?: (value: string) => void;
	onSendText?: () => void;
	onRestart?: () => void;
	onEnd?: () => void;
} = $props();

const handleLabel = $derived(`@${handle}`);
const canSendText = $derived(sessionActive && textDraft.trim().length > 0);
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
			<InkWaveform {inputLevel} {outputLevel} {status} {toolActive} variant="hero" />
		</div>

		<footer class="live-footer">
			{#if error}
				<p class="live-error" role="alert">{error}</p>
			{/if}

			{#if textComposerOpen && textAvailable}
				<div class="live-composer-slot">
					<InterfaceComposer
						busy={!sessionActive}
						canSubmit={canSendText}
						inputs={liveTextInputs}
						issues={[]}
						onSubmit={onSendText}
						onTextChange={onTextDraftChange}
						text={textDraft}
					/>
				</div>
			{/if}

			<hr class="ink-divider live-footer__divider">

			<div class="ink-controls">
				<div class="ink-controls__left">
					{#if voiceAvailable}
						<button
							class="ink-control"
							aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
							aria-pressed={!isMuted}
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
					{#if videoAvailable}
						<button
							class="ink-control"
							class:ink-control--active={isVideoOn}
							aria-label={isVideoOn ? 'Turn off video' : 'Turn on video'}
							aria-pressed={isVideoOn}
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
					{#if textAvailable}
						<button
							class="ink-control"
							class:ink-control--active={textComposerOpen}
							aria-label={textComposerOpen ? 'Hide text composer' : 'Show text composer'}
							aria-pressed={textComposerOpen}
							disabled={!sessionActive}
							onclick={onToggleTextComposer}
							type="button"
						>
							<IconMessage size={20} stroke={1.75} />
						</button>
					{/if}
				</div>
				<div class="ink-controls__right">
					{#if canRestart}
						<button
							class="ink-control"
							aria-label="Restart live session"
							onclick={onRestart}
							type="button"
						>
							<IconPhone size={20} stroke={1.75} />
						</button>
					{:else}
						<button class="ink-control" aria-label="End live session" onclick={onEnd} type="button">
							<IconPhoneOff size={20} stroke={1.75} />
						</button>
					{/if}
				</div>
			</div>
		</footer>
	</div>
</section>
