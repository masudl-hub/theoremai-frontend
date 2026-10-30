/**
 * A chapter figure: a `figure` fence holds this data as JSON, and the reader draws it on a still.
 * The data is the figure, so a reader without vision gets the same facts.
 */

import { z } from 'zod';
import { DOC_SECTIONS } from './schema';

const still = z.strictObject({
	/** A file in public/. */
	src: z.string().startsWith('/'),
	/** CSS background-position: the part of the still that stays in frame. */
	position: z.string(),
});

/**
 * One part of a step. `chapter` is the chapter that explains it: the part takes its icon and links to it.
 * A part with no `text` is a name alone, for a list of chapters.
 */
const part = z.strictObject({
	label: z.string(),
	text: z.string().optional(),
	chapter: z.enum(DOC_SECTIONS).optional(),
});

/** One step, and the parts it is made of when it has any. */
const step = z.strictObject({
	label: z.string(),
	text: z.string(),
	parts: z.array(part).min(1).optional(),
});

/** Steps that happen in order. `layout` draws them down the page, or across it where there is room. */
const sequence = z.strictObject({
	kind: z.literal('sequence'),
	layout: z.enum(['column', 'row']).default('column'),
	still,
	caption: z.string(),
	steps: z.array(step).min(2),
});

/**
 * Steps that happen in order, each done by one of two or three actors. Each actor has a lane:
 * the first is drawn at the start of the line, the last at the end.
 */
const lanes = z
	.strictObject({
		kind: z.literal('lanes'),
		still,
		caption: z.string(),
		lanes: z.array(z.string()).min(2).max(3),
		steps: z.array(step.extend({ lane: z.string() })).min(2),
	})
	.refine((figure) => figure.steps.every((each) => figure.lanes.includes(each.lane)), {
		error: 'a step names a lane the figure does not have',
	});

const tokenKind = z.enum([
	'profile',
	'model',
	'tool',
	'ingress',
	'egress',
	'guardrail',
	'stream',
	'store',
	'runner',
]);

const tokenColor = z.enum(['neutral', 'blue', 'green', 'amber', 'purple', 'red']);

const switchbackStep = z.strictObject({
	id: z.string().optional(),
	label: z.string(),
	token: z
		.strictObject({
			label: z.string(),
			kind: tokenKind.optional(),
			color: tokenColor.optional(),
		})
		.optional(),
	text: z.string().optional(),
	badge: z.string().optional(),
	parts: z.array(part).min(1).optional(),
});

const switchbackRow = z.strictObject({
	direction: z.enum(['ltr', 'rtl']).default('ltr'),
	steps: z.array(switchbackStep).min(1),
});

const switchback = z.strictObject({
	kind: z.literal('switchback'),
	still: still.optional(),
	caption: z.string(),
	rows: z.array(switchbackRow).min(1),
});

const figure = z.union([sequence, lanes, switchback]);

export type DocFigure = z.infer<typeof figure>;
export type SequenceFigure = z.infer<typeof sequence>;
export type LanesFigure = z.infer<typeof lanes>;
export type SwitchbackFigure = z.infer<typeof switchback>;

/** The figure a `figure` fence holds. Throws on JSON that is not a figure. */
export function parseFigure(code: string): DocFigure {
	return figure.parse(JSON.parse(code));
}

/** One numbered step and its parts, as `figureMarkdown` lists it. */
function stepMarkdown(
	at: number,
	head: string,
	text: string,
	parts: readonly z.infer<typeof part>[] = [],
): string {
	const lines = parts.map((one) => {
		const detail = one.text ? `: ${one.text}` : '';
		const see = one.chapter ? ` (see /docs/${one.chapter})` : '';
		return `   - ${one.label}${detail}${see}`;
	});
	return [`${String(at + 1)}. ${head}: ${text}`, ...lines].join('\n');
}

/** A figure as Markdown a reader without vision can follow: the caption, then each step and its parts. */
export function figureMarkdown(fig: DocFigure): string {
	const steps =
		fig.kind === 'switchback'
			? fig.rows
					.flatMap((row) => row.steps)
					.map((each, at) => {
						const token = each.token ? ` [${each.token.label}]` : '';
						return stepMarkdown(at, `**${each.label}**${token}`, each.text ?? '', each.parts);
					})
			: fig.steps.map((each, at) => {
					const who = 'lane' in each ? `[${each.lane}] ` : '';
					return stepMarkdown(at, `${who}**${each.label}**`, each.text, each.parts);
				});
	return [`**Figure.** ${fig.caption}`, '', ...steps].join('\n');
}
