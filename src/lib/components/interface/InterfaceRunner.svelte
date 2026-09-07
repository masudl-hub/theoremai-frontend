<script lang="ts">
import '$lib/styles/interface-runner.css';
import type { ProfileInterface, TranscriptBlock } from 'theorum/interface';
import InterfaceComposer from '$lib/components/interface/InterfaceComposer.svelte';
import InterfaceTranscript from '$lib/components/interface/InterfaceTranscript.svelte';

let {
	iface,
	blocks,
	streamBlocks = [],
	streaming = false,
	chatStarted = false,
	draftText = '',
	attachmentCount = 0,
	issues = [],
	busy = false,
	canSubmit = false,
	onDraftTextChange,
	onFilesSelected,
	onSubmit,
}: {
	iface: ProfileInterface;
	blocks: TranscriptBlock[];
	streamBlocks?: TranscriptBlock[];
	streaming?: boolean;
	chatStarted?: boolean;
	draftText?: string;
	attachmentCount?: number;
	issues?: string[];
	busy?: boolean;
	canSubmit?: boolean;
	onDraftTextChange?: (text: string) => void;
	onFilesSelected?: (files: File[]) => void;
	onSubmit?: () => void;
} = $props();

const displayBlocks = $derived([...blocks, ...streamBlocks]);
const handleLabel = $derived(`@${iface.identity.handle}`);
</script>

<section
	class="iface-stage"
	class:iface-stage--landing={!chatStarted}
	class:iface-stage--chat={chatStarted}
>
	<div class="iface-rail">
		{#if chatStarted}
			<InterfaceTranscript blocks={displayBlocks} handle={iface.identity.handle} {streaming} />
		{/if}

		<div class="iface-composer-slot" class:iface-composer-slot--landing={!chatStarted}>
			{#if !chatStarted}
				<header class="iface-head">
					<h1 class="iface-head__handle">{handleLabel}</h1>
					{#if iface.identity.system}
						<p class="iface-head__system">{iface.identity.system}</p>
					{/if}
				</header>
			{/if}

			<InterfaceComposer
				{attachmentCount}
				{busy}
				{canSubmit}
				inputs={iface.inputs}
				{issues}
				{onFilesSelected}
				{onSubmit}
				onTextChange={onDraftTextChange}
				text={draftText}
			/>
		</div>
	</div>
</section>
