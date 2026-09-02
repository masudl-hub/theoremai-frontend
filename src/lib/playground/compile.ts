import { emitRegisterToolSource, validatePlaygroundGraph } from './compile-validate';
import { parseList, playgroundPolicyViolation } from './playground-policy';
import type {
	CompileIssue,
	CompileResult,
	OutputsData,
	PlaygroundNode,
	StructuredRegistration,
} from './types';

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

	const { identity, models, tools, inputs, outputs, guardrails, specs, customTools } =
		validated.value;
	const issues: CompileIssue[] = [];

	const allow = specs.map((s) => s.data.modelId.trim());
	const config: Record<string, unknown> = {};
	const select: Record<string, string> = {};

	for (const { data } of specs) {
		const mid = data.modelId.trim();
		const specEntry: Record<string, unknown> = {
			apiId: data.apiId.trim(),
			thinking: { on: data.thinkingOn, off: data.thinkingOff },
			thinkingLevels: data.thinkingLevels.length
				? data.thinkingLevels
				: ['minimal', 'low', 'medium', 'high'],
			summaries: { on: data.summariesOn, off: data.summariesOff },
			maxOutputTokens: data.maxOutputTokens,
			temperature: data.temperature,
			builtInTools: parseList(data.builtInTools),
		};
		config[mid] = specEntry;
		const label = data.selectLabel.trim() || mid;
		select[label] = mid;
	}

	const controls = models.thinkingControl ? ['thinking'] : [];
	const allowTools = customTools.map((t) => t.name);
	const toolsSpec: Record<string, unknown> = { allow: allowTools };
	if (tools.t2Loader.trim()) {
		toolsSpec.t2Loader = tools.t2Loader.trim();
	}

	const profile: Record<string, unknown> = {
		id: identity.agentId.trim(),
		identity: {
			handle: identity.handle.trim(),
			system: identity.system.trim(),
			...(identity.chat ? { chat: true } : {}),
		},
		model: {
			protocol: models.protocol,
			provider: models.provider,
			allow,
			config,
			select,
			thinking: models.thinking,
			maxSteps: models.maxSteps,
			...(controls.length ? { controls } : {}),
			...(models.key
				? { key: models.key }
				: models.protocol === 'geminiInteractions' || models.protocol === 'geminiLive'
					? { key: 'freeA' }
					: {}),
		},
		tools: toolsSpec,
		inputs: {
			text: inputs.text,
			...(inputs.attachmentsAccept.length
				? { attachments: { accept: inputs.attachmentsAccept } }
				: {}),
			...(inputs.voiceAccept.length ? { voice: { accept: inputs.voiceAccept } } : {}),
			...(inputs.maxFiles > 0 ? { maxFiles: inputs.maxFiles } : {}),
			...(inputs.maxBytes > 0 ? { maxBytes: inputs.maxBytes } : {}),
			...(inputs.maxTurnBytes > 0 ? { maxTurnBytes: inputs.maxTurnBytes } : {}),
		},
		outputs: buildOutputs(outputs),
		guardrails: {
			canary: guardrails.canary,
			sanitizeInput: guardrails.sanitizeInput,
			redactSensitive: guardrails.redactSensitive,
			...(guardrails.quotaEnabled ? { quota: { perDay: guardrails.perDay } } : {}),
		},
	};

	const tierMsg = playgroundPolicyViolation(
		profile as Parameters<typeof playgroundPolicyViolation>[0],
	);
	if (tierMsg) {
		issues.push({ nodeId: 'models', facet: 'models', message: tierMsg });
		return {
			ok: false,
			issues,
			message: `Compile failed · ${String(issues.length)} issue${issues.length === 1 ? '' : 's'}`,
		};
	}

	const egressMode: 'default' | 'none' = guardrails.egressMode === 'none' ? 'none' : 'default';

	const guardrailsOut = profile.guardrails as Record<string, unknown>;
	if (egressMode === 'default') {
		guardrailsOut.egress = {
			onBlock: guardrails.onBlock,
			maxRetries: guardrails.egressMaxRetries,
			enforce: '__STANDARD_EGRESS__',
		};
	}

	let schemaRegister = '';
	let structured: StructuredRegistration | undefined;
	if (outputs.mode === 'structured' && outputs.schemaId.trim()) {
		let jsonBody: Record<string, unknown> | undefined;
		if (outputs.schemaJson.trim()) {
			try {
				const parsed = JSON.parse(outputs.schemaJson) as Record<string, unknown>;
				jsonBody = parsed;
			} catch {
				jsonBody = undefined;
			}
		}
		const spec = {
			enforced: outputs.schemaEnforced,
			...(jsonBody ? { jsonSchema: jsonBody } : {}),
		};
		structured = { id: outputs.schemaId.trim(), spec };
		schemaRegister = `
registerStructured(${JSON.stringify(outputs.schemaId.trim())}, ${JSON.stringify(spec, null, 2)});
`;
	}

	const importNames = ['defineProfile', 'registerProfile', 'registerStructured'];
	if (customTools.length) importNames.push('registerTool');
	if (egressMode === 'default') importNames.push('standardEgressEnforce');

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

function buildOutputs(outputs: OutputsData): Record<string, unknown> {
	const out: Record<string, unknown> = {
		structured: outputs.mode === 'structured' ? outputs.schemaId.trim() : null,
		streaming: {
			mode: outputs.streamMode,
			streamThoughts: outputs.streamThoughts,
			...(outputs.gateMedia ? { gateMedia: true } : {}),
		},
	};

	if (outputs.validationEnabled) {
		out.validation = {
			maxRetries: outputs.maxRetries,
			...(outputs.repairGuidance.trim() ? { repairGuidance: outputs.repairGuidance.trim() } : {}),
		};
	}

	if (outputs.imageEnabled) {
		out.image = {
			...(outputs.imageAspectRatio.trim() ? { aspectRatio: outputs.imageAspectRatio.trim() } : {}),
			...(outputs.imageSize.trim() ? { size: outputs.imageSize.trim() } : {}),
			...(outputs.imageMimeType.trim() ? { mimeType: outputs.imageMimeType.trim() } : {}),
			...(outputs.imageMaxInputImages > 0 ? { maxInputImages: outputs.imageMaxInputImages } : {}),
			...(outputs.imageIncludeText ? { includeText: true } : {}),
		};
	}

	if (outputs.speechEnabled) {
		out.speech = {
			...(outputs.speechVoice.trim() ? { voice: outputs.speechVoice.trim() } : {}),
			format: outputs.speechFormat,
		};
	}

	if (outputs.resumeEnabled) {
		out.resume = {
			...(outputs.allowContinue.length ? { allowContinue: outputs.allowContinue } : {}),
			...(outputs.autoContinue.length ? { autoContinue: outputs.autoContinue } : {}),
		};
	}

	return out;
}
