<script lang="ts">
import type { ToolPause } from 'theorum/kernel';

let {
	pause,
	toolName,
	onSubmitCredential,
}: {
	pause: ToolPause;
	toolName: string;
	onSubmitCredential?: (slot: string, credential: { token?: string; apiKey?: string }) => void;
} = $props();

const challenge = $derived(pause.authChallenge);
const authType = $derived(challenge?.authType ?? 'bearer');
const slot = $derived(challenge?.slot ?? 'default');
const authUrl = $derived(challenge?.authorizationUrl);

let secretInput = $state('');
let submitted = $state(false);

function handleSubmit() {
	if (!secretInput.trim()) return;
	submitted = true;
	if (authType === 'api_key') {
		onSubmitCredential?.(slot, { apiKey: secretInput.trim() });
	} else {
		onSubmitCredential?.(slot, { token: secretInput.trim() });
	}
}

function handleOAuthAuthorize() {
	if (authUrl) {
		window.open(authUrl, '_blank', 'width=600,height=700');
	}
}
</script>

<article class="renderable-card auth-card" class:auth-card--submitted={submitted}>
	<header class="card-header">
		<div class="card-title-group">
			<span class="card-badge card-badge--auth">🔐 Auth Challenge</span>
			<h4 class="card-title">Authentication Required: <code>{toolName}</code></h4>
		</div>
		<span class="card-badge card-badge--type">{authType}</span>
	</header>

	<p class="card-summary">
		{challenge?.message ?? 'This tool requires valid authentication credentials to proceed.'}
	</p>

	{#if challenge?.resource}
		<div class="card-meta-row">
			<span class="meta-label">Resource:</span>
			<span class="meta-val">{challenge.resource}</span>
		</div>
	{/if}

	{#if challenge?.requiredScopes?.length}
		<div class="card-meta-row">
			<span class="meta-label">Scopes:</span>
			<div class="meta-scopes">
				{#each challenge.requiredScopes as scope (scope)}
					<span class="scope-pill">{scope}</span>
				{/each}
			</div>
		</div>
	{/if}

	<div class="auth-action-area">
		{#if authType === 'oauth2'}
			{#if authUrl}
				<div class="oauth-prompt">
					<p class="oauth-desc">Authorize this tool via your identity provider using PKCE:</p>
					<button class="btn-oauth" onclick={handleOAuthAuthorize} type="button">
						Authorize with Provider ↗
					</button>
				</div>
			{:else}
				<p class="oauth-desc">OAuth 2.1 authorization endpoint not pre-configured.</p>
			{/if}
		{:else}
			{#if !submitted}
				<div class="credential-input-form">
					<label class="cred-label">
						<span>Provide {authType === 'api_key' ? 'API Key' : 'Bearer Token'}:</span>
						<input
							class="cred-input"
							autocomplete="off"
							bind:value={secretInput}
							placeholder="Enter secret for slot '{slot}'"
							type="password"
						>
					</label>
					<button
						class="btn-submit-cred"
						disabled={!secretInput.trim()}
						onclick={handleSubmit}
						type="button"
					>
						Submit & Continue
					</button>
				</div>
			{:else}
				<div class="submitted-notice">
					<span>✓ Credential provided for slot: <code>{slot}</code></span>
				</div>
			{/if}
		{/if}
	</div>
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

.card-badge--auth {
	background: #e8f0fe;
	color: #1a73e8;
	border: 1px solid #d2e3fc;
}

.card-badge--type {
	background: rgba(0, 0, 0, 0.06);
	color: #555;
}

.card-summary {
	margin: 0.5rem 0;
	line-height: 1.4;
	color: #222;
}

.card-meta-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin: 0.25rem 0;
	font-size: 0.72rem;
}

.meta-label {
	color: #666;
	font-weight: 600;
}

.meta-val {
	font-weight: 500;
}

.meta-scopes {
	display: flex;
	flex-wrap: wrap;
	gap: 0.25rem;
}

.scope-pill {
	padding: 0.08rem 0.35rem;
	background: rgba(0, 0, 0, 0.05);
	border: 1px solid rgba(0, 0, 0, 0.1);
	border-radius: 2px;
	font-size: 0.68rem;
}

.auth-action-area {
	margin-top: 0.75rem;
	padding-top: 0.5rem;
	border-top: 1px dashed rgba(0, 0, 0, 0.2);
}

.oauth-prompt {
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}

.oauth-desc {
	margin: 0;
	font-size: 0.72rem;
	color: #444;
}

.btn-oauth {
	align-self: flex-start;
	padding: 0.35rem 0.75rem;
	background: #1a73e8;
	color: #fff;
	border: 1px solid #1a73e8;
	border-radius: 3px;
	font-family: inherit;
	font-size: 0.75rem;
	font-weight: 600;
	cursor: pointer;
	transition: opacity 120ms ease;
}

.btn-oauth:hover {
	opacity: 0.9;
}

.credential-input-form {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.cred-label {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	font-size: 0.72rem;
	color: #333;
}

.cred-input {
	padding: 0.3rem 0.5rem;
	font-family: inherit;
	font-size: 0.75rem;
	border: 1px solid #000;
	border-radius: 3px;
	background: #fff;
}

.btn-submit-cred {
	align-self: flex-start;
	padding: 0.3rem 0.75rem;
	background: #000;
	color: #fff;
	border: 1px solid #000;
	border-radius: 3px;
	font-family: inherit;
	font-size: 0.72rem;
	font-weight: 600;
	cursor: pointer;
}

.btn-submit-cred:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.submitted-notice {
	font-weight: 600;
	color: #0b6b34;
	font-size: 0.75rem;
}

.submitted-notice code {
	background: rgba(11, 107, 52, 0.1);
	padding: 0.1rem 0.3rem;
	border-radius: 2px;
}
</style>
