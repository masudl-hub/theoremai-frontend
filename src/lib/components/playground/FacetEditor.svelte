<script lang="ts">
import { getContext } from 'svelte';
import type { Protocol, Provider, ToolLoadTier } from 'theorum/schema';
import { coerceProtocol, coerceProvider, providersFor } from 'theorum/schema';
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import MimeAcceptGrid from '$lib/components/playground/MimeAcceptGrid.svelte';
import Select from '$lib/components/Select.svelte';
import TypeTip from '$lib/components/TypeTip.svelte';
import {
	GEMINI_KEY_OPTIONS,
	ON_BLOCK_OPTIONS,
	PLAYGROUND_PROTOCOLS,
	PLAYGROUND_PROVIDERS,
	PLAYGROUND_THINKING_LEVELS,
	PLAYGROUND_TURN_STOP_KINDS,
	SCHEMA_ENFORCEMENT_OPTIONS,
	SPEECH_FORMAT_OPTIONS,
	STREAM_MODE_OPTIONS,
	SUMMARY_MODE_OPTIONS,
	type ThinkingLevelValue,
	TOOL_ACCESS_OPTIONS,
	TOOL_LOAD_TIER_OPTIONS,
	TOOL_PERMISSION_OPTIONS,
	toggleList,
} from '$lib/playground/compat';
import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
import { defaultApiIdPlaceholder } from '$lib/playground/free-tier';
import { ATTACHMENT_ACCEPT_OPTIONS, VOICE_ACCEPT_OPTIONS } from '$lib/playground/mime';
import {
	OUTPUT_ROLE_OPTIONS,
	type OutputRole,
	outputRoleFromData,
	patchOutputRole,
} from '$lib/playground/outputs';
import {
	allowedBuiltinsForGemini,
	clearMp3SpeechOnGeminiInteractions,
	defaultGeminiApiId,
	GOOGLE_BUILTIN_OPTIONS,
	type GoogleBuiltinId,
	geminiModelSelectOptions,
	isGoogleTransport,
	isOpenRouterTransport,
	OPENROUTER_PLAYGROUND_API_ID,
	OPENROUTER_PLAYGROUND_NOTE,
	sanitizeBuiltInsForApiId,
	syncModelSpecsForTransport,
} from '$lib/playground/playground-policy';
import type {
	FacetData,
	ModelSpecData,
	ModelsData,
	PlaygroundNode,
	ToolAccessValue,
	ToolPermissionValue,
} from '$lib/playground/types';

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
const summaryOptions = SUMMARY_MODE_OPTIONS;
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
</script>

<div class="facet-editor">
	{#snippet t(path: string, text: string = path)}
		<button class="type-label facet-field-label" data-type-path={path} type="button">{text}</button>
	{/snippet}
	{#snippet attachmentsAcceptLegend()}
		{@render t('inputs.attachments.accept')}
	{/snippet}
	{#snippet voiceAcceptLegend()}
		{@render t('inputs.voice.accept')}
	{/snippet}
	<TypeTip variant="label">
		{#if data.kind === 'identity'}
			<label class="facet-field">
				{@render t('id')}
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => patch({ agentId: e.currentTarget.value })}
					value={data.agentId}
				>
			</label>
			<label class="facet-field">
				{@render t('identity.handle')}
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => patch({ handle: e.currentTarget.value })}
					value={data.handle}
				>
			</label>
			<label class="facet-field">
				{@render t('identity.system')}
				<textarea
					class="field facet-area"
					oninput={(e) => patch({ system: e.currentTarget.value })}
					rows="4"
					value={data.system}
				></textarea>
			</label>
			<p class="facet-hint">
				Optional here — or load the same string from another file when you wire the profile.
			</p>
			<label class="facet-check text-xs">
				<Checkbox checked={data.chat} onchange={(v) => patch({ chat: v })} />
				{@render t('identity.chat')}
			</label>
		{:else if data.kind === 'models'}
			<label class="facet-field">
				{@render t('model.protocol')}
				<Select
					onchange={(v) => setProtocol(v as Protocol)}
					options={protocolOptions}
					value={data.protocol}
				/>
			</label>
			<label class="facet-field">
				{@render t('model.provider')}
				<Select
					onchange={(v) => setProvider(v as Provider)}
					options={providerOptions}
					value={data.provider}
				/>
			</label>
			<p class="facet-hint">Child nodes fill model.allow / model.config / model.select.</p>
			<button
				class="btn btn-ghost facet-action"
				onclick={() => playground.addModelSpec()}
				type="button"
			>
				[ + Model ]
			</button>
			<label class="facet-field">
				{@render t('model.thinking')}
				<Select
					onchange={(v) => patch({ thinking: v as ThinkingLevelValue })}
					options={thinkingOptions}
					value={data.thinking}
				/>
			</label>
			<label class="facet-check text-xs">
				<Checkbox checked={data.thinkingControl} onchange={(v) => patch({ thinkingControl: v })} />
				{@render t('model.controls')}
			</label>
			<label class="facet-field">
				{@render t('model.maxSteps')}
				<input
					class="field"
					min="1"
					oninput={(e) => patch({ maxSteps: Number(e.currentTarget.value) })}
					type="number"
					value={data.maxSteps}
				>
			</label>
			<label class="facet-field">
				{@render t('model.key')}
				<Select
					onchange={(v) =>
						patch({
							key: v as ModelsData['key']
						})}
					options={keyOptions}
					value={data.key}
				/>
			</label>
		{:else if data.kind === 'modelSpec'}
			<label class="facet-field">
				<span>id (allow / config key)</span>
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => patch({ modelId: e.currentTarget.value })}
					value={data.modelId}
				>
			</label>
			<label class="facet-field">
				<span>select label</span>
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => patch({ selectLabel: e.currentTarget.value })}
					placeholder="fast"
					value={data.selectLabel}
				>
			</label>
			<label class="facet-field">
				{@render t('model.config.*.apiId', 'config.apiId')}
				{#if hubOpenRouter}
					<input class="field" readonly value={OPENROUTER_PLAYGROUND_API_ID}>
					<p class="facet-note">{OPENROUTER_PLAYGROUND_NOTE}</p>
				{:else if hubGoogle}
					<Select
						onchange={(v) => setGeminiApiId(v)}
						options={geminiModelOptions}
						value={geminiApiId}
					/>
					<p class="facet-note">
						Playground restriction: non-pro models with free-tier quota only. Builtins below are
						filtered per model.
					</p>
				{:else}
					<input
						class="field"
						autocomplete="off"
						oninput={(e) => patch({ apiId: e.currentTarget.value })}
						placeholder={apiIdPlaceholder}
						value={data.apiId}
					>
				{/if}
			</label>
			<label class="facet-field">
				{@render t('model.config.*.thinking.on', 'config.thinking.on')}
				<Select
					onchange={(v) => patch({ thinkingOn: v as ThinkingLevelValue })}
					options={thinkingOptions}
					value={data.thinkingOn}
				/>
			</label>
			<label class="facet-field">
				{@render t('model.config.*.thinking.off', 'config.thinking.off')}
				<Select
					onchange={(v) => patch({ thinkingOff: v as ThinkingLevelValue })}
					options={thinkingOptions}
					value={data.thinkingOff}
				/>
			</label>
			<fieldset class="facet-set">
				<legend>{@render t('model.config.*.thinkingLevels', 'config.thinkingLevels')}</legend>
				{#each PLAYGROUND_THINKING_LEVELS as opt (opt.value)}
					<label class="facet-check text-xs">
						<Checkbox
							checked={data.thinkingLevels.includes(opt.value)}
							onchange={(v) =>
								patch({
									thinkingLevels: toggleList(
										data.thinkingLevels,
										opt.value,
										v
									) as ThinkingLevelValue[]
								})}
						/>
						<span>{opt.label}</span>
					</label>
				{/each}
			</fieldset>
			<label class="facet-field">
				{@render t('model.config.*.summaries.on', 'config.summaries.on')}
				<Select
					onchange={(v) => patch({ summariesOn: v as 'auto' | 'none' })}
					options={summaryOptions}
					value={data.summariesOn}
				/>
			</label>
			<label class="facet-field">
				{@render t('model.config.*.summaries.off', 'config.summaries.off')}
				<Select
					onchange={(v) => patch({ summariesOff: v as 'auto' | 'none' })}
					options={summaryOptions}
					value={data.summariesOff}
				/>
			</label>
			<label class="facet-field">
				{@render t('model.config.*.maxOutputTokens', 'config.maxOutputTokens')}
				<input
					class="field"
					min="1"
					oninput={(e) => patch({ maxOutputTokens: Number(e.currentTarget.value) })}
					type="number"
					value={data.maxOutputTokens}
				>
			</label>
			<label class="facet-field">
				{@render t('model.config.*.temperature', 'config.temperature')}
				<input
					class="field"
					max="2"
					min="0"
					oninput={(e) => patch({ temperature: Number(e.currentTarget.value) })}
					step="0.1"
					type="number"
					value={data.temperature}
				>
			</label>
			{#if hubGoogle}
				<fieldset class="facet-set">
					<legend>{@render t('model.config.*.builtInTools', 'config.builtInTools')}</legend>
					{#each GOOGLE_BUILTIN_OPTIONS as opt (opt.value)}
						{const allowed = $derived(allowedGeminiBuiltins.includes(opt.value))}
						<label class="facet-check text-xs" class:facet-check-disabled={!allowed}>
							<Checkbox
								checked={geminiBuiltIns.includes(opt.value)}
								disabled={!allowed}
								onchange={(v) => toggleGeminiBuiltin(opt.value, v)}
							/>
							<span>{opt.label}{allowed ? '' : ' (unavailable on free tier)'}</span>
						</label>
					{/each}
				</fieldset>
				<p class="facet-hint">
					Provider builtins for this model — on whenever this model is selected (not turn-gated).
				</p>
			{:else}
				<label class="facet-field">
					{@render t('model.config.*.builtInTools', 'config.builtInTools')}
					<input
						class="field"
						autocomplete="off"
						oninput={(e) => patch({ builtInTools: e.currentTarget.value })}
						placeholder="googleMaps, urlContext"
						value={data.builtInTools}
					>
				</label>
			{/if}
		{:else if data.kind === 'tools'}
			<p class="facet-hint">
				Child nodes are custom function tools — each becomes <code>registerTool</code> and is listed
				in
				<code>tools.allow</code>. Provider builtins stay on each model (<code>builtInTools</code>).
				T2 promotion is turn-local: only the designated loader may return
				<code>{'{ loaded: string[] }'}</code>.
			</p>
			<label class="facet-field">
				{@render t('tools.t2Loader', 'tools.t2Loader')}
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => patch({ t2Loader: e.currentTarget.value })}
					placeholder="load_tools (optional)"
					value={data.t2Loader}
				>
			</label>
			<p class="facet-hint">
				Optional function tool id. When that tool completes with
				<code>{'{ loaded: ["…"] }'}</code>, the kernel promotes those T2 ids for the rest of the
				turn only. On <code>geminiLive</code>, declarations are fixed at session start — use T0/T1.
			</p>
			<button
				class="btn btn-ghost facet-action"
				onclick={() => playground.addToolSpec()}
				type="button"
			>
				[ + Tool ]
			</button>
		{:else if data.kind === 'toolSpec'}
			<label class="facet-field">
				{@render t('name', 'name')}
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => patch({ toolName: e.currentTarget.value })}
					placeholder="lookup_crm"
					value={data.toolName}
				>
			</label>
			<label class="facet-field">
				{@render t('type', 'type')}
				<input class="field" disabled readonly value="function">
			</label>
			<label class="facet-field">
				{@render t('description', 'description')}
				<textarea
					class="field facet-textarea"
					oninput={(e) => patch({ description: e.currentTarget.value })}
					rows="2"
					value={data.description}
				></textarea>
			</label>
			<label class="facet-field">
				{@render t('category', 'category')}
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => patch({ category: e.currentTarget.value })}
					value={data.category}
				>
			</label>
			<label class="facet-field">
				{@render t('access', 'access')}
				<Select
					onchange={(v) => patch({ access: v as ToolAccessValue })}
					options={TOOL_ACCESS_OPTIONS}
					value={data.access}
				/>
			</label>
			<label class="facet-field">
				{@render t('permission', 'permission')}
				<Select
					onchange={(v) => patch({ permission: v as ToolPermissionValue })}
					options={TOOL_PERMISSION_OPTIONS}
					value={data.permission}
				/>
			</label>
			<label class="facet-field">
				{@render t('loadTier', 'loadTier')}
				<Select
					onchange={(v) => patch({ loadTier: v as ToolLoadTier })}
					options={TOOL_LOAD_TIER_OPTIONS}
					value={data.loadTier}
				/>
			</label>
			<p class="facet-hint">
				T2 (<code>loadTier: "T2"</code>) stays off the wire until
				<code>profile.tools.t2Loader</code>
				returns <code>{'{ loaded: string[] }'}</code> — promotion lasts for that turn only.
			</p>
			<label class="facet-field">
				{@render t('paths', 'paths')}
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => patch({ paths: e.currentTarget.value })}
					placeholder="*"
					value={data.paths}
				>
			</label>
			<label class="facet-field">
				{@render t('input', 'input (JSON Schema)')}
				<textarea
					class="field facet-textarea facet-code"
					oninput={(e) => patch({ inputJson: e.currentTarget.value })}
					rows="8"
					spellcheck="false"
					value={data.inputJson}
				></textarea>
			</label>
			<label class="facet-field">
				{@render t('output', 'output (JSON Schema)')}
				<textarea
					class="field facet-textarea facet-code"
					oninput={(e) => patch({ outputJson: e.currentTarget.value })}
					rows="8"
					spellcheck="false"
					value={data.outputJson}
				></textarea>
			</label>
			<p class="facet-hint">
				Listed in <code>tools.allow</code> when compiled. Visibility follows
				<code>loadTier</code>
				(T0 / T1 / T2). Handler is a stub at runtime.
			</p>
		{:else if data.kind === 'inputs'}
			<label class="facet-check text-xs">
				<Checkbox checked={data.text} onchange={(v) => patch({ text: v })} />
				{@render t('inputs.text')}
			</label>
			<MimeAcceptGrid
				legend={attachmentsAcceptLegend}
				onSelected={(next) => patch({ attachmentsAccept: next })}
				options={ATTACHMENT_ACCEPT_OPTIONS}
				selected={data.attachmentsAccept}
			/>
			<MimeAcceptGrid
				legend={voiceAcceptLegend}
				onSelected={(next) => patch({ voiceAccept: next })}
				options={VOICE_ACCEPT_OPTIONS}
				selected={data.voiceAccept}
			/>
			<label class="facet-field">
				{@render t('inputs.maxFiles')}
				<input
					class="field"
					min="0"
					oninput={(e) => patch({ maxFiles: Number(e.currentTarget.value) })}
					type="number"
					value={data.maxFiles}
				>
			</label>
			<label class="facet-field">
				{@render t('inputs.maxBytes')}
				<input
					class="field"
					min="0"
					oninput={(e) => patch({ maxBytes: Number(e.currentTarget.value) })}
					type="number"
					value={data.maxBytes}
				>
			</label>
			<label class="facet-field">
				{@render t('inputs.maxTurnBytes')}
				<input
					class="field"
					min="0"
					oninput={(e) => patch({ maxTurnBytes: Number(e.currentTarget.value) })}
					type="number"
					value={data.maxTurnBytes}
				>
			</label>
		{:else if data.kind === 'outputs'}
			<label class="facet-field">
				<span>Primary output</span>
				<Select
					onchange={(v) => setOutputRole(v as OutputRole)}
					options={OUTPUT_ROLE_OPTIONS}
					value={outputRole}
				/>
			</label>
			<p class="facet-hint">
				Structured JSON, image, and speech are mutually exclusive wire formats. Image profiles still
				stream free text alongside generated images (outputs.structured stays null).
			</p>
			{#if outputRole === 'structured'}
				<label class="facet-field">
					<span>schema id</span>
					<input
						class="field"
						autocomplete="off"
						oninput={(e) => patch({ schemaId: e.currentTarget.value })}
						placeholder="my.app.lead.schema"
						value={data.schemaId}
					>
				</label>
				<label class="facet-field">
					<span>registerStructured.enforced</span>
					<Select
						onchange={(v) => patch({ schemaEnforced: v as 'responseFormat' | 'prompt' })}
						options={enforcedOptions}
						value={data.schemaEnforced}
					/>
				</label>
				<label class="facet-field">
					<span>registerStructured.jsonSchema (optional JSON)</span>
					<textarea
						class="field facet-area"
						oninput={(e) => patch({ schemaJson: e.currentTarget.value })}
						placeholder={'{ "type": "object", "properties": { … } }'}
						rows="4"
						value={data.schemaJson}
					></textarea>
				</label>
				<p class="facet-hint">
					Profile stores the schema id only. Body goes through registerStructured.
				</p>
			{/if}

			{#if outputRole === 'image'}
				<label class="facet-field">
					{@render t('outputs.image.aspectRatio', 'image.aspectRatio')}
					<input
						class="field"
						autocomplete="off"
						oninput={(e) => patch({ imageAspectRatio: e.currentTarget.value })}
						value={data.imageAspectRatio}
					>
				</label>
				<label class="facet-field">
					{@render t('outputs.image.size', 'image.size')}
					<input
						class="field"
						autocomplete="off"
						oninput={(e) => patch({ imageSize: e.currentTarget.value })}
						value={data.imageSize}
					>
				</label>
				<label class="facet-field">
					{@render t('outputs.image.mimeType', 'image.mimeType')}
					<input
						class="field"
						autocomplete="off"
						oninput={(e) => patch({ imageMimeType: e.currentTarget.value })}
						value={data.imageMimeType}
					>
				</label>
				<label class="facet-field">
					{@render t('outputs.image.maxInputImages', 'image.maxInputImages')}
					<input
						class="field"
						min="0"
						oninput={(e) => patch({ imageMaxInputImages: Number(e.currentTarget.value) })}
						type="number"
						value={data.imageMaxInputImages}
					>
				</label>
			{/if}

			{#if outputRole === 'speech'}
				<label class="facet-field">
					{@render t('outputs.speech.voice', 'speech.voice')}
					<input
						class="field"
						autocomplete="off"
						oninput={(e) => patch({ speechVoice: e.currentTarget.value })}
						value={data.speechVoice}
					>
				</label>
				<label class="facet-field">
					{@render t('outputs.speech.format', 'speech.format')}
					<Select
						onchange={(v) => patch({ speechFormat: v as 'pcm' | 'mp3' })}
						options={speechFormatOptions}
						value={data.speechFormat}
					/>
				</label>
			{/if}

			<label class="facet-check text-xs">
				<Checkbox
					checked={data.validationEnabled}
					onchange={(v) => patch({ validationEnabled: v })}
				/>
				{@render t('outputs.validation')}
			</label>
			{#if data.validationEnabled}
				<label class="facet-field">
					{@render t('outputs.validation.maxRetries', 'validation.maxRetries')}
					<input
						class="field"
						min="0"
						oninput={(e) => patch({ maxRetries: Number(e.currentTarget.value) })}
						type="number"
						value={data.maxRetries}
					>
				</label>
				<label class="facet-field">
					{@render t('outputs.validation.repairGuidance', 'validation.repairGuidance')}
					<textarea
						class="field facet-area"
						oninput={(e) => patch({ repairGuidance: e.currentTarget.value })}
						rows="2"
						value={data.repairGuidance}
					></textarea>
				</label>
			{/if}

			<label class="facet-field">
				{@render t('outputs.streaming.mode')}
				<Select
					onchange={(v) => patch({ streamMode: v as 'sse' | 'buffered' })}
					options={streamModeOptions}
					value={data.streamMode}
				/>
			</label>
			<label class="facet-check text-xs">
				<Checkbox checked={data.streamThoughts} onchange={(v) => patch({ streamThoughts: v })} />
				{@render t('outputs.streaming.streamThoughts', 'streaming.streamThoughts')}
			</label>
			<label class="facet-check text-xs">
				<Checkbox checked={data.gateMedia} onchange={(v) => patch({ gateMedia: v })} />
				{@render t('outputs.streaming.gateMedia', 'streaming.gateMedia')}
			</label>

			<label class="facet-check text-xs">
				<Checkbox checked={data.resumeEnabled} onchange={(v) => patch({ resumeEnabled: v })} />
				{@render t('outputs.resume')}
			</label>
			{#if data.resumeEnabled}
				<fieldset class="facet-set">
					<legend>{@render t('outputs.resume.allowContinue', 'resume.allowContinue')}</legend>
					{#each PLAYGROUND_TURN_STOP_KINDS as opt (opt.value)}
						<label class="facet-check text-xs">
							<Checkbox
								checked={data.allowContinue.includes(opt.value)}
								onchange={(v) =>
									patch({
										allowContinue: toggleList(
											data.allowContinue,
											opt.value,
											v
										)
									})}
							/>
							<span>{opt.label}</span>
						</label>
					{/each}
				</fieldset>
				<fieldset class="facet-set">
					<legend>{@render t('outputs.resume.autoContinue', 'resume.autoContinue')}</legend>
					{#each PLAYGROUND_TURN_STOP_KINDS as opt (opt.value)}
						<label class="facet-check text-xs">
							<Checkbox
								checked={data.autoContinue.includes(opt.value)}
								onchange={(v) =>
									patch({
										autoContinue: toggleList(
											data.autoContinue,
											opt.value,
											v
										)
									})}
							/>
							<span>{opt.label}</span>
						</label>
					{/each}
				</fieldset>
			{/if}
		{:else if data.kind === 'guardrails'}
			<label class="facet-check text-xs">
				<Checkbox checked={data.canary} onchange={(v) => patch({ canary: v })} />
				{@render t('guardrails.canary')}
			</label>
			<label class="facet-check text-xs">
				<Checkbox checked={data.sanitizeInput} onchange={(v) => patch({ sanitizeInput: v })} />
				{@render t('guardrails.sanitizeInput')}
			</label>
			<label class="facet-check text-xs">
				<Checkbox checked={data.redactSensitive} onchange={(v) => patch({ redactSensitive: v })} />
				{@render t('guardrails.redactSensitive')}
			</label>
			<label class="facet-check text-xs">
				<Checkbox checked={data.quotaEnabled} onchange={(v) => patch({ quotaEnabled: v })} />
				{@render t('guardrails.quota', 'guardrails.quota (optional)')}
			</label>
			{#if data.quotaEnabled}
				<label class="facet-field">
					{@render t('guardrails.quota.perDay', 'quota.perDay')}
					<input
						class="field"
						min="1"
						oninput={(e) => patch({ perDay: Number(e.currentTarget.value) })}
						type="number"
						value={data.perDay}
					>
				</label>
			{/if}
			<label class="facet-field">
				{@render t('guardrails.egress')}
				<Select
					onchange={(v) => patch({ egressMode: v as 'default' | 'none' })}
					options={egressModeOptions}
					value={data.egressMode}
				/>
			</label>
			{#if data.egressMode === 'default'}
				<label class="facet-field">
					{@render t('guardrails.egress.onBlock', 'egress.onBlock')}
					<Select
						onchange={(v) => patch({ onBlock: v as 'reject_to_agent' | 'refuse_to_user' })}
						options={onBlockOptions}
						value={data.onBlock}
					/>
				</label>
				<label class="facet-field">
					{@render t('guardrails.egress.maxRetries', 'egress.maxRetries')}
					<input
						class="field"
						min="0"
						oninput={(e) => patch({ egressMaxRetries: Number(e.currentTarget.value) })}
						type="number"
						value={data.egressMaxRetries}
					>
				</label>
				<p class="facet-hint">
					Uses kernel <code>standardEgressEnforce</code> — canary leak, sensitive spans, injection
					echo, and system-boundary checks. Wire your own <code>enforce</code> in exported code if
					you need host-specific policy.
				</p>
			{/if}
		{/if}
	</TypeTip>
</div>

<style>
.facet-editor {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
	min-height: 0;
	flex: 1 1 auto;
	overflow-x: hidden;
	overflow-y: auto;
	font-family: var(--font-mono);
	color: var(--color-ink);
}

.facet-editor :global(.field:focus) {
	background: transparent;
	color: inherit;
}

.facet-editor :global(.select-trigger:focus),
.facet-editor :global(.select-trigger:focus-visible) {
	background: transparent;
	color: inherit;
}

.facet-editor :global(.btn-ghost:hover) {
	background: rgba(0, 0, 0, 0.05);
	color: var(--color-ink);
}

.facet-field-label,
.facet-field span {
	font-size: 0.68rem;
	font-weight: 800;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--color-mute);
}

.facet-check :global(.type-label) {
	display: inline;
	width: auto;
	font-weight: 700;
	letter-spacing: normal;
	text-transform: none;
	color: inherit;
	cursor: help;
}

.facet-field {
	display: flex;
	flex-direction: column;
	gap: 0.55rem;
	margin-bottom: 0.15rem;
}

.facet-area {
	resize: vertical;
	min-height: 4rem;
}

.facet-check {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 0.35rem;
	font-weight: 700;
}

.facet-set .facet-check {
	margin-bottom: 0;
}

.facet-set {
	margin: 0 0 0.5rem;
	padding: 0.85rem 0 0.65rem;
	border: 0;
	border-top: 1px solid var(--color-ink);
	display: flex;
	flex-direction: column;
	gap: 0.7rem;
}

.facet-set legend {
	padding: 0;
}

.facet-hint {
	margin: 0.15rem 0 0.35rem;
	font-size: 0.72rem;
	line-height: 1.55;
	color: var(--color-mute);
	font-weight: 600;
}

.facet-note {
	margin: 0.25rem 0 0.35rem;
	font-size: 0.68rem;
	line-height: 1.55;
	color: var(--color-mute);
	font-weight: 600;
}

.facet-check-disabled {
	opacity: 0.45;
}

.facet-action {
	align-self: flex-start;
	padding: 0.35rem 0.55rem;
	font-size: 0.72rem;
}

.facet-textarea {
	resize: vertical;
	min-height: 3.5rem;
	line-height: 1.35;
}

.facet-code {
	font-size: 0.72rem;
	white-space: pre;
}
</style>
