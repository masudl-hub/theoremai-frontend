<script lang="ts">
import type { Protocol, Provider } from '@theoremai/agents/schema';
import { coerceProtocol, coerceProvider, providersFor } from '@theoremai/agents/schema';
import { getContext } from 'svelte';
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
} from '$lib/playground/playground-policy';
import type {
	FacetData,
	ModelBindingData,
	PlaygroundNode,
	ProfileType,
} from '$lib/playground/types';
import './facet-editor/facet-editor.css';
import GuardrailsFacetEditor from './facet-editor/GuardrailsFacetEditor.svelte';
import IdentityFacetEditor from './facet-editor/IdentityFacetEditor.svelte';
import ImageFacetEditor from './facet-editor/ImageFacetEditor.svelte';
import InputsFacetEditor from './facet-editor/InputsFacetEditor.svelte';
import LiveFacetEditor from './facet-editor/LiveFacetEditor.svelte';
import ModelBindingFacetEditor from './facet-editor/ModelBindingFacetEditor.svelte';
import ModelsFacetEditor from './facet-editor/ModelsFacetEditor.svelte';
import ObservabilityFacetEditor from './facet-editor/ObservabilityFacetEditor.svelte';
import OutputsFacetEditor from './facet-editor/OutputsFacetEditor.svelte';
import SpeechFacetEditor from './facet-editor/SpeechFacetEditor.svelte';
import ToolSpecFacetEditor from './facet-editor/ToolSpecFacetEditor.svelte';
import ToolsFacetEditor from './facet-editor/ToolsFacetEditor.svelte';
import TurnBehaviourFacetEditor from './facet-editor/TurnBehaviourFacetEditor.svelte';

let { id, data }: { id: string; data: PlaygroundNode['data'] } = $props();

const playground = getContext<PlaygroundCtx>(PLAYGROUND_CTX);

const identityProfileType = $derived(
	(
		playground.getNodes().find((n) => n.data.kind === 'identity')?.data as
			| { profileType?: string }
			| undefined
	)?.profileType,
);

const protocolOptions = $derived(protocolsForModality(identityProfileType as ProfileType));

const modelIds = $derived(
	playground
		.getNodes()
		.filter((n) => n.data.kind === 'modelBinding')
		.map((n) => (n.data as ModelBindingData).modelId.trim())
		.filter(Boolean),
);

const bindingTransport = $derived.by(() => {
	if (data.kind === 'modelBinding') {
		return { protocol: data.protocol, provider: data.provider };
	}
	const nodes = playground.getNodes();
	const modelsData = nodes.find((n) => n.data.kind === 'models')?.data as
		| { defaultModel?: string }
		| undefined;
	const defaultId = modelsData?.defaultModel?.trim();
	const spec = nodes.find(
		(n) =>
			n.data.kind === 'modelBinding' &&
			(defaultId ? (n.data as ModelBindingData).modelId.trim() === defaultId : true),
	)?.data as ModelBindingData | undefined;
	return {
		protocol: spec?.protocol ?? playground.hub.protocol,
		provider: spec?.provider ?? playground.hub.provider,
	};
});

const hubProtocol = $derived(bindingTransport.protocol ?? 'geminiInteractions');
const geminiModelOptions = $derived(geminiModelSelectOptions(hubProtocol));

const hubOpenRouter = $derived(
	isOpenRouterTransport(bindingTransport.protocol, bindingTransport.provider),
);
const hubGoogle = $derived(isGoogleTransport(bindingTransport.protocol, bindingTransport.provider));

const geminiDefaultApiId = $derived(defaultGeminiApiId(hubProtocol));

const geminiApiId = $derived(
	data.kind === 'modelBinding' ? data.apiId.trim() || geminiDefaultApiId : geminiDefaultApiId,
);

const bindingProviderOptions = $derived.by(() => {
	if (data.kind !== 'modelBinding') return PLAYGROUND_PROVIDERS;
	const allowed = new Set(providersFor(data.protocol as Protocol));
	return PLAYGROUND_PROVIDERS.filter((p) => allowed.has(p.value));
});

const allowedGeminiBuiltins = $derived(
	data.kind === 'modelBinding' && hubGoogle ? allowedBuiltinsForGemini(geminiApiId) : [],
);

const geminiBuiltIns = $derived.by(() => {
	if (data.kind !== 'modelBinding') return [] as GoogleBuiltinId[];
	return data.builtInTools
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean) as GoogleBuiltinId[];
});

const apiIdPlaceholder = $derived.by(() => {
	if (data.kind !== 'modelBinding') return 'apiId';
	return defaultApiIdForTransport(bindingTransport.protocol, bindingTransport.provider);
});

function syncSpeechFormats(protocol: Protocol) {
	for (const n of playground.getNodes()) {
		if (n.data.kind !== 'speech') continue;
		if (!n.data.format) continue;
		const legal = coerceSpeechFormat(protocol, n.data.format);
		if (legal !== n.data.format) playground.patchNode(n.id, { format: legal });
	}
}

function ensureProfileKeyForGoogle() {
	const modelsNode = playground.getNodes().find((n) => n.data.kind === 'models');
	if (modelsNode?.data.kind !== 'models' || modelsNode.data.key) return;
	playground.patchNode(modelsNode.id, { key: 'slotA' });
}

function setGeminiApiId(next: string) {
	if (data.kind !== 'modelBinding') return;
	patch({
		apiId: next,
		builtInTools: sanitizeBuiltInsForApiId(next, data.builtInTools),
	});
}

function toggleGeminiBuiltin(builtin: GoogleBuiltinId, on: boolean) {
	if (data.kind !== 'modelBinding') return;
	const next = toggleList(geminiBuiltIns, builtin, on) as GoogleBuiltinId[];
	patch({ builtInTools: next.join(', ') });
}

const onGeminiApiIdChange = setGeminiApiId;
const onGeminiBuiltinToggle = toggleGeminiBuiltin;

$effect(() => {
	if (data.kind !== 'modelBinding') return;
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

function setBindingProtocol(next: Protocol) {
	if (data.kind !== 'modelBinding') return;
	const provider = coerceProvider(next, data.provider as Provider);
	const google = provider === 'google' && (next === 'geminiInteractions' || next === 'geminiLive');
	const apiId = defaultApiIdForTransport(next, provider);
	patch({
		protocol: next,
		provider,
		apiId,
		builtInTools: google ? sanitizeBuiltInsForApiId(apiId, data.builtInTools) : data.builtInTools,
	});
	if (google) ensureProfileKeyForGoogle();
	syncSpeechFormats(next);
}

function setBindingProvider(next: Provider) {
	if (data.kind !== 'modelBinding') return;
	const protocol = coerceProtocol(data.protocol as Protocol, next);
	const google =
		next === 'google' && (protocol === 'geminiInteractions' || protocol === 'geminiLive');
	const apiId = defaultApiIdForTransport(protocol, next);
	patch({
		protocol,
		provider: next,
		apiId,
		builtInTools: google ? sanitizeBuiltInsForApiId(apiId, data.builtInTools) : data.builtInTools,
	});
	if (google) ensureProfileKeyForGoogle();
	syncSpeechFormats(protocol);
}

const onProtocolChange = setBindingProtocol;
const onProviderChange = setBindingProvider;
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
				{modelIds}
				isLive={identityProfileType === 'live'}
			/>
		{:else if data.kind === 'modelBinding'}
			<ModelBindingFacetEditor
				{data}
				{patch}
				providerOptions={bindingProviderOptions}
				{protocolOptions}
				{hubOpenRouter}
				{hubGoogle}
				{geminiModelOptions}
				{geminiApiId}
				{allowedGeminiBuiltins}
				{geminiBuiltIns}
				{apiIdPlaceholder}
				{onProtocolChange}
				{onProviderChange}
				{onGeminiApiIdChange}
				{onGeminiBuiltinToggle}
			/>
		{:else if data.kind === 'tools'}
			<ToolsFacetEditor {data} {patch} {playground} isLive={identityProfileType === 'live'} />
		{:else if data.kind === 'toolSpec'}
			<ToolSpecFacetEditor {data} {patch} isLive={identityProfileType === 'live'} />
		{:else if data.kind === 'inputs'}
			<InputsFacetEditor {data} {patch} />
		{:else if data.kind === 'outputs'}
			<OutputsFacetEditor {data} {patch} />
		{:else if data.kind === 'turnBehaviour'}
			<TurnBehaviourFacetEditor {data} {patch} />
		{:else if data.kind === 'guardrails'}
			<GuardrailsFacetEditor {data} {patch} />
		{:else if data.kind === 'observability'}
			<ObservabilityFacetEditor {data} {patch} />
		{:else}
			<p class="facet-editor-error">No editor available for this facet.</p>
		{/if}
	</TypeTip>
</div>
