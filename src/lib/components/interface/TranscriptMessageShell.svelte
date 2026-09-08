<script lang="ts">
import { IconCheck, IconCopy, IconGitBranch } from '@tabler/icons-svelte';
import type { Snippet } from 'svelte';
import { formatRelativeTime, msUntilRelativeTimeChange } from '$lib/interface/relative-time';

let {
	align = 'assistant',
	at,
	copyText,
	onBranch,
	showChrome = true,
	children,
}: {
	align?: 'user' | 'assistant';
	at?: number;
	copyText: string;
	onBranch?: () => void;
	showChrome?: boolean;
	children: Snippet;
} = $props();

let now = $state(Date.now());
let copied = $state(false);

$effect(() => {
	if (at == null) return;
	let timeoutId: number | undefined;
	let cancelled = false;

	const schedule = () => {
		if (cancelled) return;
		timeoutId = window.setTimeout(() => {
			now = Date.now();
			schedule();
		}, msUntilRelativeTimeChange(at));
	};

	now = Date.now();
	schedule();

	return () => {
		cancelled = true;
		if (timeoutId !== undefined) window.clearTimeout(timeoutId);
	};
});

const timeLabel = $derived(at != null ? formatRelativeTime(at, now) : null);
const canCopy = $derived(copyText.trim().length > 0);

async function copy() {
	if (!canCopy) return;
	await navigator.clipboard.writeText(copyText);
	copied = true;
	window.setTimeout(() => {
		copied = false;
	}, 1500);
}
</script>

<div class="iface-msg-wrap" class:iface-msg-wrap--user={align === 'user'}>
	{@render children()}
	{#if showChrome && (timeLabel || canCopy || onBranch)}
		<div class="iface-msg__chrome">
			{#if timeLabel && at != null}
				<time class="iface-msg__chrome-time" datetime={new Date(at).toISOString()}>
					{timeLabel}
				</time>
			{/if}
			{#if canCopy}
				<button
					type="button"
					class="iface-msg__chrome-btn"
					aria-label={copied ? 'Copied' : 'Copy'}
					title={copied ? 'Copied' : 'Copy'}
					onclick={copy}
				>
					{#if copied}
						<IconCheck size={12} stroke={1.8} aria-hidden="true" />
					{:else}
						<IconCopy size={12} stroke={1.7} aria-hidden="true" />
					{/if}
				</button>
			{/if}
			{#if onBranch}
				<button
					type="button"
					class="iface-msg__chrome-btn"
					aria-label="Branch"
					title="Branch"
					onclick={onBranch}
				>
					<IconGitBranch size={12} stroke={1.9} aria-hidden="true" />
				</button>
			{/if}
		</div>
	{/if}
</div>
