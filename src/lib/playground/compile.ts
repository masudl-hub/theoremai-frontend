import {
	defineProfile,
	type LiveProfileToolsSpec,
	liveIngressChannelDefault,
	type ProfileDefinition,
	type ProfileDefinitionBase,
	type ProfileGuardrailsSpec,
	type ProfileInputsSpec,
	type ProfileLiveSpec,
	type ProfileObservabilitySpec,
	type ProfileOutputsSpec,
	type ProfileToolsSpec,
	type ProfileTurnBehaviourSpec,
	type ProfileTurnResumptionSpec,
	TheorumError,
} from 'theorum';
import { emitRegisterToolSource, validatePlaygroundGraph } from './compile-validate';
import { parseList, playgroundPolicyViolation } from './playground-policy';
import type {
	CompileIssue,
	CompileResult,
	GuardrailsData,
	ImageData,
	InputsData,
	LiveData,
	ModelBindingData,
	ObservabilityData,
	OutputsData,
	PlaygroundNode,
	SpeechData,
	StructuredRegistration,
	TurnBehaviourData,
} from './types';

type ModelBinding = ProfileDefinition['models'][string];

function buildModelsRecord(
	specs: Array<{ id: string; data: ModelBindingData }>,
	opts: { forceSummaries?: boolean } = {},
): Record<string, ModelBinding> {
	const models: Record<string, ModelBinding> = {};

	for (const { data } of specs) {
		const mid = data.modelId.trim();
		const builtInTools = parseList(data.builtInTools);
		const efforts = Object.fromEntries(
			Object.entries(data.efforts).filter(([alias]) => alias.trim()),
		);
		const defaultEffort = data.defaultEffort.trim();

		const maxOutputTokens =
			typeof data.maxOutputTokens === 'number' && data.maxOutputTokens > 0
				? data.maxOutputTokens
				: undefined;

		const wantSummaries = data.summaries || Boolean(opts.forceSummaries);

		models[mid] = {
			protocol: data.protocol,
			provider: data.provider,
			apiId: data.apiId.trim(),
			...(Object.keys(efforts).length ? { efforts } : {}),
			...(defaultEffort ? { defaultEffort } : {}),
			...(data.allowEffortSelect ? { allowEffortSelect: true } : {}),
			...(wantSummaries ? { summaries: true } : {}),
			...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
			...(typeof data.temperature === 'number' && Number.isFinite(data.temperature)
				? { temperature: data.temperature }
				: {}),
			...(builtInTools.length ? { builtInTools } : {}),
		};
	}

	return models;
}

function buildInputsPayload(inputs?: InputsData): ProfileInputsSpec | undefined {
	if (!inputs) return undefined;
	const out: ProfileInputsSpec = {
		...(typeof inputs.text === 'boolean' ? { text: inputs.text } : {}),
		...(inputs.attachmentsAccept.length
			? { attachments: { accept: inputs.attachmentsAccept } }
			: {}),
		...(inputs.voiceAccept.length ? { voice: { accept: inputs.voiceAccept } } : {}),
		...(inputs.maxFiles > 0 ? { maxFiles: inputs.maxFiles } : {}),
		...(inputs.maxBytes > 0 ? { maxBytes: inputs.maxBytes } : {}),
		...(inputs.maxTurnBytes > 0 ? { maxTurnBytes: inputs.maxTurnBytes } : {}),
	};
	return Object.keys(out).length ? out : {};
}

function buildGuardrailsPayload(guardrails?: GuardrailsData): {
	payload?: ProfileGuardrailsSpec;
	hasEgress: boolean;
} {
	if (!guardrails) return { hasEgress: false };
	const hasEgress = guardrails.hasEgress === true;
	const guardrailsOut: ProfileGuardrailsSpec = {
		...(typeof guardrails.canary === 'boolean' ? { canary: guardrails.canary } : {}),
		...(typeof guardrails.sanitizeInput === 'boolean'
			? { sanitizeInput: guardrails.sanitizeInput }
			: {}),
		...(typeof guardrails.redactSensitive === 'boolean'
			? { redactSensitive: guardrails.redactSensitive }
			: {}),
		...(guardrails.quotaEnabled && guardrails.perDay
			? { quota: { perDay: guardrails.perDay } }
			: {}),
		...(guardrails.allowPrivateNetworks || guardrails.allowedHosts
			? {
					network: {
						allowPrivateNetworks: guardrails.allowPrivateNetworks,
						allowedHosts: guardrails.allowedHosts ? parseList(guardrails.allowedHosts) : undefined,
					},
				}
			: {}),
	};
	if (hasEgress && guardrails.onBlock) {
		guardrailsOut.egress = {
			onBlock: guardrails.onBlock,
			...(guardrails.egressMaxRetries ? { maxRetries: guardrails.egressMaxRetries } : {}),
			enforce: '__STANDARD_EGRESS__' as unknown as ProfileGuardrailsSpec extends {
				egress?: { enforce: infer E };
			}
				? E
				: never,
		};
	}
	return { payload: Object.keys(guardrailsOut).length ? guardrailsOut : undefined, hasEgress };
}

function buildStructuredRegistration(outputs?: OutputsData): {
	structured?: StructuredRegistration;
	schemaRegister: string;
} {
	if (outputs?.mode !== 'structured' || !outputs.schemaId.trim()) {
		return { schemaRegister: '' };
	}
	let jsonBody: Record<string, unknown> | undefined;
	if (outputs.schemaJson.trim()) {
		try {
			jsonBody = JSON.parse(outputs.schemaJson) as Record<string, unknown>;
		} catch {
			jsonBody = undefined;
		}
	}
	const spec = {
		enforced: outputs.schemaEnforced,
		...(jsonBody ? { jsonSchema: jsonBody } : {}),
	};
	const structured = { id: outputs.schemaId.trim(), spec };
	const schemaRegister = `\nregisterStructured(${JSON.stringify(outputs.schemaId.trim())}, ${JSON.stringify(spec, null, 2)});\n`;
	return { structured, schemaRegister };
}

type AssembleProfileParams = {
	profileType: 'text' | 'image' | 'speech' | 'live';
	base: ProfileDefinitionBase;
	toolsSpec: ProfileToolsSpec | LiveProfileToolsSpec;
	inputsPayload?: ProfileInputsSpec;
	image?: ImageData;
	speech?: SpeechData;
	live?: LiveData;
	outputs?: OutputsData;
	turnBehaviour?: TurnBehaviourData;
};

function buildTurnBehaviourPayload(
	tb?: TurnBehaviourData,
	profileType?: AssembleProfileParams['profileType'],
): ProfileTurnBehaviourSpec | undefined {
	if (!tb || profileType === 'live') return undefined;
	const out: ProfileTurnBehaviourSpec = {};

	if (tb.resumeEnabled) {
		/* Empty lists omit keys — kernel resolve applies DEFAULT_* at runtime. */
		const resumption: ProfileTurnResumptionSpec = {
			...(tb.allowContinue.length ? { allowContinue: tb.allowContinue } : {}),
			...(tb.autoContinue.length ? { autoContinue: tb.autoContinue } : {}),
		};
		out.resumption = resumption;
	}

	if (tb.allowSteering === false) {
		out.allowSteering = false;
	}

	if (!Object.keys(out).length) return undefined;
	return out;
}

function buildObservabilityPayload(obs?: ObservabilityData): ProfileObservabilitySpec | undefined {
	if (!obs) return undefined;

	const out: ProfileObservabilitySpec = {};
	if (obs.writeTo === false) out.writeTo = false;
	else if (obs.writeTo) out.writeTo = obs.writeTo;
	if (obs.sampleRate !== undefined && obs.sampleRate !== 1) out.sampleRate = obs.sampleRate;

	if (obs.include) {
		const include: NonNullable<ProfileObservabilitySpec['include']> = {
			...(obs.include.upstreamLog !== undefined ? { upstreamLog: obs.include.upstreamLog } : {}),
			...(obs.include.outboundWire !== undefined ? { outboundWire: obs.include.outboundWire } : {}),
			...(obs.include.evidenceRaw !== undefined ? { evidenceRaw: obs.include.evidenceRaw } : {}),
			...(obs.include.usage !== undefined ? { usage: obs.include.usage } : {}),
			...(obs.include.guardrailDecisions !== undefined
				? { guardrailDecisions: obs.include.guardrailDecisions }
				: {}),
			...(obs.include.guardrailMatchPreview !== undefined
				? { guardrailMatchPreview: obs.include.guardrailMatchPreview }
				: {}),
		};
		if (Object.keys(include).length) out.include = include;
	}

	if (obs.scrub) {
		const scrub: NonNullable<ProfileObservabilitySpec['scrub']> = {
			...(obs.scrub.sensitive !== undefined ? { sensitive: obs.scrub.sensitive } : {}),
			...(obs.scrub.injection !== undefined ? { injection: obs.scrub.injection } : {}),
			...(obs.scrub.canary !== undefined ? { canary: obs.scrub.canary } : {}),
		};
		if (Object.keys(scrub).length) out.scrub = scrub;
	}

	if (obs.retainForDays !== undefined) out.retainForDays = obs.retainForDays;
	if (obs.rotateAfterMiB !== undefined) out.rotateAfterMiB = obs.rotateAfterMiB;

	if (!Object.keys(out).length) return undefined;
	return out;
}

function buildImageSpec(image?: ImageData) {
	return {
		...(image?.aspectRatio.trim() ? { aspectRatio: image.aspectRatio.trim() } : {}),
		...(image?.size.trim() ? { size: image.size.trim() } : {}),
		...(image?.mimeType.trim() ? { mimeType: image.mimeType.trim() } : {}),
		...(image && image.maxInputImages > 0 ? { maxInputImages: image.maxInputImages } : {}),
		...(image?.includeText ? { includeText: true } : {}),
	};
}

function buildSpeechSpec(speech?: SpeechData) {
	return {
		...(speech?.voice.trim() ? { voice: speech.voice.trim() } : {}),
		...(speech?.format ? { format: speech.format } : {}),
	};
}

function buildLiveVad(live?: LiveData) {
	if (
		!live?.vadEnabled ||
		!(
			live.vadActivityHandling ||
			live.vadStartSensitivity ||
			live.vadEndSensitivity ||
			live.vadPrefixPaddingMs !== '' ||
			live.vadSilenceDurationMs !== ''
		)
	) {
		return undefined;
	}
	return {
		...(live.vadActivityHandling ? { activityHandling: live.vadActivityHandling } : {}),
		...(live.vadStartSensitivity ? { startSensitivity: live.vadStartSensitivity } : {}),
		...(live.vadEndSensitivity ? { endSensitivity: live.vadEndSensitivity } : {}),
		...(live.vadPrefixPaddingMs !== '' ? { prefixPaddingMs: live.vadPrefixPaddingMs } : {}),
		...(live.vadSilenceDurationMs !== '' ? { silenceDurationMs: live.vadSilenceDurationMs } : {}),
	};
}

function buildLiveIngress(live?: LiveData) {
	if (!live) return undefined;
	const ingress: NonNullable<ProfileLiveSpec['ingress']> = {};
	let wired = false;
	const channels: Array<{ key: keyof NonNullable<ProfileLiveSpec['ingress']>; value: boolean }> = [
		{ key: 'audio', value: live.ingressAudio },
		{ key: 'video', value: live.ingressVideo },
		{ key: 'text', value: live.ingressText },
	];
	for (const { key, value } of channels) {
		if (value !== liveIngressChannelDefault(key)) {
			ingress[key] = value;
			wired = true;
		}
	}
	return wired ? ingress : undefined;
}

function buildLiveSpec(live?: LiveData) {
	const vad = buildLiveVad(live);
	const ingress = buildLiveIngress(live);
	return {
		...(ingress ? { ingress } : {}),
		...(live?.voice.trim() ? { voice: live.voice.trim() } : {}),
		...(live?.sessionResumption ? { sessionResumption: true } : {}),
		...(live?.proactiveAudio ? { proactiveAudio: true } : {}),
		...(live?.contextCompression ? { contextCompression: live.contextCompression } : {}),
		...(vad ? { vad } : {}),
		...((live?.transcriptionInput || live?.transcriptionOutput) && {
			transcription: {
				...(live.transcriptionInput ? { input: true } : {}),
				...(live.transcriptionOutput ? { output: true } : {}),
			},
		}),
	};
}

function assembleTextProfile(params: AssembleProfileParams): ProfileDefinition {
	if (!params.inputsPayload) {
		throw new TheorumError(
			'inputs is required for text profiles — inputs facet must be on the graph',
		);
	}
	const turnBehaviour = buildTurnBehaviourPayload(params.turnBehaviour, params.profileType);
	return {
		...params.base,
		type: 'text',
		tools: params.toolsSpec,
		inputs: params.inputsPayload,
		...(turnBehaviour ? { turnBehaviour } : {}),
	};
}

function assembleImageProfile(params: AssembleProfileParams): ProfileDefinition {
	if (!params.inputsPayload) {
		throw new TheorumError(
			'inputs is required for image profiles — inputs facet must be on the graph',
		);
	}
	const turnBehaviour = buildTurnBehaviourPayload(params.turnBehaviour, params.profileType);
	return {
		...params.base,
		type: 'image',
		image: buildImageSpec(params.image),
		tools: params.toolsSpec,
		inputs: params.inputsPayload,
		...(turnBehaviour ? { turnBehaviour } : {}),
	};
}

function assembleSpeechProfile(params: AssembleProfileParams): ProfileDefinition {
	const turnBehaviour = buildTurnBehaviourPayload(params.turnBehaviour, params.profileType);
	return {
		...params.base,
		type: 'speech',
		speech: buildSpeechSpec(params.speech),
		...(turnBehaviour ? { turnBehaviour } : {}),
	};
}

function assembleLiveProfile(params: AssembleProfileParams): ProfileDefinition {
	return {
		...params.base,
		type: 'live',
		live: buildLiveSpec(params.live),
		tools: { allow: params.toolsSpec.allow } satisfies LiveProfileToolsSpec,
	};
}

function assembleProfileDefinition(params: AssembleProfileParams): ProfileDefinition {
	switch (params.profileType) {
		case 'text':
			return assembleTextProfile(params);
		case 'image':
			return assembleImageProfile(params);
		case 'speech':
			return assembleSpeechProfile(params);
		case 'live':
			return assembleLiveProfile(params);
	}
}

/** Validate the graph and emit a defineProfile-shaped contract. */
export function compilePlayground(nodes: PlaygroundNode[]): CompileResult {
	const validated = validatePlaygroundGraph(nodes);
	if (!validated.ok) {
		const { issues } = validated;
		return {
			ok: false,
			issues,
			message: `Compile failed · ${String(issues.length)} issue${issues.length === 1 ? '' : 's'}`,
		};
	}

	const {
		identity,
		models,
		tools,
		inputs,
		outputs,
		turnBehaviour,
		guardrails,
		observability,
		image,
		speech,
		live,
		specs,
		customTools,
	} = validated.value;
	const issues: CompileIssue[] = [];

	const modelsRecord = buildModelsRecord(specs, {
		forceSummaries: outputs?.streamThoughts === true,
	});
	const profileType = identity.profileType || 'text';
	const allowTools = customTools.map((t) => t.name);
	const toolsSpec: ProfileToolsSpec | LiveProfileToolsSpec =
		profileType === 'live'
			? ({ allow: allowTools } satisfies LiveProfileToolsSpec)
			: {
					allow: allowTools,
					...(tools?.t2Loader.trim() ? { t2Loader: tools.t2Loader.trim() } : {}),
				};

	const defaultModel = models.defaultModel.trim();
	const { payload: guardrailsPayload, hasEgress } = buildGuardrailsPayload(guardrails);
	const outputsPayload = profileType !== 'live' && outputs ? buildOutputs(outputs) : undefined;
	const observabilityPayload = buildObservabilityPayload(observability);
	const maxSteps =
		typeof models.maxSteps === 'number' && models.maxSteps > 0 ? models.maxSteps : undefined;

	const base: ProfileDefinitionBase = {
		id: identity.agentId.trim(),
		identity: {
			handle: identity.handle.trim(),
			...(identity.system.trim() ? { system: identity.system.trim() } : {}),
		},
		models: modelsRecord,
		...(defaultModel ? { defaultModel } : {}),
		...(models.allowModelSelect ? { allowModelSelect: true } : {}),
		...(maxSteps !== undefined && profileType !== 'live' ? { maxSteps } : {}),
		...(models.key ? { key: models.key } : {}),
		...(outputsPayload ? { outputs: outputsPayload } : {}),
		...(guardrailsPayload ? { guardrails: guardrailsPayload } : {}),
		...(observabilityPayload ? { observability: observabilityPayload } : {}),
	};

	const profile: ProfileDefinition = assembleProfileDefinition({
		profileType,
		base,
		toolsSpec,
		inputsPayload: buildInputsPayload(inputs),
		image,
		speech,
		live,
		outputs,
		turnBehaviour,
	});

	const tierMsg = playgroundPolicyViolation(profile);
	if (tierMsg) {
		issues.push({ nodeId: 'models', facet: 'models', message: tierMsg });
		return {
			ok: false,
			issues,
			message: `Compile failed · ${String(issues.length)} issue${issues.length === 1 ? '' : 's'}`,
		};
	}

	try {
		defineProfile(profile);
	} catch (err) {
		const message = err instanceof TheorumError ? err.message : String(err);
		issues.push({ nodeId: 'identity', facet: 'identity', message });
		return {
			ok: false,
			issues,
			message: `Compile failed · ${String(issues.length)} issue${issues.length === 1 ? '' : 's'}`,
		};
	}

	const { structured, schemaRegister } =
		profileType === 'live'
			? { structured: undefined, schemaRegister: '' }
			: buildStructuredRegistration(outputs);

	const importNames = ['defineProfile', 'registerProfile'];
	if (structured) importNames.push('registerStructured');
	if (customTools.length) importNames.push('registerTool');
	if (hasEgress && guardrails) importNames.push('standardEgressEnforce');

	const toolRegister = customTools.map(emitRegisterToolSource).join('\n');
	const zodImport = customTools.length ? `import { z } from "zod";\n` : '';

	const profileJson = JSON.stringify(profile, null, 2).replace(
		'"__STANDARD_EGRESS__"',
		'standardEgressEnforce',
	);

	const source = `${zodImport}import {
  ${importNames.join(',\n  ')},
} from "theorum";
${toolRegister}${schemaRegister}
const profile = defineProfile(${profileJson});

registerProfile(profile);
`;

	return {
		ok: true,
		agentId: identity.agentId.trim(),
		profile,
		source,
		message: 'Agent ready',
		structured,
		customTools,
	};
}

function buildOutputs(outputs: OutputsData): ProfileOutputsSpec | undefined {
	const out: ProfileOutputsSpec = {};

	if (outputs.mode === 'structured' && outputs.schemaId.trim()) {
		out.structured = outputs.schemaId.trim();
	}

	if (outputs.streamMode || outputs.streamThoughts) {
		out.streaming = {
			...(outputs.streamMode ? { mode: outputs.streamMode } : {}),
			...(outputs.streamThoughts ? { streamThoughts: true } : {}),
		};
	}

	if (outputs.validationEnabled) {
		out.validation = {
			maxRetries: outputs.maxRetries,
			...(outputs.repairGuidance.trim() ? { repairGuidance: outputs.repairGuidance.trim() } : {}),
		};
	}

	return Object.keys(out).length ? out : undefined;
}
