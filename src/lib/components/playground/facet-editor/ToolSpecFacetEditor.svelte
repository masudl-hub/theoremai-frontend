<script lang="ts">
import { getContext } from 'svelte';
import { demoHttpSampleInput } from '@theoremai/playground';
import type {
	AuthUnauthenticatedPolicy,
	CustomToolType,
	HttpMethod,
	PlaygroundAuthType,
	ToolAccess,
	ToolLoadTier,
	ToolPermission,
} from '@theoremai/agents/schema';
import ToolSpecTypeIcon from '$lib/components/playground/icons/ToolSpecTypeIcon.svelte';
import Select from '$lib/components/Select.svelte';
import {
	AUTH_UNAUTHENTICATED_OPTIONS,
	HTTP_METHOD_OPTIONS,
	PLAYGROUND_TOOL_TYPE_OPTIONS,
	TOOL_AUTH_TYPE_OPTIONS,
} from '$lib/playground/compat';
import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
import { fieldEnumOptions } from '$lib/playground/field-controls';
import { LIVE_TOOL_LOAD_TIERS, parseList } from '$lib/playground/playground-policy';
import {
	buildTestConnectionAuth,
	parseHeadersJson as parseHeadersJsonStrict,
} from '$lib/playground/remote-tool-auth';
import { parseJsonSchema, sampleInputFromJsonSchema } from '$lib/playground/tool-schema';
import type { GuardrailsData, ToolSpecData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let {
	data,
	patch,
	isLive = false,
}: {
	data: ToolSpecData;
	patch: FacetPatch;
	isLive?: boolean;
} = $props();

const playground = getContext<PlaygroundCtx>(PLAYGROUND_CTX);

const accessOptions = fieldEnumOptions('access');
const permissionOptions = fieldEnumOptions('permission');
const loadTierOptions = $derived(
	isLive
		? fieldEnumOptions('loadTier').filter((o) =>
				(LIVE_TOOL_LOAD_TIERS as readonly string[]).includes(o.value),
			)
		: fieldEnumOptions('loadTier'),
);

$effect(() => {
	if (isLive && !(LIVE_TOOL_LOAD_TIERS as readonly string[]).includes(data.loadTier)) {
		patch({ loadTier: LIVE_TOOL_LOAD_TIERS[0] });
	}
});

const toolTypeCards = $derived(
	PLAYGROUND_TOOL_TYPE_OPTIONS.map((opt) => ({
		value: opt.value,
		label: opt.label,
	})),
);

const isRemote = $derived(data.toolType === 'http' || data.toolType === 'mcp');
const showAuthFields = $derived(isRemote && data.authType && data.authType !== 'none');
const showOAuthFields = $derived(showAuthFields && data.authType === 'oauth2');

let testCredentialInput = $state('');
let testLoading = $state(false);
let testResult = $state<Record<string, unknown> | null>(null);

const guardrails = $derived.by((): GuardrailsData | undefined => {
	const node = playground.getNodes().find((n) => n.data.kind === 'guardrails');
	return node?.data.kind === 'guardrails' ? node.data : undefined;
});

function parseHeadersJson(raw: string): Record<string, string> | undefined {
	return parseHeadersJsonStrict(raw) ?? undefined;
}

function resolveHttpTestSampleInput(toolData: ToolSpecData): Record<string, unknown> {
	const fromDemo = demoHttpSampleInput(toolData.toolName.trim());
	if (fromDemo) return fromDemo;
	const parsed = parseJsonSchema(toolData.inputJson ?? '', 'input');
	if (parsed.ok) return sampleInputFromJsonSchema(parsed.schema);
	return {};
}

async function testConnection(): Promise<void> {
	testLoading = true;
	testResult = null;

	const allowPrivateNetworks = Boolean(guardrails?.allowPrivateNetworks);
	const allowedHosts = guardrails?.allowedHosts ? parseList(guardrails.allowedHosts) : [];
	const headers = data.headersJson ? parseHeadersJson(data.headersJson) : undefined;
	const auth = buildTestConnectionAuth(data);
	const testCredential = testCredentialInput.trim() || undefined;

	try {
		if (data.toolType === 'http') {
			const endpoint = data.endpoint?.trim() ?? '';
			if (!endpoint) {
				testResult = { ok: false, error: 'Endpoint URL is required.' };
				return;
			}
			const res = await fetch('/api/playground/test-connection', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'http',
					endpoint,
					method: data.method ?? 'GET',
					headers,
					pathParams: parseList(data.pathParams ?? ''),
					queryParams: parseList(data.queryParams ?? ''),
					bodyParam: data.bodyParam?.trim() || undefined,
					sampleInput: resolveHttpTestSampleInput(data),
					auth,
					testCredential,
					allowPrivateNetworks,
					allowedHosts,
				}),
			});
			testResult = (await res.json()) as Record<string, unknown>;
			return;
		}

		if (data.toolType === 'mcp') {
			const serverUrl = data.serverUrl?.trim() ?? '';
			if (!serverUrl) {
				testResult = { ok: false, error: 'MCP server URL is required.' };
				return;
			}
			const res = await fetch('/api/playground/test-connection', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'mcp',
					serverUrl,
					mcpToolName: data.mcpToolName?.trim() || undefined,
					headers,
					auth,
					testCredential,
					allowPrivateNetworks,
					allowedHosts,
				}),
			});
			testResult = (await res.json()) as Record<string, unknown>;
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		testResult = { ok: false, error: message };
	} finally {
		testLoading = false;
	}
}
</script>

<label class="facet-field">
	<FacetFieldLabel path="name" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ toolName: e.currentTarget.value })}
		placeholder="geocode_city"
		value={data.toolName}
	>
</label>

<div class="facet-field">
	<FacetFieldLabel path="registerTool.type" text="type" />
	<div class="modality-grid tool-type-grid">
		{#each toolTypeCards as opt (opt.value)}
			<button
				class="modality-card"
				class:modality-card--active={data.toolType === opt.value}
				onclick={() => patch({ toolType: opt.value as CustomToolType })}
				type="button"
			>
				<ToolSpecTypeIcon toolType={opt.value as CustomToolType} size={14} class="modality-icon" />
				<span class="modality-name">{opt.label}</span>
			</button>
		{/each}
	</div>
</div>

<label class="facet-field">
	<FacetFieldLabel path="description" />
	<textarea
		class="field facet-textarea"
		oninput={(e) => patch({ description: e.currentTarget.value })}
		rows="2"
		value={data.description}
	></textarea>
</label>

<label class="facet-field">
	<FacetFieldLabel path="category" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ category: e.currentTarget.value })}
		value={data.category}
	>
</label>

{#if data.toolType === 'http'}
	<label class="facet-field">
		<FacetFieldLabel path="endpoint" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ endpoint: e.currentTarget.value })}
			placeholder="https://api.example.com/v1/items"
			value={data.endpoint ?? ''}
		>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="method" />
		<Select
			onchange={(v) => patch({ method: v as HttpMethod })}
			options={HTTP_METHOD_OPTIONS}
			value={data.method ?? 'GET'}
		/>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="headers" />
		<textarea
			class="field facet-textarea facet-code"
			oninput={(e) => patch({ headersJson: e.currentTarget.value })}
			placeholder={'{ "X-Api-Version": "2024-01-01" }'}
			rows="3"
			spellcheck="false"
			value={data.headersJson ?? ''}
		></textarea>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="mapping.pathParams" text="path params" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ pathParams: e.currentTarget.value })}
			placeholder="id, accountId"
			value={data.pathParams ?? ''}
		>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="mapping.queryParams" text="query params" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ queryParams: e.currentTarget.value })}
			placeholder="q, limit"
			value={data.queryParams ?? ''}
		>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="mapping.bodyParam" text="body param" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ bodyParam: e.currentTarget.value })}
			placeholder="payload"
			value={data.bodyParam ?? ''}
		>
	</label>
{:else if data.toolType === 'mcp'}
	<label class="facet-field">
		<FacetFieldLabel path="serverUrl" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ serverUrl: e.currentTarget.value })}
			placeholder="https://mcp.example.com/mcp"
			value={data.serverUrl ?? ''}
		>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="mcpToolName" text="MCP tool name" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ mcpToolName: e.currentTarget.value })}
			placeholder="search"
			value={data.mcpToolName ?? ''}
		>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="headers" />
		<textarea
			class="field facet-textarea facet-code"
			oninput={(e) => patch({ headersJson: e.currentTarget.value })}
			placeholder={'{ "X-Custom-Header": "value" }'}
			rows="3"
			spellcheck="false"
			value={data.headersJson ?? ''}
		></textarea>
	</label>
{/if}

{#if isRemote}
	<div class="facet-subgroup">
		<span class="facet-subgroup-title">Authentication</span>
		<label class="facet-field">
			<FacetFieldLabel path="auth.type" text="auth type" />
			<Select
				onchange={(v) => patch({ authType: v as PlaygroundAuthType })}
				options={TOOL_AUTH_TYPE_OPTIONS}
				value={data.authType ?? 'none'}
			/>
		</label>
		{#if showAuthFields}
			<label class="facet-field">
				<FacetFieldLabel path="auth.slot" text="credential slot" />
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => patch({ authSlot: e.currentTarget.value })}
					placeholder="default"
					value={data.authSlot ?? ''}
				>
			</label>
			<label class="facet-field">
				<FacetFieldLabel path="auth.headerName" text="header name" />
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => patch({ authHeaderName: e.currentTarget.value })}
					placeholder="Authorization"
					value={data.authHeaderName ?? ''}
				>
			</label>
			<label class="facet-field">
				<FacetFieldLabel path="auth.headerPrefix" text="header prefix" />
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => patch({ authHeaderPrefix: e.currentTarget.value })}
					placeholder="Bearer "
					value={data.authHeaderPrefix ?? ''}
				>
			</label>
			<label class="facet-field">
				<FacetFieldLabel path="auth.onUnauthenticated" text="when unauthenticated" />
				<Select
					onchange={(v) => patch({ authUnauthenticated: v as AuthUnauthenticatedPolicy })}
					options={AUTH_UNAUTHENTICATED_OPTIONS}
					value={data.authUnauthenticated ?? 'pause'}
				/>
			</label>
			{#if showOAuthFields}
				<label class="facet-field">
					<FacetFieldLabel path="auth.scopes" text="OAuth scopes" />
					<input
						class="field"
						autocomplete="off"
						oninput={(e) => patch({ authScopes: e.currentTarget.value })}
						placeholder="read, write"
						value={data.authScopes ?? ''}
					>
				</label>
				<label class="facet-field">
					<FacetFieldLabel path="auth.clientId" text="OAuth client ID" />
					<input
						class="field"
						autocomplete="off"
						oninput={(e) => patch({ authClientId: e.currentTarget.value })}
						placeholder="your-client-id"
						value={data.authClientId ?? ''}
					>
				</label>
				<label class="facet-field">
					<FacetFieldLabel path="auth.redirectUri" text="OAuth redirect URI" />
					<input
						class="field"
						autocomplete="off"
						oninput={(e) => patch({ authRedirectUri: e.currentTarget.value })}
						placeholder="https://app.example.com/oauth/callback"
						value={data.authRedirectUri ?? ''}
					>
				</label>
			{/if}
		{/if}
	</div>

	<div class="facet-subgroup">
		<span class="facet-subgroup-title">Pre-run connectivity check</span>
		<p class="facet-field-hint">
			Verify the endpoint or MCP server responds before running the agent. Uses guardrails network
			policy from the Guardrails facet.
		</p>
		{#if showAuthFields}
			<label class="facet-field">
				<FacetFieldLabel path="playground.testCredential" text="test credential" />
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => {
						testCredentialInput = e.currentTarget.value;
					}}
					placeholder="Bearer token or API key for this test only"
					type="password"
					value={testCredentialInput}
				>
			</label>
		{/if}
		<button
			class="field facet-test-btn"
			disabled={testLoading}
			onclick={() => {
				void testConnection();
			}}
			type="button"
		>
			{testLoading ? 'Testing…' : 'Test connection'}
		</button>
		{#if testResult}
			<pre
				class="field facet-textarea facet-code facet-test-result"
			>{JSON.stringify(testResult, null, 2)}</pre>
		{/if}
	</div>
{/if}

<label class="facet-field">
	<FacetFieldLabel path="access" />
	<Select
		onchange={(v) => patch({ access: v as ToolAccess })}
		options={accessOptions}
		value={data.access}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="permission" />
	<Select
		onchange={(v) => patch({ permission: v as ToolPermission })}
		options={permissionOptions}
		value={data.permission}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="loadTier" />
	<Select
		onchange={(v) => patch({ loadTier: v as ToolLoadTier })}
		options={loadTierOptions}
		value={data.loadTier}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="paths" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ paths: e.currentTarget.value })}
		placeholder="*"
		value={data.paths}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="input" />
	<textarea
		class="field facet-textarea facet-code"
		oninput={(e) => patch({ inputJson: e.currentTarget.value })}
		rows="8"
		spellcheck="false"
		value={data.inputJson}
	></textarea>
</label>
<label class="facet-field">
	<FacetFieldLabel path="output" />
	<textarea
		class="field facet-textarea facet-code"
		oninput={(e) => patch({ outputJson: e.currentTarget.value })}
		rows="8"
		spellcheck="false"
		value={data.outputJson}
	></textarea>
</label>
{#if data.toolType === 'function'}
	<label class="facet-field">
		<FacetFieldLabel path="playground.stubOutput" text="stub output (JSON)" />
		<textarea
			class="field facet-textarea facet-code"
			oninput={(e) => patch({ stubOutputJson: e.currentTarget.value })}
			placeholder={'{ "result": "playground stub" }'}
			rows="4"
			spellcheck="false"
			value={data.stubOutputJson ?? ''}
		></textarea>
	</label>
{/if}

<style>
.tool-type-grid {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.facet-test-btn {
	cursor: pointer;
	font-family: var(--font-mono);
	text-align: center;
}

.facet-test-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.facet-test-result {
	margin-top: var(--fe-space-field);
	max-height: 12rem;
	overflow: auto;
}
</style>
