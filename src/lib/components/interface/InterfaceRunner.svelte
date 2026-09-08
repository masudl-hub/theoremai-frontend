<script lang="ts">
import '$lib/styles/interface-runner.css';
import type { ComposerProfileInterface, TranscriptBlock } from 'theorum/interface';
import type { ToolCredential } from 'theorum/kernel';
import InterfaceComposer from '$lib/components/interface/InterfaceComposer.svelte';
import InterfaceGenerationSelect from '$lib/components/interface/InterfaceGenerationSelect.svelte';
import InterfaceTranscript from '$lib/components/interface/InterfaceTranscript.svelte';

let {
	iface,
	blocks,
	streamBlocks = [],
	streaming = false,
	chatStarted = false,
	draftText = '',
	pendingFiles = [],
	pendingVoice = [],
	issues = [],
	busy = false,
	canSubmit = false,
	onDraftTextChange,
	onFilesSelected,
	onAttachmentRemove,
	onVoiceStaged,
	onVoiceClear,
	onSubmit,
	onBranch,
	onToolDecision,
	onAuthCredential,
	selectedModel = '',
	selectedEffort = '',
	onGenerationChange,
}: {
	iface: ComposerProfileInterface;
	blocks: TranscriptBlock[];
	streamBlocks?: TranscriptBlock[];
	streaming?: boolean;
	chatStarted?: boolean;
	draftText?: string;
	pendingFiles?: File[];
	pendingVoice?: File[];
	issues?: string[];
	busy?: boolean;
	canSubmit?: boolean;
	onDraftTextChange?: (text: string) => void;
	onFilesSelected?: (files: File[]) => void;
	onAttachmentRemove?: (index: number) => void;
	onVoiceStaged?: (file: File) => void;
	onVoiceClear?: () => void;
	onSubmit?: () => void;
	onBranch?: (index: number) => void;
	onToolDecision?: (
		index: number,
		action: 'allow' | 'allow_session' | 'deny',
		interactiveValue?: unknown,
	) => void;
	onAuthCredential?: (index: number, slot: string, credential: ToolCredential) => void;
	selectedModel?: string;
	selectedEffort?: string;
	onGenerationChange?: (next: { modelId: string; effort?: string }) => void;
} = $props();

const displayBlocks = $derived([...blocks, ...streamBlocks]);
const handleLabel = $derived(`@${iface.identity.handle}`);
</script>

<section
	class="iface-stage"
	class:iface-stage--landing={!chatStarted}
	class:iface-stage--chat={chatStarted}
>
	{#if chatStarted}
		<InterfaceTranscript
			blocks={displayBlocks}
			handle={iface.identity.handle}
			{onAuthCredential}
			{onBranch}
			{onToolDecision}
			{streaming}
		/>
	{/if}

	<div class="iface-rail">
		<div class="iface-composer-slot" class:iface-composer-slot--landing={!chatStarted}>
			{#if !chatStarted}
				<header class="iface-head">
					<h1 class="iface-head__handle">{handleLabel}</h1>
				</header>
			{/if}

			<div class="iface-composer-wrap">
				<InterfaceComposer
					{busy}
					{canSubmit}
					inputs={iface.inputs}
					{issues}
					{onAttachmentRemove}
					{onFilesSelected}
					{onSubmit}
					{onVoiceClear}
					{onVoiceStaged}
					onTextChange={onDraftTextChange}
					{pendingFiles}
					{pendingVoice}
					text={draftText}
				/>
				<InterfaceGenerationSelect
					disabled={busy || streaming}
					{iface}
					{onGenerationChange}
					{selectedEffort}
					{selectedModel}
				/>
			</div>
		</div>
	</div>
</section>
