<script lang="ts">
import InkWaveform from '$lib/components/interface/InkWaveform.svelte';

let {
	src,
	mimeType = 'audio/webm',
	label,
}: {
	src: string;
	mimeType?: string;
	label?: string;
} = $props();

let audioEl = $state<HTMLAudioElement | null>(null);
let playing = $state(false);
let outputLevel = $state(0);
let rafId = 0;

const ariaLabel = $derived(label ?? voiceLabelFromMime(mimeType));

function voiceLabelFromMime(mime: string): string {
	const lower = mime.toLowerCase();
	if (lower.includes('webm')) return 'voice.webm';
	if (lower.includes('wav')) return 'voice.wav';
	if (lower.includes('mpeg') || lower.includes('mp3')) return 'voice.mp3';
	if (lower.includes('mp4') || lower.includes('m4a') || lower.includes('aac')) return 'voice.m4a';
	if (lower.includes('ogg')) return 'voice.ogg';
	return 'voice note';
}

function stopMeter() {
	cancelAnimationFrame(rafId);
	rafId = 0;
	outputLevel = 0;
}

function startMeter() {
	stopMeter();
	const tick = (time: number) => {
		if (!playing) return;
		outputLevel = 0.28 + 0.22 * (0.5 + 0.5 * Math.sin(time * 0.008));
		rafId = requestAnimationFrame(tick);
	};
	rafId = requestAnimationFrame(tick);
}

async function toggle() {
	const audio = audioEl;
	if (!audio) return;
	if (audio.paused) {
		try {
			await audio.play();
		} catch {
			playing = false;
			stopMeter();
		}
		return;
	}
	audio.pause();
}

function onPlay() {
	playing = true;
	startMeter();
}

function onPause() {
	playing = false;
	stopMeter();
}

function onEnded() {
	playing = false;
	stopMeter();
	if (audioEl) audioEl.currentTime = 0;
}
</script>

<div class="iface-voice-player">
	<button
		class="iface-attach-pill iface-attach-pill--voice iface-voice-player__hit"
		aria-label={playing ? `Pause ${ariaLabel}` : `Play ${ariaLabel}`}
		aria-pressed={playing}
		onclick={toggle}
		type="button"
	>
		<div class="iface-attach-pill__wave" aria-hidden="true">
			<InkWaveform
				frozen={!playing}
				inputLevel={0}
				{outputLevel}
				status={playing ? 'speaking' : 'ready'}
				variant="pill"
			/>
		</div>
	</button>
	<audio
		bind:this={audioEl}
		class="iface-voice-player__audio"
		preload="metadata"
		{src}
		onended={onEnded}
		onpause={onPause}
		onplay={onPlay}
	></audio>
</div>
