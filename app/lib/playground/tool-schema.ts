/**
 * Playground toolSpec helpers — JSON Schema → Zod for stub registration.
 */

import { type ZodType, z } from 'zod';

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
