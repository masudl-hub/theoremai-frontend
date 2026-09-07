<script lang="ts">
import { IconLoader2, IconPlus, IconSend } from '@tabler/icons-svelte';
import { onMount } from 'svelte';
import type { ProfileInputsInterface } from 'theorum/interface';
import {
	composerShellHeight,
	isComposerExpanded,
	measureComposerTextareaHeight,
} from '$lib/interface/composer-layout';

let {
	inputs,
	text = '',
	attachmentCount = 0,
	issues = [],
	busy = false,
	canSubmit = false,
	onTextChange,
	onFilesSelected,
	onSubmit,
}: {
	inputs: ProfileInputsInterface;
	text?: string;
	attachmentCount?: number;
	issues?: string[];
	busy?: boolean;
	canSubmit?: boolean;
	onTextChange?: (value: string) => void;
	onFilesSelected?: (files: File[]) => void;
	onSubmit?: () => void;
} = $props();

const isExpanded = $derived(isComposerExpanded(text.length, attachmentCount));
const sendDisabled = $derived(busy || !canSubmit);

let textareaEl = $state<HTMLTextAreaElement | null>(null);
let innerEl = $state<HTMLDivElement | null>(null);
let shellEl = $state<HTMLDivElement | null>(null);
let maxHeight = $state(320);
let contentHeight = $state(46);

const shellHeight = $derived(composerShellHeight({ isExpanded, contentHeight }));

function syncMaxHeight() {
	maxHeight = Math.round(window.innerHeight * 0.4);
}

onMount(() => {
	syncMaxHeight();
});

$effect(() => {
	const ta = textareaEl;
	if (!ta) return;
	void text;
	void isExpanded;
	void maxHeight;

	const scrollHeight = isExpanded
		? (() => {
				ta.style.height = 'auto';
				return ta.scrollHeight;
			})()
		: 0;
	const measured = measureComposerTextareaHeight({ scrollHeight, maxHeight, isExpanded });
	ta.style.height = `${String(measured.heightPx)}px`;
	ta.style.overflowY = measured.overflowY;

	if (isExpanded && innerEl) {
		contentHeight = innerEl.offsetHeight + 2;
	} else {
		contentHeight = measured.contentHeightFallback;
	}
});

$effect(() => {
	const shell = shellEl;
	if (!shell) return;
	void shellHeight;
	shell.style.height = `${String(shellHeight)}px`;
});

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		onSubmit?.();
	}
}

function handleFiles(event: Event) {
	const input = event.currentTarget as HTMLInputElement;
	const files = input.files ? [...input.files] : [];
	onFilesSelected?.(files);
	input.value = '';
}
</script>

<form
	class="iface-composer"
	onsubmit={(event) => {
		event.preventDefault();
		onSubmit?.();
	}}
>
	{#if issues.length}
		<ul class="iface-composer__issues" aria-live="polite">
			{#each issues as issue (issue)}
				<li>{issue}</li>
			{/each}
		</ul>
	{/if}

	<div bind:this={shellEl} class="iface-composer__shell">
		<div
			bind:this={innerEl}
			class="iface-composer__inner"
			class:iface-composer__inner--collapsed={!isExpanded}
			class:iface-composer__inner--expanded={isExpanded}
		>
			{#if inputs.attachments}
				<label class="iface-composer__attach">
					<IconPlus size={18} stroke={1.75} aria-hidden="true" />
					<span class="sr-only">Attach file</span>
					<input
						accept={inputs.attachments.acceptAttr}
						class="iface-composer__file"
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
					disabled={busy}
					onkeydown={handleKeydown}
					oninput={(event) => onTextChange?.(event.currentTarget.value)}
					placeholder={isExpanded ? '' : `Message${inputs.attachments ? ' or attach' : ''}…`}
					rows="1"
					value={text}
				></textarea>
			{/if}

			<div class="iface-composer__actions">
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
