/**
 * Playground toolSpec helpers — JSON Schema ↔ Zod for stub registration / export.
 */

import { type ZodType, z } from 'zod';

export const DEFAULT_TOOL_INPUT_SCHEMA = `{
  "type": "object",
  "properties": {
    "query": { "type": "string" }
  },
  "required": ["query"]
}`;

export const DEFAULT_TOOL_OUTPUT_SCHEMA = `{
  "type": "object",
  "properties": {
    "result": { "type": "string" }
  },
  "required": ["result"]
}`;

function jsonSchemaFields(schema: Record<string, unknown>): {
	props: Record<string, Record<string, unknown>>;
	required: Set<string>;
} {
	const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
	const required = new Set(
		Array.isArray(schema.required)
			? schema.required.filter((k): k is string => typeof k === 'string')
			: [],
	);
	return { props, required };
}

function propToZod(prop: Record<string, unknown>): ZodType {
	const t = prop.type;
	if (t === 'string' || (Array.isArray(t) && t.includes('string'))) return z.string();
	if (t === 'number' || t === 'integer') return z.number();
	if (t === 'boolean') return z.boolean();
	if (t === 'array') {
		const items = prop.items;
		if (items && typeof items === 'object' && !Array.isArray(items)) {
			return z.array(propToZod(items as Record<string, unknown>));
		}
		return z.array(z.unknown());
	}
	if (t === 'object' || prop.properties) {
		return zodFromJsonSchema(prop);
	}
	return z.unknown();
}

/** Build a Zod schema from a limited JSON Schema subset (object, array, primitives). */
export function zodFromJsonSchema(schema: Record<string, unknown>): ZodType {
	if (schema.type === 'array') {
		return propToZod(schema);
	}
	const { props, required } = jsonSchemaFields(schema);
	const shape: Record<string, ZodType> = {};
	for (const [key, prop] of Object.entries(props)) {
		const field = propToZod(prop);
		shape[key] = required.has(key) ? field : field.optional();
	}
	if (Object.keys(shape).length === 0) {
		return z.looseObject({});
	}
	return z.looseObject(shape);
}

const SAMPLE_STRINGS: Record<string, string> = {
	name: 'paris',
	q: 'Paris',
	title: 'Paris',
	from: 'USD',
	to: 'EUR',
	country: 'us',
	postal: '90210',
	repoName: 'sveltejs/kit',
	question: 'What is this project?',
};

function sampleValueForProp(key: string, prop: Record<string, unknown>): unknown {
	const t = prop.type;
	if (t === 'number' || t === 'integer') {
		if (key === 'limit') return 1;
		if (key === 'amount') return 100;
		if (key.startsWith('lat')) return 48.85;
		if (key === 'lon' || key === 'lng' || key.endsWith('lon')) return 2.35;
		return 1;
	}
	if (t === 'boolean') return true;
	if (SAMPLE_STRINGS[key]) return SAMPLE_STRINGS[key];
	return 'test';
}

/** Build a minimal object that satisfies required input schema fields for connection tests. */
export function sampleInputFromJsonSchema(
	schema: Record<string, unknown>,
): Record<string, unknown> {
	const required = Array.isArray(schema.required)
		? schema.required.filter((k): k is string => typeof k === 'string')
		: [];
	const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
	const out: Record<string, unknown> = {};
	for (const key of required) {
		if (!(key in props)) continue;
		out[key] = sampleValueForProp(key, props[key]);
	}
	return out;
}

export function parseJsonSchema(
	raw: string,
	label: string,
): { ok: true; schema: Record<string, unknown> } | { ok: false; error: string } {
	const trimmed = raw.trim();
	if (!trimmed) {
		return { ok: false, error: `${label} JSON Schema is required.` };
	}
	try {
		const parsed = JSON.parse(trimmed) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return { ok: false, error: `${label} must be a JSON object.` };
		}
		return { ok: true, schema: parsed as Record<string, unknown> };
	} catch {
		return { ok: false, error: `${label} is not valid JSON.` };
	}
}

function zodExprFromProp(prop: Record<string, unknown>): string {
	const t = prop.type;
	if (t === 'string' || (Array.isArray(t) && t.includes('string'))) return 'z.string()';
	if (t === 'number' || t === 'integer') return 'z.number()';
	if (t === 'boolean') return 'z.boolean()';
	if (t === 'array') {
		const items = prop.items;
		if (items && typeof items === 'object' && !Array.isArray(items)) {
			return `z.array(${zodExprFromProp(items as Record<string, unknown>)})`;
		}
		return 'z.array(z.unknown())';
	}
	if (t === 'object' || prop.properties) {
		return zodExprFromJsonSchema(prop);
	}
	return 'z.unknown()';
}

/** Emit a `z.object({...})` expression for export source. */
export function zodExprFromJsonSchema(schema: Record<string, unknown>): string {
	const { props, required } = jsonSchemaFields(schema);
	const entries = Object.entries(props);
	if (!entries.length) return 'z.object({})';
	const lines = entries.map(([key, prop]) => {
		const expr = zodExprFromProp(prop);
		const field = required.has(key) ? expr : `${expr}.optional()`;
		return `    ${JSON.stringify(key)}: ${field}`;
	});
	return `z.object({\n${lines.join(',\n')}\n  })`;
}
