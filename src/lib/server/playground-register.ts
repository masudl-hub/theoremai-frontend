import {
	defineProfile,
	type Profile,
	type ProfileDefinition,
	registerProfile,
	registerStructured,
	registerTool,
	standardEgressEnforce,
} from 'theorum';
import { registerGooglePreset } from 'theorum/presets/google';
import { zodFromJsonSchema } from '$lib/playground/tool-schema';
import type { StructuredRegistration, ToolRegistration } from '$lib/playground/types';

let playgroundPresetReady = false;

function ensurePlaygroundPreset(): void {
	if (playgroundPresetReady) return;
	registerGooglePreset();
	playgroundPresetReady = true;
}

function stubOutput(schema: Record<string, unknown>): Record<string, unknown> {
	const stub: Record<string, unknown> = {};
	const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
	for (const [key, prop] of Object.entries(props)) {
		const t = prop.type;
		if (t === 'number' || t === 'integer') stub[key] = 0;
		else if (t === 'boolean') stub[key] = false;
		else if (t === 'array') stub[key] = [];
		else if (t === 'object') stub[key] = {};
		else stub[key] = `playground:${key}`;
	}
	if (!Object.keys(stub).length) stub.result = 'playground stub';
	return stub;
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
			const stub = tool.stubResponse ?? stubOutput(tool.outputSchema);
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
				handler: () => Promise.resolve(stub),
			});
		}
	}
}

function registerPlaygroundStructured(structured?: StructuredRegistration): void {
	if (!structured) return;
	registerStructured(structured.id, structured.spec);
}

function runtimeProfileDefinition(def: ProfileDefinition): ProfileDefinition {
	if (!def.guardrails?.egress) return def;
	return {
		...def,
		guardrails: {
			...def.guardrails,
			egress: {
				...def.guardrails.egress,
				enforce: standardEgressEnforce,
			},
		},
	};
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
