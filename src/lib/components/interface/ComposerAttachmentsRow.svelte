<script lang="ts">
import { on } from 'svelte/events';
import InkWaveform from '$lib/components/interface/InkWaveform.svelte';
import type { AttachPreviewStyle } from '$lib/interface/attachment-hover-preview';
import {
	formatAttachmentSize,
	resolveAttachPreviewStyle,
} from '$lib/interface/attachment-hover-preview';

export type ComposerAttachmentItem = {
	id: string;
	kind: 'file' | 'voice';
	file: File;
	/** Object URL for image preview; caller owns lifecycle when provided. */
	previewUrl?: string;
};

let {
	items = [],
	recording = false,
	inputLevel = 0,
	onRemove,
}: {
	items?: ComposerAttachmentItem[];
	recording?: boolean;
	inputLevel?: number;
	onRemove?: (id: string) => void;
} = $props();

const showRecordingPill = $derived(recording && !items.some((item) => item.kind === 'voice'));
const visible = $derived(items.length > 0 || showRecordingPill);

let hoverId = $state<string | null>(null);
let hoverEl = $state<HTMLElement | null>(null);
let previewEl = $state<HTMLDivElement | null>(null);
let previewStyle = $state<AttachPreviewStyle | null>(null);

const hoverItem = $derived(hoverId ? (items.find((item) => item.id === hoverId) ?? null) : null);

function isImage(file: File): boolean {
	return file.type.startsWith('image/');
}

function voiceFormatLabel(file: File): string {
	const mime = file.type.toLowerCase();
	if (mime.includes('webm')) return 'voice.webm';
	if (mime.includes('wav')) return 'voice.wav';
	if (mime.includes('mpeg') || mime.includes('mp3')) return 'voice.mp3';
	if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'voice.m4a';
	if (mime.includes('ogg')) return 'voice.ogg';
	const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : undefined;
	return ext ? `voice.${ext}` : 'voice.audio';
}

function labelFor(item: ComposerAttachmentItem): string {
	if (item.kind === 'voice') return voiceFormatLabel(item.file);
	return item.file.name;
}

function mimeLabel(item: ComposerAttachmentItem): string {
	if (item.file.type) return item.file.type;
	if (item.kind === 'voice') return 'audio';
	return isImage(item.file) ? 'image' : 'file';
}

function syncPreviewPosition() {
	if (!hoverEl) {
		previewStyle = null;
		return;
	}
	previewStyle = resolveAttachPreviewStyle(hoverEl.getBoundingClientRect());
}

function openPreview(id: string, el: HTMLElement) {
	hoverId = id;
	hoverEl = el;
	syncPreviewPosition();
}

function closePreview(id: string) {
	if (hoverId !== id) return;
	hoverId = null;
	hoverEl = null;
	previewStyle = null;
}

/** Move the hover card to `document.body` so composer `overflow: hidden` cannot clip it. */
function portal(node: HTMLElement) {
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		},
	};
}

function applyPreviewBox(node: HTMLElement, style: AttachPreviewStyle) {
	node.style.left = `${String(style.left)}px`;
	node.style.top = style.top !== undefined ? `${String(style.top)}px` : '';
	node.style.bottom = style.bottom !== undefined ? `${String(style.bottom)}px` : '';
}

$effect(() => {
	if (hoverId && !items.some((item) => item.id === hoverId)) {
		hoverId = null;
		hoverEl = null;
		previewStyle = null;
	}
});

$effect(() => {
	if (!hoverId) return;
	const onChange = () => {
		syncPreviewPosition();
	};
	const offResize = on(window, 'resize', onChange);
	const offScroll = on(window, 'scroll', onChange, { capture: true });
	return () => {
		offResize();
		offScroll();
	};
});

$effect(() => {
	if (!previewEl || !previewStyle) return;
	applyPreviewBox(previewEl, previewStyle);
});
</script>

{#if visible}
	<div class="iface-attach-row" aria-label="Pending attachments">
		{#each items as item (item.id)}
			<div
				class="iface-attach-pill"
				class:iface-attach-pill--voice={item.kind === 'voice'}
				class:iface-attach-pill--image={item.kind === 'file' && isImage(item.file)}
				role="group"
				aria-label={labelFor(item)}
				onpointerenter={(event) => openPreview(item.id, event.currentTarget)}
				onpointerleave={() => closePreview(item.id)}
			>
				{#if item.kind === 'voice'}
					<div class="iface-attach-pill__wave" aria-hidden="true">
						<InkWaveform
							frozen={!recording}
							{inputLevel}
							outputLevel={0}
							status={recording ? 'listening' : 'ready'}
							variant="pill"
						/>
					</div>
				{:else if item.previewUrl && isImage(item.file)}
					<img alt="" class="iface-attach-pill__thumb" draggable="false" src={item.previewUrl}>
					<span class="iface-attach-pill__label" title={labelFor(item)}>{labelFor(item)}</span>
				{:else}
					<span class="iface-attach-pill__label" title={labelFor(item)}>{labelFor(item)}</span>
				{/if}
				<button
					class="iface-attach-pill__remove"
					aria-label="Remove {labelFor(item)}"
					disabled={recording && item.kind === 'voice'}
					onclick={() => onRemove?.(item.id)}
					type="button"
				>
					×
				</button>
			</div>
		{/each}

		{#if showRecordingPill}
			<div class="iface-attach-pill iface-attach-pill--voice iface-attach-pill--recording">
				<div class="iface-attach-pill__wave" aria-hidden="true">
					<InkWaveform
						frozen={false}
						{inputLevel}
						outputLevel={0}
						status="listening"
						variant="pill"
					/>
				</div>
				<button
					class="iface-attach-pill__remove"
					aria-label="Cancel recording"
					onclick={() => onRemove?.('__recording__')}
					type="button"
				>
					×
				</button>
			</div>
		{/if}
	</div>
{/if}

{#if hoverItem && previewStyle}
	<div bind:this={previewEl} use:portal class="iface-attach-preview" role="tooltip">
		{#if hoverItem.previewUrl && isImage(hoverItem.file)}
			<div class="iface-attach-preview__media">
				<img alt={hoverItem.file.name} src={hoverItem.previewUrl}>
			</div>
		{/if}
		<div class="iface-attach-preview__meta">
			<span class="iface-attach-preview__name" title={labelFor(hoverItem)}
				>{labelFor(hoverItem)}</span
			>
			<div class="iface-attach-preview__row">
				<span class="iface-attach-preview__mime">{mimeLabel(hoverItem)}</span>
				{#if formatAttachmentSize(hoverItem.file.size)}
					<span class="iface-attach-preview__size"
						>{formatAttachmentSize(hoverItem.file.size)}</span
					>
				{/if}
			</div>
		</div>
	</div>
{/if}
