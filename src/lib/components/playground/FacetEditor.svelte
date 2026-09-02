<script lang="ts">
import { getContext } from 'svelte';
import type { Protocol, Provider } from 'theorum/schema';
import { coerceProtocol, coerceProvider, providersFor } from 'theorum/schema';
import TypeTip from '$lib/components/TypeTip.svelte';
import {
	GEMINI_KEY_OPTIONS,
	ON_BLOCK_OPTIONS,
	PLAYGROUND_PROTOCOLS,
	PLAYGROUND_PROVIDERS,
	PLAYGROUND_THINKING_LEVELS,
	SCHEMA_ENFORCEMENT_OPTIONS,
	SPEECH_FORMAT_OPTIONS,
	STREAM_MODE_OPTIONS,
	toggleList,
} from '$lib/playground/compat';
import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
import { defaultApiIdPlaceholder } from '$lib/playground/free-tier';
import { type OutputRole, outputRoleFromData, patchOutputRole } from '$lib/playground/outputs';
import {
	allowedBuiltinsForGemini,
	clearMp3SpeechOnGeminiInteractions,
	defaultGeminiApiId,
	type GoogleBuiltinId,
	geminiModelSelectOptions,
	isGoogleTransport,
	isOpenRouterTransport,
	OPENROUTER_PLAYGROUND_API_ID,
	sanitizeBuiltInsForApiId,
	syncModelSpecsForTransport,
} from '$lib/playground/playground-policy';
import type { FacetData, ModelSpecData, PlaygroundNode } from '$lib/playground/types';
import './facet-editor/facet-editor.css';
import GuardrailsFacetEditor from './facet-editor/GuardrailsFacetEditor.svelte';
import IdentityFacetEditor from './facet-editor/IdentityFacetEditor.svelte';
import InputsFacetEditor from './facet-editor/InputsFacetEditor.svelte';
import ModelSpecFacetEditor from './facet-editor/ModelSpecFacetEditor.svelte';
import ModelsFacetEditor from './facet-editor/ModelsFacetEditor.svelte';
import OutputsFacetEditor from './facet-editor/OutputsFacetEditor.svelte';
import ToolSpecFacetEditor from './facet-editor/ToolSpecFacetEditor.svelte';
import ToolsFacetEditor from './facet-editor/ToolsFacetEditor.svelte';

let { id, data }: { id: string; data: PlaygroundNode['data'] } = $props();

const playground = getContext<PlaygroundCtx>(PLAYGROUND_CTX);

const modelsHub = $derived(playground.hub);

const providerOptions = $derived.by(() => {
	if (data.kind !== 'models') return PLAYGROUND_PROVIDERS;
	const allowed = new Set(providersFor(data.protocol as Protocol));
	return PLAYGROUND_PROVIDERS.filter((p) => allowed.has(p.value));
});

const protocolOptions = PLAYGROUND_PROTOCOLS;

const speechFormatOptions = $derived.by(() => {
	const protocol = modelsHub.protocol ?? 'openAi';
	if (protocol === 'geminiInteractions') {
		return SPEECH_FORMAT_OPTIONS.filter((opt) => opt.value === 'pcm');
	}
	return SPEECH_FORMAT_OPTIONS;
});

const thinkingOptions = PLAYGROUND_THINKING_LEVELS;
const keyOptions = GEMINI_KEY_OPTIONS;
const streamModeOptions = STREAM_MODE_OPTIONS;
const enforcedOptions = SCHEMA_ENFORCEMENT_OPTIONS;
const egressModeOptions = [
	{ value: 'default', label: 'default (standardEgressEnforce)' },
	{ value: 'none', label: 'none (omit explicitly)' },
];
const geminiModelOptions = $derived(
	geminiModelSelectOptions(modelsHub.protocol ?? 'geminiInteractions'),
);

const hubOpenRouter = $derived(
	modelsHub ? isOpenRouterTransport(modelsHub.protocol, modelsHub.provider) : false,
);
const hubGoogle = $derived(
	modelsHub ? isGoogleTransport(modelsHub.protocol, modelsHub.provider) : false,
);

const geminiDefaultApiId = $derived(defaultGeminiApiId(modelsHub.protocol ?? 'geminiInteractions'));

const geminiApiId = $derived(
	data.kind === 'modelSpec' ? data.apiId.trim() || geminiDefaultApiId : geminiDefaultApiId,
);

const allowedGeminiBuiltins = $derived(
	data.kind === 'modelSpec' && hubGoogle ? allowedBuiltinsForGemini(geminiApiId) : [],
);

const geminiBuiltIns = $derived.by(() => {
	if (data.kind !== 'modelSpec') return [] as GoogleBuiltinId[];
	return data.builtInTools
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean) as GoogleBuiltinId[];
});

const apiIdPlaceholder = $derived.by(() => {
	if (data.kind !== 'modelSpec') return 'apiId';
	const protocol = modelsHub.protocol ?? 'openAi';
	const provider = modelsHub.provider ?? 'openrouter';
	return defaultApiIdPlaceholder(protocol, provider);
});

const onBlockOptions = ON_BLOCK_OPTIONS;

function syncHubModelSpecs(protocol: string, provider: string) {
	if (!playground) return;
	const specs = playground
		.getNodes()
		.filter((n) => n.data.kind === 'modelSpec')
		.map((n) => ({
			id: n.id,
			apiId: (n.data as ModelSpecData).apiId,
			builtInTools: (n.data as ModelSpecData).builtInTools,
		}));
	for (const [nodeId, patchSpec] of syncModelSpecsForTransport(specs, protocol, provider)) {
		playground.patchNode(nodeId, patchSpec);
	}
}

function setGeminiApiId(next: string) {
	if (data.kind !== 'modelSpec') return;
	patch({
		apiId: next,
		builtInTools: sanitizeBuiltInsForApiId(next, data.builtInTools),
	});
}

function toggleGeminiBuiltin(builtin: GoogleBuiltinId, on: boolean) {
	if (data.kind !== 'modelSpec') return;
	const next = toggleList(geminiBuiltIns, builtin, on) as GoogleBuiltinId[];
	patch({ builtInTools: next.join(', ') });
}

const onGeminiApiIdChange = setGeminiApiId;
const onGeminiBuiltinToggle = toggleGeminiBuiltin;

$effect(() => {
	if (data.kind !== 'modelSpec') return;
	if (hubOpenRouter && data.apiId !== OPENROUTER_PLAYGROUND_API_ID) {
		patch({ apiId: OPENROUTER_PLAYGROUND_API_ID });
	}
	if (hubGoogle && !data.apiId.trim()) {
		patch({ apiId: geminiDefaultApiId });
	}
});

function patch(partial: Partial<FacetData>) {
	playground.patchNode(id, partial as Partial<PlaygroundNode['data']>);
}

const outputRole = $derived.by((): OutputRole => {
	if (data.kind !== 'outputs') return 'text';
	return outputRoleFromData(data);
});

function setOutputRole(role: OutputRole) {
	if (data.kind !== 'outputs') return;
	patch(patchOutputRole(role));
}

const onOutputRoleChange = setOutputRole;

function setProtocol(next: Protocol) {
	if (data.kind !== 'models') return;
	const provider = coerceProvider(next, data.provider as Provider);
	patch({ protocol: next, provider });
	syncHubModelSpecs(next, provider);
	clearMp3SpeechOnGeminiInteractions(
		() => playground.getNodes(),
		(id, partial) => playground.patchNode(id, partial),
		next,
	);
}

function setProvider(next: Provider) {
	if (data.kind !== 'models') return;
	const protocol = coerceProtocol(data.protocol as Protocol, next);
	patch({ protocol, provider: next });
	syncHubModelSpecs(protocol, next);
	clearMp3SpeechOnGeminiInteractions(
		() => playground.getNodes(),
		(id, partial) => playground.patchNode(id, partial),
		protocol,
	);
}

const onProtocolChange = setProtocol;
const onProviderChange = setProvider;
</script>

<div class="facet-editor">
	<TypeTip variant="label">
		{#if data.kind === 'identity'}
			<IdentityFacetEditor {data} {patch} />
		{:else if data.kind === 'models'}
			<ModelsFacetEditor
				{data}
				{patch}
				{playground}
				{onProtocolChange}
				{onProviderChange}
				{providerOptions}
				{protocolOptions}
				{thinkingOptions}
				{keyOptions}
			/>
		{:else if data.kind === 'modelSpec'}
			<ModelSpecFacetEditor
				{data}
				{patch}
				{hubOpenRouter}
				{hubGoogle}
				{geminiModelOptions}
				{geminiApiId}
				{allowedGeminiBuiltins}
				{geminiBuiltIns}
				{apiIdPlaceholder}
				{onGeminiApiIdChange}
				{onGeminiBuiltinToggle}
				{thinkingOptions}
			/>
		{:else if data.kind === 'tools'}
			<ToolsFacetEditor {data} {patch} {playground} />
		{:else if data.kind === 'toolSpec'}
			<ToolSpecFacetEditor {data} {patch} />
		{:else if data.kind === 'inputs'}
			<InputsFacetEditor {data} {patch} />
		{:else if data.kind === 'outputs'}
			<OutputsFacetEditor
				{data}
				{patch}
				{outputRole}
				{onOutputRoleChange}
				{speechFormatOptions}
				{enforcedOptions}
				{streamModeOptions}
			/>
		{:else if data.kind === 'guardrails'}
			<GuardrailsFacetEditor {data} {patch} {onBlockOptions} {egressModeOptions} />
		{/if}
	</TypeTip>
</div>
