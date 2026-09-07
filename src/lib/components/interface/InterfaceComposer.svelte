<script lang="ts">
import {
	IconLoader2,
	IconMicrophone,
	IconMicrophoneOff,
	IconPlus,
	IconSend,
} from '@tabler/icons-svelte';
import { onMount } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import type { ProfileInputsInterface } from 'theorum/interface';
import ComposerAttachmentsRow, {
	type ComposerAttachmentItem,
} from '$lib/components/interface/ComposerAttachmentsRow.svelte';
import {
	composerShellHeight,
	isComposerExpanded,
	measureComposerTextareaHeight,
} from '$lib/interface/composer-layout';
import { ComposerVoiceRecorder, isVoiceRecorderFailure } from '$lib/interface/voice-recorder';

function fileAttachmentId(file: File, index: number): string {
	return `file:${String(index)}:${file.name}:${String(file.size)}:${String(file.lastModified)}`;
}

function voiceAttachmentId(file: File, index: number): string {
	return `voice:${String(index)}:${file.name}:${String(file.size)}:${String(file.lastModified)}`;
}

let {
	inputs,
	text = '',
	pendingFiles = [],
	pendingVoice = [],
	issues = [],
	busy = false,
	canSubmit = false,
	onTextChange,
	onFilesSelected,
	onAttachmentRemove,
	onVoiceStaged,
	onVoiceClear,
	onSubmit,
}: {
	inputs: ProfileInputsInterface;
	text?: string;
	pendingFiles?: File[];
	pendingVoice?: File[];
	issues?: string[];
	busy?: boolean;
	canSubmit?: boolean;
	onTextChange?: (value: string) => void;
	onFilesSelected?: (files: File[]) => void;
	onAttachmentRemove?: (index: number) => void;
	onVoiceStaged?: (file: File) => void;
	onVoiceClear?: () => void;
	onSubmit?: () => void;
} = $props();

let recording = $state(false);
let inputLevel = $state(0);
let voiceError = $state('');
let recorder: ComposerVoiceRecorder | null = null;
const previewUrls = new SvelteMap<string, string>();

const voiceEnabled = $derived(Boolean(inputs.voice));
const attachmentCount = $derived(pendingFiles.length);
const voiceCount = $derived(pendingVoice.length);
const isExpanded = $derived(
	isComposerExpanded(text.length, attachmentCount, voiceCount, recording),
);
const sendDisabled = $derived(busy || !canSubmit || recording);

const attachItems = $derived.by((): ComposerAttachmentItem[] => {
	const files: ComposerAttachmentItem[] = pendingFiles.map((file, index) => {
		const id = fileAttachmentId(file, index);
		return {
			id,
			kind: 'file',
			file,
			previewUrl: previewUrls.get(id),
		};
	});
	const voices: ComposerAttachmentItem[] = pendingVoice.map((file, index) => ({
		id: voiceAttachmentId(file, index),
		kind: 'voice',
		file,
	}));
	return [...files, ...voices];
});

let textareaEl = $state<HTMLTextAreaElement | null>(null);
let innerEl = $state<HTMLDivElement | null>(null);
let shellEl = $state<HTMLDivElement | null>(null);
let attachRowEl = $state<HTMLDivElement | null>(null);
let maxHeight = $state(320);
let contentHeight = $state(46);

const shellHeight = $derived(composerShellHeight({ isExpanded, contentHeight }));

function syncMaxHeight() {
	maxHeight = Math.round(window.innerHeight * 0.4);
}

function revokeAllPreviews() {
	for (const url of previewUrls.values()) {
		URL.revokeObjectURL(url);
	}
	previewUrls.clear();
}

$effect(() => {
	const keep: string[] = [];
	for (const [index, file] of pendingFiles.entries()) {
		if (!file.type.startsWith('image/')) continue;
		const id = fileAttachmentId(file, index);
		keep.push(id);
		if (!previewUrls.has(id)) {
			previewUrls.set(id, URL.createObjectURL(file));
		}
	}
	for (const id of [...previewUrls.keys()]) {
		if (keep.includes(id)) continue;
		const url = previewUrls.get(id);
		if (url) URL.revokeObjectURL(url);
		previewUrls.delete(id);
	}
});

onMount(() => {
	syncMaxHeight();
	return () => {
		recorder?.dispose();
		revokeAllPreviews();
	};
});

$effect(() => {
	const ta = textareaEl;
	if (!ta) return;
	void text;
	void isExpanded;
	void maxHeight;
	void attachItems.length;
	void recording;

	const scrollHeight = isExpanded
		? (() => {
				ta.style.height = 'auto';
				return ta.scrollHeight;
			})()
		: 0;
	const measured = measureComposerTextareaHeight({ scrollHeight, maxHeight, isExpanded });
	ta.style.height = `${String(measured.heightPx)}px`;
	ta.style.overflowY = measured.overflowY;

	const attachH = attachRowEl?.offsetHeight ?? 0;
	const innerH = isExpanded && innerEl ? innerEl.offsetHeight + 2 : measured.contentHeightFallback;
	contentHeight = innerH + attachH;
});

$effect(() => {
	const shell = shellEl;
	if (!shell) return;
	void shellHeight;
	shell.style.height = `${String(shellHeight)}px`;
});

function ensureRecorder(): ComposerVoiceRecorder {
	recorder ??= new ComposerVoiceRecorder(inputs.voice?.accept ?? [], (level) => {
		inputLevel = level;
	});
	return recorder;
}

async function startRecording() {
	voiceError = '';
	onVoiceClear?.();
	try {
		await ensureRecorder().start();
		recording = true;
	} catch (err) {
		recording = false;
		voiceError = isVoiceRecorderFailure(err)
			? err.message
			: err instanceof Error
				? err.message
				: 'Microphone unavailable';
	}
}

async function stopRecording() {
	voiceError = '';
	try {
		const file = await ensureRecorder().stop();
		recording = false;
		inputLevel = 0;
		onVoiceStaged?.(file);
	} catch (err) {
		recording = false;
		inputLevel = 0;
		voiceError = isVoiceRecorderFailure(err)
			? err.message
			: err instanceof Error
				? err.message
				: 'Recording failed';
	}
}

async function toggleRecording() {
	if (recording) {
		await stopRecording();
		return;
	}
	await startRecording();
}

function discardRecordingOrVoice() {
	if (recording) {
		ensureRecorder().cancel();
		recording = false;
		inputLevel = 0;
	}
	onVoiceClear?.();
}

function handleAttachRemove(id: string) {
	if (id === '__recording__' || id.startsWith('voice:')) {
		discardRecordingOrVoice();
		return;
	}
	const match = /^file:(\d+):/.exec(id);
	if (!match) return;
	const index = Number(match[1]);
	if (!Number.isFinite(index)) return;
	onAttachmentRemove?.(index);
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		if (!sendDisabled) onSubmit?.();
	}
}

function handleFiles(event: Event) {
	const input = event.currentTarget as HTMLInputElement;
	const files = input.files ? [...input.files] : [];
	onFilesSelected?.(files);
	input.value = '';
}

const placeholder = $derived(
	recording
		? 'Listening…'
		: voiceCount > 0
			? 'Voice ready — send or re-record'
			: `Message${inputs.attachments || inputs.voice ? ' or attach' : ''}…`,
);
</script>

<form
	class="iface-composer"
	onsubmit={(event) => {
		event.preventDefault();
		if (!sendDisabled) onSubmit?.();
	}}
>
	{#if issues.length || voiceError}
		<ul class="iface-composer__issues" aria-live="polite">
			{#each issues as issue (issue)}
				<li>{issue}</li>
			{/each}
			{#if voiceError}
				<li>{voiceError}</li>
			{/if}
		</ul>
	{/if}

	<div bind:this={shellEl} class="iface-composer__shell">
		<div bind:this={attachRowEl}>
			<ComposerAttachmentsRow
				inputLevel={recording ? inputLevel : 0}
				items={attachItems}
				onRemove={handleAttachRemove}
				{recording}
			/>
		</div>

		<div
			bind:this={innerEl}
			class="iface-composer__inner"
			class:iface-composer__inner--collapsed={!isExpanded}
			class:iface-composer__inner--expanded={isExpanded}
			class:iface-composer__inner--has-attach={Boolean(inputs.attachments)}
		>
			{#if inputs.attachments}
				<label class="iface-composer__attach">
					<IconPlus size={18} stroke={1.75} aria-hidden="true" />
					<span class="sr-only">Attach file</span>
					<input
						accept={inputs.attachments.acceptAttr}
						class="iface-composer__file"
						disabled={busy || recording}
						multiple={inputs.maxFiles !== 1}
						onchange={handleFiles}
						type="file"
					>
				</label>
			{/if}

			{#if inputs.text}
				<textarea
					bind:this={textareaEl}
					class="iface-composer__input"
					class:iface-composer__input--collapsed={!isExpanded}
					disabled={busy || recording}
					onkeydown={handleKeydown}
					oninput={(event) => onTextChange?.(event.currentTarget.value)}
					placeholder={isExpanded && !recording && voiceCount === 0 ? '' : placeholder}
					rows="1"
					value={text}
				></textarea>
			{:else if voiceEnabled}
				<p class="iface-composer__voice-hint">
					{recording ? 'Listening…' : voiceCount > 0 ? 'Voice ready — send' : 'tap mic to record'}
				</p>
			{/if}

			<div class="iface-composer__actions">
				{#if voiceEnabled}
					<button
						class="iface-composer__voice"
						class:iface-composer__voice--recording={recording}
						aria-label={recording ? 'Stop recording' : 'Record voice note'}
						disabled={busy}
						onclick={toggleRecording}
						type="button"
					>
						{#if recording}
							<IconMicrophoneOff size={18} stroke={1.75} />
						{:else}
							<IconMicrophone size={18} stroke={1.75} />
						{/if}
					</button>
				{/if}
				<button
					class="iface-composer__send"
					aria-label={busy ? 'Sending' : 'Send message'}
					disabled={sendDisabled}
					type="submit"
				>
					{#if busy}
						<span
							class="iface-composer__send-icon iface-composer__send-icon--spin"
							aria-hidden="true"
						>
							<IconLoader2 size={18} stroke={1.75} />
						</span>
					{:else}
						<span class="iface-composer__send-icon" aria-hidden="true">
							<IconSend size={18} stroke={1.75} />
						</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
</form>

<svelte:window onresize={syncMaxHeight} />
