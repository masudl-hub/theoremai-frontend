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

const figure = z.union([sequence, lanes]);

export type DocFigure = z.infer<typeof figure>;
export type SequenceFigure = z.infer<typeof sequence>;
export type LanesFigure = z.infer<typeof lanes>;

/** The figure a `figure` fence holds. Throws on JSON that is not a figure. */
export function parseFigure(code: string): DocFigure {
	return figure.parse(JSON.parse(code));
}

/** A figure as Markdown a reader without vision can follow: the caption, then each step and its parts. */
export function figureMarkdown(fig: DocFigure): string {
	const steps = fig.steps.map((each, at) => {
		const who = 'lane' in each ? `[${each.lane}] ` : '';
		const parts = (each.parts ?? []).map((one) => {
			const text = one.text ? `: ${one.text}` : '';
			const see = one.chapter ? ` (see /docs/${one.chapter})` : '';
			return `   - ${one.label}${text}${see}`;
		});
		return [`${String(at + 1)}. ${who}**${each.label}**: ${each.text}`, ...parts].join('\n');
	});
	return [`**Figure.** ${fig.caption}`, '', ...steps].join('\n');
}
