<script lang="ts">
import type { CaptionFocus } from '$lib/interface/live/caption-focus';
import type { LiveCaptionTurn } from '$lib/interface/live/live-captions';

let {
	handle,
	turns = [],
	interimUser = '',
	interimAgent = '',
	focus = null,
	onFocusChange,
}: {
	handle: string;
	turns?: LiveCaptionTurn[];
	interimUser?: string;
	interimAgent?: string;
	focus?: CaptionFocus;
	onFocusChange?: (focus: CaptionFocus) => void;
} = $props();

const handleLabel = $derived(`@${handle}`);

const visible = $derived(turns.length > 0 || interimUser.length > 0 || interimAgent.length > 0);

let captionsEl = $state<HTMLElement | null>(null);

$effect(() => {
	void turns.length;
	void turns.at(-1)?.text;
	void interimUser;
	void interimAgent;

	const el = captionsEl;
	if (!el) return;

	queueMicrotask(() => {
		el.scrollTop = el.scrollHeight;
	});
});

function roleLabel(role: LiveCaptionTurn['role']): string {
	return role === 'user' ? 'you' : handleLabel;
}
</script>

{#if visible}
	<aside bind:this={captionsEl} class="live-captions" aria-live="polite">
		{#each turns as turn, index (turn.id)}
			<button
				type="button"
				class="live-captions__line"
				class:live-captions__line--user={turn.role === 'user'}
				class:live-captions__line--agent={turn.role === 'agent'}
				class:live-captions__line--focused={focus === turn.id}
				class:live-captions__line--latest={index === turns.length - 1}
				onclick={() => onFocusChange?.(focus === turn.id ? null : turn.id)}
			>
				<span class="live-captions__role">{roleLabel(turn.role)}</span>
				<span class="live-captions__text">{turn.text}</span>
			</button>
		{/each}
		{#if interimUser}
			<div class="live-captions__line live-captions__line--user live-captions__line--interim">
				<span class="live-captions__role">you</span>
				<span class="live-captions__text">{interimUser}</span>
			</div>
		{/if}
		{#if interimAgent}
			<div class="live-captions__line live-captions__line--agent live-captions__line--interim">
				<span class="live-captions__role">{handleLabel}</span>
				<span class="live-captions__text">{interimAgent}</span>
			</div>
		{/if}
	</aside>
{/if}
