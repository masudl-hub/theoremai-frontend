import {
	playgroundPolicyViolation,
	validateCustomToolsAllow,
	validateGeminiModelSpec,
	validateOpenRouterModelSpec,
} from './playground-policy';
import type {
	CompileIssue,
	CompileResult,
	FacetData,
	OutputsData,
	PlaygroundNode,
	StructuredRegistration,
} from './types';

function asKind<T extends FacetData['kind']>(
	nodes: PlaygroundNode[],
	kind: T,
): Extract<FacetData, { kind: T }> | undefined {
	const node = nodes.find((n) => n.data.kind === kind);
	return node?.data as Extract<FacetData, { kind: T }> | undefined;
}

function allOfKind<T extends FacetData['kind']>(
	nodes: PlaygroundNode[],
	kind: T,
): Array<{ id: string; data: Extract<FacetData, { kind: T }> }> {
	return nodes
		.filter((n) => n.data.kind === kind)
		.map((n) => ({ id: n.id, data: n.data as Extract<FacetData, { kind: T }> }));
}

function parseList(raw: string): string[] {
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

/** Validate the graph and emit a defineProfile-shaped contract. */
export function compilePlayground(nodes: PlaygroundNode[]): CompileResult {
	const issues: CompileIssue[] = [];

	const identity = asKind(nodes, 'identity');
	const models = asKind(nodes, 'models');
	const specs = allOfKind(nodes, 'modelSpec');
	const tools = asKind(nodes, 'tools');
	const inputs = asKind(nodes, 'inputs');
	const outputs = asKind(nodes, 'outputs');
	const guardrails = asKind(nodes, 'guardrails');

	if (!identity) {
		issues.push({
			nodeId: 'identity',
			facet: 'identity',
			message: 'Describe agent node is missing.',
		});
	} else {
		if (!identity.agentId.trim()) {
			issues.push({ nodeId: 'identity', facet: 'identity', message: 'id is required.' });
		}
		if (!identity.handle.trim()) {
			issues.push({
				nodeId: 'identity',
				facet: 'identity',
				message: 'identity.handle is required.',
			});
		}
		if (!identity.system.trim()) {
			issues.push({
				nodeId: 'identity',
				facet: 'identity',
				message: 'identity.system is required.',
			});
		}
	}

	if (!models) {
		issues.push({ nodeId: 'models', facet: 'models', message: 'Models hub is missing.' });
	}

	if (!specs.length) {
		issues.push({
			nodeId: 'models',
			facet: 'models',
			message: 'Add at least one model config node.',
		});
	}

	const seenIds = new Set<string>();
	for (const { id, data } of specs) {
		const mid = data.modelId.trim();
		if (!mid) {
			issues.push({ nodeId: id, facet: 'modelSpec', message: 'model id is required.' });
		} else if (seenIds.has(mid)) {
			issues.push({
				nodeId: id,
				facet: 'modelSpec',
				message: `Duplicate model id '${mid}'.`,
			});
		} else {
			seenIds.add(mid);
		}
		if (!data.apiId.trim()) {
			issues.push({
				nodeId: id,
				facet: 'modelSpec',
				message: 'Model wire id is required.',
			});
		} else if (models) {
			const err =
				models.protocol === 'openAi' && models.provider === 'openrouter'
					? validateOpenRouterModelSpec(data.apiId)
					: (models.protocol === 'geminiInteractions' || models.protocol === 'geminiLive') &&
							models.provider === 'google'
						? validateGeminiModelSpec(data.apiId, data.builtInTools)
						: null;
			if (err) {
				issues.push({ nodeId: id, facet: 'modelSpec', message: err });
			}
		}
	}

	if (!tools) {
		issues.push({ nodeId: 'tools', facet: 'tools', message: 'Tools node is missing.' });
	} else {
		const customErr = validateCustomToolsAllow(tools.allow);
		if (customErr) {
			issues.push({ nodeId: 'tools', facet: 'tools', message: customErr });
		}
	}

	if (!inputs) {
		issues.push({ nodeId: 'inputs', facet: 'inputs', message: 'Inputs node is missing.' });
	}

	if (!outputs) {
		issues.push({ nodeId: 'outputs', facet: 'outputs', message: 'Outputs node is missing.' });
	} else if (outputs.mode === 'structured' && !outputs.schemaId.trim()) {
		issues.push({
			nodeId: 'outputs',
			facet: 'outputs',
			message: 'outputs.structured schema id is required when mode is structured.',
		});
	}

	if (!guardrails) {
		issues.push({
			nodeId: 'guardrails',
			facet: 'guardrails',
			message: 'Guardrails node is missing.',
		});
	} else if (
		guardrails.quotaEnabled &&
		(!Number.isFinite(guardrails.perDay) || guardrails.perDay < 1)
	) {
		issues.push({
			nodeId: 'guardrails',
			facet: 'guardrails',
			message: 'guardrails.quota.perDay must be ≥ 1 when quota is enabled.',
		});
	}

	if (
		issues.length ||
		!identity ||
		!models ||
		!specs.length ||
		!tools ||
		!inputs ||
		!outputs ||
		!guardrails
	) {
		return {
			ok: false,
			issues,
			message: `Compile failed · ${String(issues.length)} issue${issues.length === 1 ? '' : 's'}`,
		};
	}

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
	const allowTools = parseList(tools.allow);

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
		tools: { allow: allowTools },
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

	const egressMode: 'default' | 'none' =
		guardrails.egressMode === 'none' ? 'none' : 'default';

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
	if (egressMode === 'default') {
		importNames.push('standardEgressEnforce');
	}

	const profileJson = JSON.stringify(profile, null, 2).replace(
		'"__STANDARD_EGRESS__"',
		'standardEgressEnforce',
	);

	const source = `import {
  ${importNames.join(',\n  ')},
} from "theorum";
${schemaRegister}
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
			allowsGrounding: outputs.imageAllowsGrounding,
			...(outputs.imageMaxInputImages > 0 ? { maxInputImages: outputs.imageMaxInputImages } : {}),
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
