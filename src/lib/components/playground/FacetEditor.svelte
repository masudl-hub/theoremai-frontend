<script lang="ts">
import { getContext } from 'svelte';
import type { Protocol, Provider } from 'theorum/schema';
import { coerceProtocol, coerceProvider, providersFor } from 'theorum/schema';
import TypeTip from '$lib/components/TypeTip.svelte';
import { PLAYGROUND_PROVIDERS, protocolsForModality, toggleList } from '$lib/playground/compat';
import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
import { coerceSpeechFormat } from '$lib/playground/field-controls';
import {
	allowedBuiltinsForGemini,
	defaultApiIdForTransport,
	defaultGeminiApiId,
	type GoogleBuiltinId,
	geminiModelSelectOptions,
	isGoogleTransport,
	isOpenRouterTransport,
	OPENROUTER_PLAYGROUND_API_ID,
	sanitizeBuiltInsForApiId,
	syncModelSpecsForTransport,
} from '$lib/playground/playground-policy';
import type { FacetData, ModelSpecData, PlaygroundNode, ProfileType } from '$lib/playground/types';
import './facet-editor/facet-editor.css';
import GuardrailsFacetEditor from './facet-editor/GuardrailsFacetEditor.svelte';
import IdentityFacetEditor from './facet-editor/IdentityFacetEditor.svelte';
import ImageFacetEditor from './facet-editor/ImageFacetEditor.svelte';
import InputsFacetEditor from './facet-editor/InputsFacetEditor.svelte';
import LiveFacetEditor from './facet-editor/LiveFacetEditor.svelte';
import ModelSpecFacetEditor from './facet-editor/ModelSpecFacetEditor.svelte';
import ModelsFacetEditor from './facet-editor/ModelsFacetEditor.svelte';
import OutputsFacetEditor from './facet-editor/OutputsFacetEditor.svelte';
import SpeechFacetEditor from './facet-editor/SpeechFacetEditor.svelte';
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

const identityProfileType = $derived(
	(
		playground.getNodes().find((n) => n.data.kind === 'identity')?.data as
			| { profileType?: string }
			| undefined
	)?.profileType,
);

const protocolOptions = $derived(protocolsForModality(identityProfileType as ProfileType));

const hubProtocol = $derived(modelsHub.protocol ?? 'geminiInteractions');
const geminiModelOptions = $derived(geminiModelSelectOptions(hubProtocol));

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
	return defaultApiIdForTransport(protocol, provider);
});

function syncSpeechFormats(protocol: Protocol) {
	if (!playground) return;
	for (const n of playground.getNodes()) {
		if (n.data.kind !== 'speech') continue;
		const legal = coerceSpeechFormat(protocol, n.data.format);
		if (legal !== n.data.format) playground.patchNode(n.id, { format: legal });
	}
}

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

function setProtocol(next: Protocol) {
	if (data.kind !== 'models') return;
	const provider = coerceProvider(next, data.provider as Provider);
	const google = provider === 'google' && (next === 'geminiInteractions' || next === 'geminiLive');
	patch({
		protocol: next,
		provider,
		...(google && !data.key ? { key: 'slotA' as const } : {}),
	});
	syncHubModelSpecs(next, provider);
	syncSpeechFormats(next);
}

function setProvider(next: Provider) {
	if (data.kind !== 'models') return;
	const protocol = coerceProtocol(data.protocol as Protocol, next);
	const google =
		next === 'google' && (protocol === 'geminiInteractions' || protocol === 'geminiLive');
	patch({
		protocol,
		provider: next,
		...(google && !data.key ? { key: 'slotA' as const } : {}),
	});
	syncHubModelSpecs(protocol, next);
	syncSpeechFormats(protocol);
}

const onProtocolChange = setProtocol;
const onProviderChange = setProvider;
</script>

<div class="facet-editor">
	<TypeTip variant="label">
		{#if data.kind === 'identity'}
			<IdentityFacetEditor {data} {patch} />
		{:else if data.kind === 'image'}
			<ImageFacetEditor {data} {patch} />
		{:else if data.kind === 'speech'}
			<SpeechFacetEditor {data} {patch} protocol={hubProtocol} />
		{:else if data.kind === 'live'}
			<LiveFacetEditor {data} {patch} />
		{:else if data.kind === 'models'}
			<ModelsFacetEditor
				{data}
				{patch}
				{playground}
				{onProtocolChange}
				{onProviderChange}
				{providerOptions}
				{protocolOptions}
				isLive={identityProfileType === 'live'}
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
			/>
		{:else if data.kind === 'tools'}
			<ToolsFacetEditor {data} {patch} {playground} isLive={identityProfileType === 'live'} />
		{:else if data.kind === 'toolSpec'}
			<ToolSpecFacetEditor {data} {patch} />
		{:else if data.kind === 'inputs'}
			<InputsFacetEditor {data} {patch} />
		{:else if data.kind === 'outputs'}
			<OutputsFacetEditor {data} {patch} />
		{:else if data.kind === 'guardrails'}
			<GuardrailsFacetEditor {data} {patch} />
		{/if}
	</TypeTip>
</div>
