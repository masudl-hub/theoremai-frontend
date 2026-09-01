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
		providersFor,
		PROVIDERS,
		SCHEMA_ENFORCEMENT_OPTIONS,
		SPEECH_FORMAT_OPTIONS,
		STREAM_MODE_OPTIONS,
		SUMMARY_MODE_OPTIONS,
		THINKING_LEVELS,
		toggleList,
		TURN_STOP_KINDS,
		type Protocol,
		type Provider,
		type ThinkingLevelValue
	} from '$lib/playground/compat';
	import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
	import {
		ATTACHMENT_ACCEPT_OPTIONS,
		toggleMime,
		VOICE_ACCEPT_OPTIONS
	} from '$lib/playground/mime';
	import {
		type FacetData,
		type ModelsData,
		type OutputsData,
		type PlaygroundNode
	} from '$lib/playground/types';

	let { id, data }: { id: string; data: PlaygroundNode['data'] } = $props();

	const playground = getContext<PlaygroundCtx>(PLAYGROUND_CTX);

	const modelsHub = $derived(playground?.hub);

	const providerOptions = $derived.by(() => {
		if (data.kind !== 'models') return PROVIDERS;
		const allowed = new Set(providersFor(data.protocol as Protocol));
		return PROVIDERS.filter((p) => allowed.has(p.value));
	});

	const protocolOptions = PROTOCOLS;

	const speechFormatOptions = $derived.by(() => {
		const protocol = modelsHub?.protocol ?? 'openAi';
		if (protocol === 'geminiInteractions') {
			return SPEECH_FORMAT_OPTIONS.filter((opt) => opt.value === 'pcm');
		}
		return SPEECH_FORMAT_OPTIONS;
	});

	const thinkingOptions = THINKING_LEVELS;
	const keyOptions = GEMINI_KEY_OPTIONS;
	const outputModeOptions = [
		{ value: 'text', label: 'null (free text)' },
		{ value: 'structured', label: 'schema id' }
	];
	const streamModeOptions = STREAM_MODE_OPTIONS;
	const enforcedOptions = SCHEMA_ENFORCEMENT_OPTIONS;
	const summaryOptions = SUMMARY_MODE_OPTIONS;
	const egressModeOptions = [
		{ value: 'default', label: 'default (omit — no host enforce)' },
		{ value: 'none', label: 'none (omit explicitly)' },
		{ value: 'custom', label: 'custom (import host enforce)' }
	];
	const onBlockOptions = ON_BLOCK_OPTIONS;

	function patch(partial: Partial<FacetData>) {
		playground?.patchNode(id, partial as Partial<PlaygroundNode['data']>);
	}

	function setProtocol(next: Protocol) {
		if (data.kind !== 'models') return;
		const provider = coerceProvider(next, data.provider as Provider);
		patch({ protocol: next, provider });
		if (next === 'geminiInteractions') {
			for (const n of playground?.getNodes() ?? []) {
				if (n.data.kind !== 'outputs') continue;
				const out = n.data as OutputsData;
				if (out.speechFormat === 'mp3') {
					playground?.patchNode(n.id, { speechFormat: 'pcm' });
				}
			}
		}
	}

	function setProvider(next: Provider) {
		if (data.kind !== 'models') return;
		const protocol = coerceProtocol(data.protocol as Protocol, next);
		patch({ protocol, provider: next });
		if (protocol === 'geminiInteractions') {
			for (const n of playground?.getNodes() ?? []) {
				if (n.data.kind !== 'outputs') continue;
				const out = n.data as OutputsData;
				if (out.speechFormat === 'mp3') {
					playground?.patchNode(n.id, { speechFormat: 'pcm' });
				}
			}
		}
	}
</script>

<div class="facet-editor">
	{#snippet t(path: string, text: string = path)}
		<button type="button" class="type-label" data-type-path={path}>{text}</button>
	{/snippet}
	<TypeTip variant="label">
		{#if data.kind === 'identity'}
			<label class="facet-field">
				{@render t('id')}
				<input
					class="field"
					value={data.agentId}
					oninput={(e) => patch({ agentId: e.currentTarget.value })}
					autocomplete="off"
				/>
			</label>
			<label class="facet-field">
				{@render t('identity.handle')}
				<input
					class="field"
					value={data.handle}
					oninput={(e) => patch({ handle: e.currentTarget.value })}
					autocomplete="off"
				/>
			</label>
			<label class="facet-field">
				{@render t('identity.system')}
				<textarea
					class="field facet-area"
					rows="4"
					value={data.system}
					oninput={(e) => patch({ system: e.currentTarget.value })}
				></textarea>
			</label>
			<p class="facet-hint">
				Optional here — or load the same string from another file when you wire the profile.
			</p>
			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.chat}
					onchange={(e) => patch({ chat: e.currentTarget.checked })}
				/>
				{@render t('identity.chat')}
			</label>
		{:else if data.kind === 'models'}
			<label class="facet-field">
				{@render t('model.protocol')}
				<Select
					value={data.protocol}
					options={protocolOptions}
					onchange={(v) => setProtocol(v as Protocol)}
				/>
			</label>
			<label class="facet-field">
				{@render t('model.provider')}
				<Select
					value={data.provider}
					options={providerOptions}
					onchange={(v) => setProvider(v as Provider)}
				/>
			</label>
			<p class="facet-hint">Child nodes fill model.allow / model.config / model.select.</p>
			<button type="button" class="btn btn-ghost facet-action" onclick={() => playground?.addModelSpec()}>
				[ + Model ]
			</button>
			<label class="facet-field">
				{@render t('model.thinking')}
				<Select
					value={data.thinking}
					options={thinkingOptions}
					onchange={(v) => patch({ thinking: v as ThinkingLevelValue })}
				/>
			</label>
			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.thinkingControl}
					onchange={(e) => patch({ thinkingControl: e.currentTarget.checked })}
				/>
				{@render t('model.controls')}
			</label>
			<label class="facet-field">
				{@render t('model.maxSteps')}
				<input
					class="field"
					type="number"
					min="1"
					value={data.maxSteps}
					oninput={(e) => patch({ maxSteps: Number(e.currentTarget.value) })}
				/>
			</label>
			<label class="facet-field">
				{@render t('model.key')}
				<Select
					value={data.key}
					options={keyOptions}
					onchange={(v) =>
						patch({
							key: v as ModelsData['key']
						})}
				/>
			</label>
		{:else if data.kind === 'modelSpec'}
			<label class="facet-field">
				<span>id (allow / config key)</span>
				<input
					class="field"
					value={data.modelId}
					oninput={(e) => patch({ modelId: e.currentTarget.value })}
					autocomplete="off"
				/>
			</label>
			<label class="facet-field">
				<span>select label</span>
				<input
					class="field"
					value={data.selectLabel}
					oninput={(e) => patch({ selectLabel: e.currentTarget.value })}
					placeholder="fast"
					autocomplete="off"
				/>
			</label>
			<label class="facet-field">
				{@render t('model.config.*.apiId', 'config.apiId')}
				<input
					class="field"
					value={data.apiId}
					oninput={(e) => patch({ apiId: e.currentTarget.value })}
					autocomplete="off"
				/>
			</label>
			<label class="facet-field">
				{@render t('model.config.*.thinking.on', 'config.thinking.on')}
				<Select
					value={data.thinkingOn}
					options={thinkingOptions}
					onchange={(v) => patch({ thinkingOn: v as ThinkingLevelValue })}
				/>
			</label>
			<label class="facet-field">
				{@render t('model.config.*.thinking.off', 'config.thinking.off')}
				<Select
					value={data.thinkingOff}
					options={thinkingOptions}
					onchange={(v) => patch({ thinkingOff: v as ThinkingLevelValue })}
				/>
			</label>
			<fieldset class="facet-set">
				<legend>{@render t('model.config.*.thinkingLevels', 'config.thinkingLevels')}</legend>
				{#each THINKING_LEVELS as opt (opt.value)}
					<label class="facet-check">
						<input
							type="checkbox"
							checked={data.thinkingLevels.includes(opt.value)}
							onchange={(e) =>
								patch({
									thinkingLevels: toggleList(
										data.thinkingLevels,
										opt.value,
										e.currentTarget.checked
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
					value={data.summariesOn}
					options={summaryOptions}
					onchange={(v) => patch({ summariesOn: v as 'auto' | 'none' })}
				/>
			</label>
			<label class="facet-field">
				{@render t('model.config.*.summaries.off', 'config.summaries.off')}
				<Select
					value={data.summariesOff}
					options={summaryOptions}
					onchange={(v) => patch({ summariesOff: v as 'auto' | 'none' })}
				/>
			</label>
			<label class="facet-field">
				{@render t('model.config.*.maxOutputTokens', 'config.maxOutputTokens')}
				<input
					class="field"
					type="number"
					min="1"
					value={data.maxOutputTokens}
					oninput={(e) => patch({ maxOutputTokens: Number(e.currentTarget.value) })}
				/>
			</label>
			<label class="facet-field">
				{@render t('model.config.*.temperature', 'config.temperature')}
				<input
					class="field"
					type="number"
					min="0"
					max="2"
					step="0.1"
					value={data.temperature}
					oninput={(e) => patch({ temperature: Number(e.currentTarget.value) })}
				/>
			</label>
			<label class="facet-field">
				{@render t('model.config.*.keyBuiltins', 'config.keyBuiltins')}
				<input
					class="field"
					value={data.keyBuiltins}
					oninput={(e) => patch({ keyBuiltins: e.currentTarget.value })}
					placeholder="googleMaps, urlContext"
					autocomplete="off"
				/>
			</label>
		{:else if data.kind === 'tools'}
			<label class="facet-field">
				{@render t('tools.allow')}
				<input
					class="field"
					value={data.allow}
					oninput={(e) => patch({ allow: e.currentTarget.value })}
					placeholder="tool_a, tool_b"
					autocomplete="off"
				/>
			</label>
			<p class="facet-hint">Hard ceiling — turn request cannot enable tools outside this list.</p>
		{:else if data.kind === 'inputs'}
			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.text}
					onchange={(e) => patch({ text: e.currentTarget.checked })}
				/>
				{@render t('inputs.text')}
			</label>
			<fieldset class="facet-set">
				<legend>{@render t('inputs.attachments.accept')}</legend>
				{#each ATTACHMENT_ACCEPT_OPTIONS as opt (opt.value)}
					<label class="facet-check">
						<input
							type="checkbox"
							checked={data.attachmentsAccept.includes(opt.value)}
							onchange={(e) =>
								patch({
									attachmentsAccept: toggleMime(
										data.attachmentsAccept,
										opt.value,
										e.currentTarget.checked
									)
								})}
						/>
						<span>{opt.label}</span>
					</label>
				{/each}
			</fieldset>
			<fieldset class="facet-set">
				<legend>{@render t('inputs.voice.accept')}</legend>
				{#each VOICE_ACCEPT_OPTIONS as opt (opt.value)}
					<label class="facet-check">
						<input
							type="checkbox"
							checked={data.voiceAccept.includes(opt.value)}
							onchange={(e) =>
								patch({
									voiceAccept: toggleMime(
										data.voiceAccept,
										opt.value,
										e.currentTarget.checked
									)
								})}
						/>
						<span>{opt.label}</span>
					</label>
				{/each}
			</fieldset>
			<label class="facet-field">
				{@render t('inputs.maxFiles')}
				<input
					class="field"
					type="number"
					min="0"
					value={data.maxFiles}
					oninput={(e) => patch({ maxFiles: Number(e.currentTarget.value) })}
				/>
			</label>
			<label class="facet-field">
				{@render t('inputs.maxBytes')}
				<input
					class="field"
					type="number"
					min="0"
					value={data.maxBytes}
					oninput={(e) => patch({ maxBytes: Number(e.currentTarget.value) })}
				/>
			</label>
			<label class="facet-field">
				{@render t('inputs.maxTurnBytes')}
				<input
					class="field"
					type="number"
					min="0"
					value={data.maxTurnBytes}
					oninput={(e) => patch({ maxTurnBytes: Number(e.currentTarget.value) })}
				/>
			</label>
		{:else if data.kind === 'outputs'}
			<label class="facet-field">
				{@render t('outputs.structured')}
				<Select
					value={data.mode}
					options={outputModeOptions}
					onchange={(v) => patch({ mode: v as 'text' | 'structured' })}
				/>
			</label>
			{#if data.mode === 'structured'}
				<label class="facet-field">
					<span>schema id</span>
					<input
						class="field"
						value={data.schemaId}
						oninput={(e) => patch({ schemaId: e.currentTarget.value })}
						placeholder="my.app.lead.schema"
						autocomplete="off"
					/>
				</label>
				<label class="facet-field">
					<span>registerStructured.enforced</span>
					<Select
						value={data.schemaEnforced}
						options={enforcedOptions}
						onchange={(v) => patch({ schemaEnforced: v as 'responseFormat' | 'prompt' })}
					/>
				</label>
				<label class="facet-field">
					<span>registerStructured.jsonSchema (optional JSON)</span>
					<textarea
						class="field facet-area"
						rows="4"
						value={data.schemaJson}
						oninput={(e) => patch({ schemaJson: e.currentTarget.value })}
						placeholder={'{ "type": "object", "properties": { … } }'}
					></textarea>
				</label>
				<p class="facet-hint">
					Profile stores the schema id only. Body goes through registerStructured.
				</p>
			{/if}

			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.imageEnabled}
					onchange={(e) => patch({ imageEnabled: e.currentTarget.checked })}
				/>
				{@render t('outputs.image')}
			</label>
			{#if data.imageEnabled}
				<label class="facet-field">
					{@render t('outputs.image.aspectRatio', 'image.aspectRatio')}
					<input
						class="field"
						value={data.imageAspectRatio}
						oninput={(e) => patch({ imageAspectRatio: e.currentTarget.value })}
						autocomplete="off"
					/>
				</label>
				<label class="facet-field">
					{@render t('outputs.image.size', 'image.size')}
					<input
						class="field"
						value={data.imageSize}
						oninput={(e) => patch({ imageSize: e.currentTarget.value })}
						autocomplete="off"
					/>
				</label>
				<label class="facet-field">
					{@render t('outputs.image.mimeType', 'image.mimeType')}
					<input
						class="field"
						value={data.imageMimeType}
						oninput={(e) => patch({ imageMimeType: e.currentTarget.value })}
						autocomplete="off"
					/>
				</label>
				<label class="facet-check">
					<input
						type="checkbox"
						checked={data.imageAllowsGrounding}
						onchange={(e) => patch({ imageAllowsGrounding: e.currentTarget.checked })}
					/>
					{@render t('outputs.image.allowsGrounding', 'image.allowsGrounding')}
				</label>
				<label class="facet-field">
					{@render t('outputs.image.maxInputImages', 'image.maxInputImages')}
					<input
						class="field"
						type="number"
						min="0"
						value={data.imageMaxInputImages}
						oninput={(e) => patch({ imageMaxInputImages: Number(e.currentTarget.value) })}
					/>
				</label>
			{/if}

			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.speechEnabled}
					onchange={(e) => patch({ speechEnabled: e.currentTarget.checked })}
				/>
				{@render t('outputs.speech')}
			</label>
			{#if data.speechEnabled}
				<label class="facet-field">
					{@render t('outputs.speech.voice', 'speech.voice')}
					<input
						class="field"
						value={data.speechVoice}
						oninput={(e) => patch({ speechVoice: e.currentTarget.value })}
						autocomplete="off"
					/>
				</label>
				<label class="facet-field">
					{@render t('outputs.speech.format', 'speech.format')}
					<Select
						value={data.speechFormat}
						options={speechFormatOptions}
						onchange={(v) => patch({ speechFormat: v as 'pcm' | 'mp3' })}
					/>
				</label>
			{/if}

			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.validationEnabled}
					onchange={(e) => patch({ validationEnabled: e.currentTarget.checked })}
				/>
				{@render t('outputs.validation')}
			</label>
			{#if data.validationEnabled}
				<label class="facet-field">
					{@render t('outputs.validation.maxRetries', 'validation.maxRetries')}
					<input
						class="field"
						type="number"
						min="0"
						value={data.maxRetries}
						oninput={(e) => patch({ maxRetries: Number(e.currentTarget.value) })}
					/>
				</label>
				<label class="facet-field">
					{@render t('outputs.validation.repairGuidance', 'validation.repairGuidance')}
					<textarea
						class="field facet-area"
						rows="2"
						value={data.repairGuidance}
						oninput={(e) => patch({ repairGuidance: e.currentTarget.value })}
					></textarea>
				</label>
			{/if}

			<label class="facet-field">
				{@render t('outputs.streaming.mode')}
				<Select
					value={data.streamMode}
					options={streamModeOptions}
					onchange={(v) => patch({ streamMode: v as 'sse' | 'buffered' })}
				/>
			</label>
			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.streamThoughts}
					onchange={(e) => patch({ streamThoughts: e.currentTarget.checked })}
				/>
				{@render t('outputs.streaming.streamThoughts', 'streaming.streamThoughts')}
			</label>
			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.gateMedia}
					onchange={(e) => patch({ gateMedia: e.currentTarget.checked })}
				/>
				{@render t('outputs.streaming.gateMedia', 'streaming.gateMedia')}
			</label>

			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.resumeEnabled}
					onchange={(e) => patch({ resumeEnabled: e.currentTarget.checked })}
				/>
				{@render t('outputs.resume')}
			</label>
			{#if data.resumeEnabled}
				<fieldset class="facet-set">
					<legend>{@render t('outputs.resume.allowContinue', 'resume.allowContinue')}</legend>
					{#each TURN_STOP_KINDS as opt (opt.value)}
						<label class="facet-check">
							<input
								type="checkbox"
								checked={data.allowContinue.includes(opt.value)}
								onchange={(e) =>
									patch({
										allowContinue: toggleList(
											data.allowContinue,
											opt.value,
											e.currentTarget.checked
										)
									})}
							/>
							<span>{opt.label}</span>
						</label>
					{/each}
				</fieldset>
				<fieldset class="facet-set">
					<legend>{@render t('outputs.resume.autoContinue', 'resume.autoContinue')}</legend>
					{#each TURN_STOP_KINDS as opt (opt.value)}
						<label class="facet-check">
							<input
								type="checkbox"
								checked={data.autoContinue.includes(opt.value)}
								onchange={(e) =>
									patch({
										autoContinue: toggleList(
											data.autoContinue,
											opt.value,
											e.currentTarget.checked
										)
									})}
							/>
							<span>{opt.label}</span>
						</label>
					{/each}
				</fieldset>
			{/if}
		{:else if data.kind === 'guardrails'}
			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.canary}
					onchange={(e) => patch({ canary: e.currentTarget.checked })}
				/>
				{@render t('guardrails.canary')}
			</label>
			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.sanitizeInput}
					onchange={(e) => patch({ sanitizeInput: e.currentTarget.checked })}
				/>
				{@render t('guardrails.sanitizeInput')}
			</label>
			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.redactSensitive}
					onchange={(e) => patch({ redactSensitive: e.currentTarget.checked })}
				/>
				{@render t('guardrails.redactSensitive')}
			</label>
			<label class="facet-check">
				<input
					type="checkbox"
					checked={data.quotaEnabled}
					onchange={(e) => patch({ quotaEnabled: e.currentTarget.checked })}
				/>
				{@render t('guardrails.quota', 'guardrails.quota (optional)')}
			</label>
			{#if data.quotaEnabled}
				<label class="facet-field">
					{@render t('guardrails.quota.perDay', 'quota.perDay')}
					<input
						class="field"
						type="number"
						min="1"
						value={data.perDay}
						oninput={(e) => patch({ perDay: Number(e.currentTarget.value) })}
					/>
				</label>
			{/if}
			<label class="facet-field">
				{@render t('guardrails.egress')}
				<Select
					value={data.egressMode}
					options={egressModeOptions}
					onchange={(v) => patch({ egressMode: v as 'default' | 'none' | 'custom' })}
				/>
			</label>
			{#if data.egressMode === 'custom'}
				<label class="facet-field">
					{@render t('guardrails.egress.onBlock', 'egress.onBlock')}
					<Select
						value={data.onBlock}
						options={onBlockOptions}
						onchange={(v) => patch({ onBlock: v as 'reject_to_agent' | 'refuse_to_user' })}
					/>
				</label>
				<label class="facet-field">
					{@render t('guardrails.egress.maxRetries', 'egress.maxRetries')}
					<input
						class="field"
						type="number"
						min="0"
						value={data.egressMaxRetries}
						oninput={(e) => patch({ egressMaxRetries: Number(e.currentTarget.value) })}
					/>
				</label>
				<p class="facet-hint">Export stubs a host-owned enforce() for you to fill in.</p>
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
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-mute);
	}

	.facet-check :global(.type-label) {
		display: inline;
		width: auto;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: normal;
		text-transform: none;
		color: inherit;
		cursor: help;
	}

	.facet-set legend :global(.type-label) {
		font-size: 0.55rem;
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
		font-size: 0.7rem;
		font-weight: 700;
	}

	.facet-set {
		margin: 0;
		padding: 0.45rem 0 0;
		border: 0;
		border-top: 1px solid #000;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.facet-set legend {
		padding: 0;
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-mute);
	}

	.facet-hint {
		margin: 0;
		font-size: 0.62rem;
		line-height: 1.35;
		color: var(--color-mute);
		font-weight: 600;
	}

	.facet-action {
		align-self: flex-start;
		padding: 0.35rem 0.55rem;
		font-size: 0.62rem;
	}
</style>
