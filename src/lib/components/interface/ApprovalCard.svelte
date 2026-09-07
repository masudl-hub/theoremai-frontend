<script lang="ts">
import type { ToolPause } from 'theorum/kernel';

let {
	pause,
	toolName,
	onDecision,
}: {
	pause: ToolPause;
	toolName: string;
	onDecision?: (action: 'allow' | 'allow_session' | 'deny', interactiveValue?: unknown) => void;
} = $props();

const accessKind = $derived(pause.permission ?? 'session_consent');
const isInteractive = $derived(pause.kind === 'interactive');
const interactiveOptions = $derived(pause.render?.options ?? []);
const interactiveKind = $derived(
	isInteractive
		? (pause.render?.kind ?? (interactiveOptions.length > 0 ? 'choice' : 'text'))
		: null,
);
const inputFormatted = $derived(
	typeof pause.input === 'object' && pause.input !== null
		? JSON.stringify(pause.input, null, 2)
		: String(pause.input ?? ''),
);

let decided = $state<'allowed' | 'allowed_session' | 'denied' | null>(null);
let selectedOption = $state<string | null>(null);
let textDraft = $state('');
let submittedValue = $state<unknown>(undefined);

function handleAction(action: 'allow' | 'allow_session' | 'deny', interactiveValue?: unknown) {
	if (action === 'allow') decided = 'allowed';
	else if (action === 'allow_session') decided = 'allowed_session';
	else decided = 'denied';

	if (interactiveValue !== undefined) {
		submittedValue = interactiveValue;
	}

	onDecision?.(action, interactiveValue);
}

function chooseInteractive(option: string) {
	selectedOption = option;
	handleAction('allow', option);
}

function submitText() {
	const trimmed = textDraft.trim();
	if (!trimmed) return;
	handleAction('allow', trimmed);
}
</script>

<article class="renderable-card approval-card" class:approval-card--decided={decided !== null}>
	<header class="card-header">
		<div class="card-title-group">
			<span
				class="card-badge"
				class:card-badge--shield={!isInteractive}
				class:card-badge--interactive={isInteractive}
			>
				{isInteractive ? '✎ Response Required' : '🛡 Approval Required'}
			</span>
			<h4 class="card-title">
				{isInteractive ? 'Input' : 'Tool Execution'}: <code>{toolName}</code>
			</h4>
		</div>
		{#if !isInteractive}
			<span class="card-badge card-badge--tier">{accessKind}</span>
		{/if}
	</header>

	{#if pause.summary}
		<p class="card-summary">{pause.summary}</p>
	{/if}

	{#if pause.render}
		<div class="card-interactive-view">
			<p class="interactive-prompt">{pause.render.prompt}</p>
			{#if interactiveKind === 'choice' && interactiveOptions.length}
				<div class="interactive-options">
					{#each interactiveOptions as opt (opt)}
						<button
							class="interactive-option-pill"
							class:interactive-option-pill--selected={selectedOption === opt}
							disabled={decided !== null}
							onclick={() => chooseInteractive(opt)}
							type="button"
						>
							{opt}
						</button>
					{/each}
				</div>
			{:else if interactiveKind === 'text'}
				<label class="interactive-text-field">
					<span class="interactive-text-label">Your answer</span>
					<input
						bind:value={textDraft}
						class="interactive-text-input"
						disabled={decided !== null}
						onkeydown={(event) => {
							if (event.key === 'Enter') submitText();
						}}
						placeholder="Type your response"
						type="text"
					>
				</label>
			{/if}
		</div>
	{/if}

	<details class="card-details">
		<summary class="details-toggle">View Input Arguments</summary>
		<pre class="card-code">{inputFormatted}</pre>
	</details>

	<footer class="card-footer">
		{#if decided === null}
			<div class="action-buttons">
				{#if isInteractive && interactiveKind === 'confirm'}
					<button
						class="btn-action btn-action--deny"
						onclick={() => handleAction('deny')}
						type="button"
					>
						Cancel
					</button>
					<button
						class="btn-action btn-action--allow"
						onclick={() => handleAction('allow', true)}
						type="button"
					>
						Confirm
					</button>
				{:else}
					{#if !isInteractive || interactiveKind !== 'choice' || interactiveOptions.length === 0}
						<button
							class="btn-action btn-action--deny"
							onclick={() => handleAction('deny')}
							type="button"
						>
							{isInteractive ? 'Cancel' : 'Deny'}
						</button>
					{/if}
					{#if interactiveKind === 'text'}
						<button
							class="btn-action btn-action--allow"
							disabled={!textDraft.trim()}
							onclick={submitText}
							type="button"
						>
							Submit
						</button>
					{:else if !isInteractive || (interactiveKind !== 'choice' && interactiveKind !== 'confirm')}
						<button
							class="btn-action btn-action--allow"
							onclick={() => handleAction('allow')}
							type="button"
						>
							Approve
						</button>
					{:else if isInteractive && interactiveKind === 'choice'}
						<button
							class="btn-action btn-action--deny"
							onclick={() => handleAction('deny')}
							type="button"
						>
							Cancel
						</button>
					{/if}
					{#if !isInteractive}
						<button
							class="btn-action btn-action--always"
							onclick={() => handleAction('allow_session')}
							type="button"
						>
							Always Allow this Session
						</button>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="decision-outcome" class:decision-outcome--denied={decided === 'denied'}>
				{#if decided === 'denied'}
					<span>✗ {isInteractive ? 'Cancelled' : 'Execution Denied'}</span>
				{:else if decided === 'allowed_session'}
					<span>✓ Approved for entire session</span>
				{:else if submittedValue !== undefined}
					<span>✓ {String(submittedValue)}</span>
				{:else}
					<span>✓ Approved for single execution</span>
				{/if}
			</div>
		{/if}
	</footer>
</article>

<style>
.renderable-card {
	margin: 0.5rem 0;
	padding: 0.85rem;
	border: 1.5px solid #000;
	border-radius: 4px;
	background: #fff;
	font-family: var(--font-mono, monospace);
	font-size: 0.75rem;
	box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
	max-width: 38rem;
}

.card-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 0.5rem;
	padding-bottom: 0.5rem;
	border-bottom: 1px dashed rgba(0, 0, 0, 0.2);
}

.card-title-group {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.card-title {
	margin: 0;
	font-size: 0.82rem;
	font-weight: 700;
}

.card-title code {
	background: rgba(0, 0, 0, 0.06);
	padding: 0.1rem 0.3rem;
	border-radius: 2px;
}

.card-badge {
	align-self: flex-start;
	padding: 0.15rem 0.4rem;
	border-radius: 2px;
	font-size: 0.65rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.card-badge--shield {
	background: #fff3cd;
	color: #856404;
	border: 1px solid #ffeeba;
}

.card-badge--interactive {
	background: #e8f0fe;
	color: #1a4f9c;
	border: 1px solid #c5d9f7;
}

.card-badge--tier {
	background: rgba(0, 0, 0, 0.06);
	color: #555;
}

.card-summary {
	margin: 0.5rem 0;
	line-height: 1.4;
	color: #222;
}

.card-interactive-view {
	margin: 0.5rem 0;
	padding: 0.5rem;
	background: rgba(0, 0, 0, 0.02);
	border: 1px solid rgba(0, 0, 0, 0.1);
	border-radius: 3px;
}

.interactive-prompt {
	margin: 0 0 0.4rem;
	font-weight: 600;
}

.interactive-options {
	display: flex;
	flex-wrap: wrap;
	gap: 0.35rem;
}

.interactive-option-pill {
	padding: 0.15rem 0.4rem;
	border: 1px solid #000;
	border-radius: 3px;
	background: #fff;
	font-size: 0.7rem;
	font-family: inherit;
	cursor: pointer;
}

.interactive-option-pill--selected {
	background: #000;
	color: #fff;
}

.interactive-option-pill:disabled {
	cursor: default;
	opacity: 0.7;
}

.interactive-text-field {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.interactive-text-label {
	font-size: 0.65rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: #555;
}

.interactive-text-input {
	padding: 0.35rem 0.5rem;
	border: 1px solid #000;
	border-radius: 3px;
	font-family: inherit;
	font-size: 0.75rem;
	background: #fff;
}

.interactive-text-input:disabled {
	opacity: 0.7;
}

.card-details {
	margin: 0.5rem 0;
}

.details-toggle {
	cursor: pointer;
	color: #555;
	font-size: 0.7rem;
	user-select: none;
}

.card-code {
	margin: 0.35rem 0 0;
	padding: 0.4rem 0.5rem;
	background: rgba(0, 0, 0, 0.04);
	border-radius: 2px;
	font-size: 0.7rem;
	max-height: 140px;
	overflow: auto;
	white-space: pre-wrap;
	word-break: break-all;
}

.card-footer {
	margin-top: 0.75rem;
	padding-top: 0.5rem;
	border-top: 1px dashed rgba(0, 0, 0, 0.2);
}

.action-buttons {
	display: flex;
	gap: 0.5rem;
	flex-wrap: wrap;
}

.btn-action {
	padding: 0.3rem 0.7rem;
	font-family: inherit;
	font-size: 0.72rem;
	font-weight: 600;
	border: 1px solid #000;
	border-radius: 3px;
	cursor: pointer;
	transition: all 120ms ease;
}

.btn-action:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.btn-action--deny {
	background: #fff;
	color: #b31d1d;
	border-color: #b31d1d;
}

.btn-action--deny:hover:not(:disabled) {
	background: #fff5f5;
}

.btn-action--allow {
	background: #000;
	color: #fff;
}

.btn-action--allow:hover:not(:disabled) {
	opacity: 0.85;
}

.btn-action--always {
	background: #e6f4ea;
	color: #0b6b34;
	border-color: #0b6b34;
}

.btn-action--always:hover:not(:disabled) {
	background: #d2ecd9;
}

.decision-outcome {
	font-weight: 600;
	color: #0b6b34;
	font-size: 0.75rem;
}

.decision-outcome--denied {
	color: #b31d1d;
}
</style>
