import {
	defineProfile,
	type Profile,
	type ProfileDefinition,
	registerProfile,
	registerStructured,
	registerTool,
	standardEgressEnforce,
} from '@theoremai/agents';
import { registerGooglePreset } from '@theoremai/agents/presets/google';
import {
	playgroundDemoHandler,
	type StructuredRegistration,
	stubOutputFromSchema,
	type ToolRegistration,
	zodFromJsonSchema,
} from '@theoremai/playground';

let playgroundPresetReady = false;

function ensurePlaygroundPreset(): void {
	if (playgroundPresetReady) return;
	registerGooglePreset();
	playgroundPresetReady = true;
}

function registerPlaygroundTools(tools: readonly ToolRegistration[]): void {
	for (const tool of tools) {
		if (tool.type === 'http') {
			registerTool({
				type: 'http',
				name: tool.name,
				description: tool.description,
				category: tool.category,
				access: tool.access,
				paths: tool.paths,
				loadTier: tool.loadTier,
				permission: tool.permission,
				endpoint: tool.endpoint,
				method: tool.method,
				headers: tool.headers,
				mapping: tool.mapping,
				auth: tool.auth,
				input: zodFromJsonSchema(tool.inputSchema),
				output: zodFromJsonSchema(tool.outputSchema),
			});
		} else if (tool.type === 'mcp') {
			registerTool({
				type: 'mcp',
				name: tool.name,
				description: tool.description,
				category: tool.category,
				access: tool.access,
				paths: tool.paths,
				loadTier: tool.loadTier,
				permission: tool.permission,
				serverUrl: tool.serverUrl,
				mcpToolName: tool.mcpToolName,
				headers: tool.headers,
				auth: tool.auth,
				input: zodFromJsonSchema(tool.inputSchema),
				output: zodFromJsonSchema(tool.outputSchema),
			});
		} else {
			const demoHandler = playgroundDemoHandler(tool.name);
			const stub = tool.stubResponse ?? stubOutputFromSchema(tool.outputSchema);
			registerTool({
				type: 'function',
				name: tool.name,
				description: tool.description,
				category: tool.category,
				access: tool.access,
				paths: tool.paths,
				loadTier: tool.loadTier,
				permission: tool.permission,
				input: zodFromJsonSchema(tool.inputSchema),
				output: zodFromJsonSchema(tool.outputSchema),
				handler: demoHandler
					? (input) => {
							try {
								return Promise.resolve(demoHandler(input as Record<string, unknown>));
							} catch (err) {
								return Promise.reject(err instanceof Error ? err : new Error(String(err)));
							}
						}
					: () => Promise.resolve(stub),
			});
		}
	}
}

function registerPlaygroundStructured(structured?: StructuredRegistration): void {
	if (!structured) return;
	registerStructured(structured.id, structured.spec);
}

/** Swaps the draft's egress enforcer for the standard one, keeping the guardrails' own type. */
function withStandardEgress<G extends { egress?: { enforce: unknown } }>(guardrails: G): G {
	if (!guardrails.egress) return guardrails;
	return { ...guardrails, egress: { ...guardrails.egress, enforce: standardEgressEnforce } };
}

function runtimeProfileDefinition(def: ProfileDefinition): ProfileDefinition {
	if (def.type === 'host' || !def.guardrails) return def;
	// Speech narrows guardrails (no canary), so it is spread on its own to keep that type.
	if (def.type === 'speech') return { ...def, guardrails: withStandardEgress(def.guardrails) };
	return { ...def, guardrails: withStandardEgress(def.guardrails) };
}

export function registerPlaygroundProfile(
	profile: ProfileDefinition,
	customTools: readonly ToolRegistration[],
	structured?: StructuredRegistration,
): Profile {
	ensurePlaygroundPreset();
	registerPlaygroundTools(customTools);
	if (profile.type !== 'live') {
		registerPlaygroundStructured(structured);
	}
	const runtime = runtimeProfileDefinition(profile);
	const defined = defineProfile(runtime);
	registerProfile(defined);
	return defined;
}
