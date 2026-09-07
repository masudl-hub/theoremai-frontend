<script lang="ts">
import InkWaveform from '$lib/components/interface/InkWaveform.svelte';

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

function isImage(file: File): boolean {
	return file.type.startsWith('image/');
}

function labelFor(item: ComposerAttachmentItem): string {
	if (item.kind === 'voice') return 'voice note';
	return item.file.name;
}
</script>

{#if visible}
	<div class="iface-attach-row" aria-label="Pending attachments">
		{#each items as item (item.id)}
			<div
				class="iface-attach-pill"
				class:iface-attach-pill--voice={item.kind === 'voice'}
				class:iface-attach-pill--image={item.kind === 'file' && isImage(item.file)}
			>
				{#if item.kind === 'voice'}
					<div class="iface-attach-pill__wave" aria-hidden="true">
						<InkWaveform
							frozen={!recording}
							{inputLevel}
							outputLevel={0}
							status={recording ? 'listening' : 'ready'}
						/>
					</div>
				{:else if item.previewUrl && isImage(item.file)}
					<img alt="" class="iface-attach-pill__thumb" draggable="false" src={item.previewUrl}>
				{/if}
				<span class="iface-attach-pill__label" title={labelFor(item)}>{labelFor(item)}</span>
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
					<InkWaveform frozen={false} {inputLevel} outputLevel={0} status="listening" />
				</div>
				<span class="iface-attach-pill__label">recording</span>
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
