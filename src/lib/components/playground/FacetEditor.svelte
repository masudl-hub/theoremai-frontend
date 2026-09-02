<script lang="ts">
import { getContext } from 'svelte';
import Select from '$lib/components/Select.svelte';
import TypeTip from '$lib/components/TypeTip.svelte';
import {
	coerceProtocol,
	coerceProvider,
	GEMINI_KEY_OPTIONS,
	ON_BLOCK_OPTIONS,
	PROTOCOLS,
	PROVIDERS,
	type Protocol,
	type Provider,
	providersFor,
	SCHEMA_ENFORCEMENT_OPTIONS,
	SPEECH_FORMAT_OPTIONS,
	STREAM_MODE_OPTIONS,
	SUMMARY_MODE_OPTIONS,
	THINKING_LEVELS,
	type ThinkingLevelValue,
	TURN_STOP_KINDS,
	toggleList,
} from '$lib/playground/compat';
import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
import { defaultApiIdPlaceholder } from '$lib/playground/free-tier';
import { ATTACHMENT_ACCEPT_OPTIONS, toggleMime, VOICE_ACCEPT_OPTIONS } from '$lib/playground/mime';
import {
	allowedBuiltinsForGemini,
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
	OutputsData,
	PlaygroundNode,
} from '$lib/playground/types';

let { id, data }: { id: string; data: PlaygroundNode['data'] } = $props();

const playground = getContext<PlaygroundCtx>(PLAYGROUND_CTX);

const modelsHub = $derived(playground.hub);

const providerOptions = $derived.by(() => {
	if (data.kind !== 'models') return PROVIDERS;
	const allowed = new Set(providersFor(data.protocol as Protocol));
	return PROVIDERS.filter((p) => allowed.has(p.value));
});

const protocolOptions = PROTOCOLS;

const speechFormatOptions = $derived.by(() => {
	const protocol = modelsHub.protocol ?? 'openAi';
	if (protocol === 'geminiInteractions') {
		return SPEECH_FORMAT_OPTIONS.filter((opt) => opt.value === 'pcm');
	}
	return SPEECH_FORMAT_OPTIONS;
});

const thinkingOptions = THINKING_LEVELS;
const keyOptions = GEMINI_KEY_OPTIONS;
const outputModeOptions = [
	{ value: 'text', label: 'null (free text)' },
	{ value: 'structured', label: 'schema id' },
];
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

function setProtocol(next: Protocol) {
	if (data.kind !== 'models') return;
	const provider = coerceProvider(next, data.provider as Provider);
	patch({ protocol: next, provider });
	syncHubModelSpecs(next, provider);
	if (next === 'geminiInteractions') {
		for (const n of playground.getNodes() ?? []) {
			if (n.data.kind !== 'outputs') continue;
			const out = n.data as OutputsData;
			if (out.speechFormat === 'mp3') {
				playground.patchNode(n.id, { speechFormat: 'pcm' });
			}
		}
	}
}

function setProvider(next: Provider) {
	if (data.kind !== 'models') return;
	const protocol = coerceProtocol(data.protocol as Protocol, next);
	patch({ protocol, provider: next });
	syncHubModelSpecs(protocol, next);
	if (protocol === 'geminiInteractions') {
		for (const n of playground.getNodes() ?? []) {
			if (n.data.kind !== 'outputs') continue;
			const out = n.data as OutputsData;
			if (out.speechFormat === 'mp3') {
				playground.patchNode(n.id, { speechFormat: 'pcm' });
			}
		}
	}
}
</script>

<div class="facet-editor">
	{#snippet t(path: string, text: string = path)}
		<button class="type-label" data-type-path={path} type="button">{text}</button>
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
			<label class="facet-check">
				<input
					checked={data.chat}
					onchange={(e) => patch({ chat: e.currentTarget.checked })}
					type="checkbox"
				>
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
			<label class="facet-check">
				<input
					checked={data.thinkingControl}
					onchange={(e) => patch({ thinkingControl: e.currentTarget.checked })}
					type="checkbox"
				>
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
				{#each THINKING_LEVELS as opt (opt.value)}
					<label class="facet-check">
						<input
							checked={data.thinkingLevels.includes(opt.value)}
							onchange={(e) =>
								patch({
									thinkingLevels: toggleList(
										data.thinkingLevels,
										opt.value,
										e.currentTarget.checked
									) as ThinkingLevelValue[]
								})}
							type="checkbox"
						>
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
						<label class="facet-check" class:facet-check-disabled={!allowed}>
							<input
								checked={geminiBuiltIns.includes(opt.value)}
								disabled={!allowed}
								onchange={(e) => toggleGeminiBuiltin(opt.value, e.currentTarget.checked)}
								type="checkbox"
							>
							<span>{opt.label}{allowed ? '' : ' (unavailable on free tier)'}</span>
						</label>
					{/each}
				</fieldset>
				<p class="facet-hint">
					Provider builtins for this model. Turn gate:
					<code>tools: &#123; googleSearch: true &#125;</code>.
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
			<label class="facet-field">
				{@render t('tools.allow')}
				<input
					class="field"
					autocomplete="off"
					oninput={(e) => patch({ allow: e.currentTarget.value })}
					placeholder="tool_a, tool_b"
					value={data.allow}
				>
			</label>
			<p class="facet-hint">
				Custom function and loader tools only — register with <code>registerTool</code> at startup.
				Provider builtins belong on each model spec (<code>builtInTools</code>). Turn
				<code>tools: &#123; id: true &#125;</code>
				gates what is on; anything outside the ceiling is rejected.
			</p>
		{:else if data.kind === 'inputs'}
			<label class="facet-check">
				<input
					checked={data.text}
					onchange={(e) => patch({ text: e.currentTarget.checked })}
					type="checkbox"
				>
				{@render t('inputs.text')}
			</label>
			<fieldset class="facet-set">
				<legend>{@render t('inputs.attachments.accept')}</legend>
				{#each ATTACHMENT_ACCEPT_OPTIONS as opt (opt.value)}
					<label class="facet-check">
						<input
							checked={data.attachmentsAccept.includes(opt.value)}
							onchange={(e) =>
								patch({
									attachmentsAccept: toggleMime(
										data.attachmentsAccept,
										opt.value,
										e.currentTarget.checked
									)
								})}
							type="checkbox"
						>
						<span>{opt.label}</span>
					</label>
				{/each}
			</fieldset>
			<fieldset class="facet-set">
				<legend>{@render t('inputs.voice.accept')}</legend>
				{#each VOICE_ACCEPT_OPTIONS as opt (opt.value)}
					<label class="facet-check">
						<input
							checked={data.voiceAccept.includes(opt.value)}
							onchange={(e) =>
								patch({
									voiceAccept: toggleMime(
										data.voiceAccept,
										opt.value,
										e.currentTarget.checked
									)
								})}
							type="checkbox"
						>
						<span>{opt.label}</span>
					</label>
				{/each}
			</fieldset>
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
				{@render t('outputs.structured')}
				<Select
					onchange={(v) => patch({ mode: v as 'text' | 'structured' })}
					options={outputModeOptions}
					value={data.mode}
				/>
			</label>
			{#if data.mode === 'structured'}
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

			<label class="facet-check">
				<input
					checked={data.imageEnabled}
					onchange={(e) => patch({ imageEnabled: e.currentTarget.checked })}
					type="checkbox"
				>
				{@render t('outputs.image')}
			</label>
			{#if data.imageEnabled}
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
				<label class="facet-check">
					<input
						checked={data.imageAllowsGrounding}
						onchange={(e) => patch({ imageAllowsGrounding: e.currentTarget.checked })}
						type="checkbox"
					>
					{@render t('outputs.image.allowsGrounding', 'image.allowsGrounding')}
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

			<label class="facet-check">
				<input
					checked={data.speechEnabled}
					onchange={(e) => patch({ speechEnabled: e.currentTarget.checked })}
					type="checkbox"
				>
				{@render t('outputs.speech')}
			</label>
			{#if data.speechEnabled}
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

			<label class="facet-check">
				<input
					checked={data.validationEnabled}
					onchange={(e) => patch({ validationEnabled: e.currentTarget.checked })}
					type="checkbox"
				>
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
			<label class="facet-check">
				<input
					checked={data.streamThoughts}
					onchange={(e) => patch({ streamThoughts: e.currentTarget.checked })}
					type="checkbox"
				>
				{@render t('outputs.streaming.streamThoughts', 'streaming.streamThoughts')}
			</label>
			<label class="facet-check">
				<input
					checked={data.gateMedia}
					onchange={(e) => patch({ gateMedia: e.currentTarget.checked })}
					type="checkbox"
				>
				{@render t('outputs.streaming.gateMedia', 'streaming.gateMedia')}
			</label>

			<label class="facet-check">
				<input
					checked={data.resumeEnabled}
					onchange={(e) => patch({ resumeEnabled: e.currentTarget.checked })}
					type="checkbox"
				>
				{@render t('outputs.resume')}
			</label>
			{#if data.resumeEnabled}
				<fieldset class="facet-set">
					<legend>{@render t('outputs.resume.allowContinue', 'resume.allowContinue')}</legend>
					{#each TURN_STOP_KINDS as opt (opt.value)}
						<label class="facet-check">
							<input
								checked={data.allowContinue.includes(opt.value)}
								onchange={(e) =>
									patch({
										allowContinue: toggleList(
											data.allowContinue,
											opt.value,
											e.currentTarget.checked
										)
									})}
								type="checkbox"
							>
							<span>{opt.label}</span>
						</label>
					{/each}
				</fieldset>
				<fieldset class="facet-set">
					<legend>{@render t('outputs.resume.autoContinue', 'resume.autoContinue')}</legend>
					{#each TURN_STOP_KINDS as opt (opt.value)}
						<label class="facet-check">
							<input
								checked={data.autoContinue.includes(opt.value)}
								onchange={(e) =>
									patch({
										autoContinue: toggleList(
											data.autoContinue,
											opt.value,
											e.currentTarget.checked
										)
									})}
								type="checkbox"
							>
							<span>{opt.label}</span>
						</label>
					{/each}
				</fieldset>
			{/if}
		{:else if data.kind === 'guardrails'}
			<label class="facet-check">
				<input
					checked={data.canary}
					onchange={(e) => patch({ canary: e.currentTarget.checked })}
					type="checkbox"
				>
				{@render t('guardrails.canary')}
			</label>
			<label class="facet-check">
				<input
					checked={data.sanitizeInput}
					onchange={(e) => patch({ sanitizeInput: e.currentTarget.checked })}
					type="checkbox"
				>
				{@render t('guardrails.sanitizeInput')}
			</label>
			<label class="facet-check">
				<input
					checked={data.redactSensitive}
					onchange={(e) => patch({ redactSensitive: e.currentTarget.checked })}
					type="checkbox"
				>
				{@render t('guardrails.redactSensitive')}
			</label>
			<label class="facet-check">
				<input
					checked={data.quotaEnabled}
					onchange={(e) => patch({ quotaEnabled: e.currentTarget.checked })}
					type="checkbox"
				>
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
	gap: 0.55rem;
	min-height: 0;
	flex: 1 1 auto;
	overflow-x: hidden;
	overflow-y: auto;
	font-family: var(--font-mono);
	color: #000;
}

.facet-editor :global(.field:focus) {
	background: transparent;
	color: inherit;
	outline: 1.5px solid #000;
	outline-offset: 0;
}

.facet-editor :global(.select-trigger:focus),
.facet-editor :global(.select-trigger:focus-visible) {
	background: transparent;
	color: inherit;
}

.facet-editor :global(.btn-ghost:hover) {
	background: rgba(0, 0, 0, 0.05);
	color: #000;
}

.facet-field {
	display: flex;
	flex-direction: column;
	gap: 0.2rem;
}

.facet-field span,
.facet-field :global(.type-label) {
	font-size: 0.68rem;
	font-weight: 800;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--color-mute);
}

.facet-check :global(.type-label) {
	display: inline;
	width: auto;
	font-size: 0.78rem;
	font-weight: 700;
	letter-spacing: normal;
	text-transform: none;
	color: inherit;
	cursor: help;
}

.facet-set legend :global(.type-label) {
	font-size: 0.68rem;
	font-weight: 800;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--color-mute);
}

.facet-area {
	resize: vertical;
	min-height: 4rem;
}

.facet-check {
	display: flex;
	align-items: center;
	gap: 0.45rem;
	font-size: 0.78rem;
	font-weight: 700;
}

.facet-set {
	margin: 0;
	padding: 0.5rem 0 0;
	border: 0;
	border-top: 1px solid #000;
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}

.facet-set legend {
	padding: 0;
	font-size: 0.68rem;
	font-weight: 800;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--color-mute);
}

.facet-hint {
	margin: 0;
	font-size: 0.72rem;
	line-height: 1.35;
	color: var(--color-mute);
	font-weight: 600;
}

.facet-note {
	margin: 0.35rem 0 0;
	font-size: 0.68rem;
	line-height: 1.4;
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
</style>
