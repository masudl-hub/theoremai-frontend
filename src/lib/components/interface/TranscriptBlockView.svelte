<script lang="ts">
import type { TranscriptBlock } from 'theorum/interface';
import type { ToolCredential } from 'theorum/kernel';
import { transcriptBlockCopyText } from '$lib/interface/transcript-block-text';
import ApprovalCard from './ApprovalCard.svelte';
import AuthChallengeCard from './AuthChallengeCard.svelte';
import TranscriptMessageShell from './TranscriptMessageShell.svelte';

let {
	block,
	handle,
	streaming = false,
	at,
	onBranch,
	onToolDecision,
	onAuthCredential,
	showChrome = true,
}: {
	block: TranscriptBlock;
	handle: string;
	streaming?: boolean;
	at?: number;
	onBranch?: () => void;
	onToolDecision?: (action: 'allow' | 'allow_session' | 'deny', interactiveValue?: unknown) => void;
	onAuthCredential?: (slot: string, credential: ToolCredential) => void;
	showChrome?: boolean;
} = $props();

const handleLabel = $derived(`@${handle}`);
const align = $derived(
	block.kind === 'user-text' || block.kind === 'user-attachment' || block.kind === 'user-voice'
		? 'user'
		: 'assistant',
);
const copyText = $derived(transcriptBlockCopyText(block));
</script>

<TranscriptMessageShell {align} {at} {copyText} {onBranch} {showChrome}>
	{#if block.kind === 'user-text'}
		<article class="iface-msg iface-msg--user">
			<p class="iface-msg__bubble">{block.text}</p>
		</article>
	{:else if block.kind === 'user-attachment' || block.kind === 'user-voice'}
		<article class="iface-msg iface-msg--user">
			<p class="iface-msg__bubble">{block.name}</p>
			<p class="iface-msg__meta">{block.mimeType}</p>
		</article>
	{:else if block.kind === 'thought'}
		<article class="iface-msg iface-msg--thought">
			<p class="iface-msg__meta">Thought</p>
			<p class="iface-msg__bubble">{block.text}</p>
		</article>
	{:else if block.kind === 'text'}
		<article class="iface-msg iface-msg--assistant" class:iface-msg--streaming={streaming}>
			<p class="iface-msg__handle">{handleLabel}</p>
			<p class="iface-msg__bubble">{block.text}</p>
		</article>
	{:else if block.kind === 'tool'}
		<article class="iface-msg iface-msg--assistant">
			<p class="iface-msg__handle">{handleLabel}</p>
			<p class="iface-msg__meta">Tool · {block.tool.name} [{block.tool.phase ?? 'invoked'}]</p>
			{#if block.tool.phase === 'pause' && block.tool.pause}
				{#if block.tool.pause.kind === 'auth'}
					<AuthChallengeCard
						onSubmitCredential={onAuthCredential}
						pause={block.tool.pause}
						toolName={block.tool.name}
					/>
				{:else}
					<ApprovalCard
						onDecision={onToolDecision}
						pause={block.tool.pause}
						toolName={block.tool.name}
					/>
				{/if}
			{:else if block.tool.output !== undefined}
				<pre class="iface-msg__code">{JSON.stringify(block.tool.output, null, 2)}</pre>
			{:else if block.tool.failure !== undefined}
				<pre
					class="iface-msg__code iface-msg__code--error"
				>{JSON.stringify(block.tool.failure, null, 2)}</pre>
			{/if}
		</article>
	{:else if block.kind === 'structured'}
		<article class="iface-msg iface-msg--assistant">
			<p class="iface-msg__handle">{handleLabel}</p>
			<pre class="iface-msg__code">{JSON.stringify(block.value, null, 2)}</pre>
		</article>
	{:else if block.kind === 'media'}
		<article class="iface-msg iface-msg--assistant">
			<p class="iface-msg__handle">{handleLabel}</p>
			{#if block.mimeType.startsWith('image/')}
				<img
					class="iface-msg__image"
					alt="Model output"
					src="data:{block.mimeType};base64,{block.data}"
				>
			{:else if block.mimeType.startsWith('audio/')}
				<audio
					class="iface-msg__audio"
					controls
					src="data:{block.mimeType};base64,{block.data}"
				></audio>
			{:else}
				<p class="iface-msg__meta">{block.mimeType}</p>
			{/if}
		</article>
	{:else if block.kind === 'grounding' || block.kind === 'evidence'}
		<article class="iface-msg iface-msg--assistant">
			<p class="iface-msg__handle">{handleLabel}</p>
			<pre
				class="iface-msg__code"
			>{JSON.stringify(block.kind === 'grounding' ? block.grounding : block.evidence, null, 2)}</pre>
		</article>
	{:else if block.kind === 'error'}
		<article class="iface-msg iface-msg--assistant iface-msg--error">
			<p class="iface-msg__handle">{handleLabel}</p>
			<p class="iface-msg__bubble">{block.message}</p>
		</article>
	{/if}
</TranscriptMessageShell>
