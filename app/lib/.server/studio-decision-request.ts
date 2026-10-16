/**
 * The decision request this site answers on its keys: only the fields a studio decision compiles
 * to, within the limits its keys hold decisions to. A setting left out stays out.
 */
import { z } from '@theoremjs/agents';
import { KEY_SLOT_NAME } from '@theoremjs/agents/schema';
import { SITE_KEYS } from '../studio-keys';

const limits = SITE_KEYS.decision;
const name = z.string().trim().min(1).max(limits.nameChars);
const id = z.string().trim().min(1).max(limits.idChars);
const entry = z.string().trim().min(1).max(limits.criterionChars);
const slot = z.string().regex(KEY_SLOT_NAME);
const labelled = z
	.record(name, entry)
	.refine(
		(record) => Object.keys(record).length > 0 && Object.keys(record).length <= limits.criteria,
	);
const instructions = z.string().trim().min(1).max(limits.instructionsChars);
const question = z.discriminatedUnion('type', [
	z.object({ type: z.literal('choice'), instructions, criteria: labelled }),
	z.object({
		type: z.literal('score'),
		instructions,
		criteria: z.array(entry).min(2).max(limits.criteria),
	}),
	z.object({ type: z.literal('noul'), instructions, criteria: labelled.optional() }),
]);

export const studioDecisionRequestSchema = z.object({
	profile: z.object({
		type: z.literal('decision'),
		id,
		identity: z.object({ handle: name }),
		models: z
			.record(
				name,
				z.object({
					protocol: z.literal('systemOne'),
					provider: z.enum(['typesafe', 'openrouter']),
					apiId: id,
					keySlot: slot.optional(),
					fallbackKeySlot: slot.optional(),
					options: z.record(z.string(), z.json()).optional(),
					timeoutMs: z.number().int().min(1).max(limits.timeoutMs).optional(),
				}),
			)
			.refine((models) => Object.keys(models).length === 1),
		inputs: z.object({
			state: z.literal('json'),
			maxStateBytes: z.number().int().min(1).max(limits.stateBytes).optional(),
		}),
		decision: z.object({ contract: id }),
		observability: z.record(z.string(), z.unknown()).optional(),
		labels: z.record(z.string(), z.unknown()).optional(),
	}),
	questions: z
		.record(name, question)
		.refine(
			(record) => Object.keys(record).length > 0 && Object.keys(record).length <= limits.questions,
		),
	state: z.unknown(),
});
