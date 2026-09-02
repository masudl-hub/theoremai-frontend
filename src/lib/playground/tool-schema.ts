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

/** Build a Zod object from a limited JSON Schema subset (object + primitives). */
export function zodFromJsonSchema(schema: Record<string, unknown>): ZodType {
	const { props, required } = jsonSchemaFields(schema);
	const shape: Record<string, ZodType> = {};
	for (const [key, prop] of Object.entries(props)) {
		const field = propToZod(prop);
		shape[key] = required.has(key) ? field : field.optional();
	}
	if (Object.keys(shape).length === 0) {
		return z.object({});
	}
	return z.object(shape);
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
