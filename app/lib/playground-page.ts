/**
 * What the playground's page sends an agent: a value for each of its slots and its context
 * package. Kept in this tab beside the conversation, never in the profile.
 */
import { type PlaygroundRunPayload, playgroundPageTools } from '@theoremjs/playground';
import { isRecord, session } from './playground-session';

const PAGE_PREFIX = 'theorem.playground.v2.page:';

/** What the builder set: the value picked for each slot, and the context as typed. */
export interface PageValues {
	slots: Record<string, string>;
	contextJson: string;
}

/** What the agent takes from a page. */
export interface PageInputs {
	slots: Record<string, readonly string[]>;
	takesContext: boolean;
	/** The tools the page answers. Only a call asks the page. */
	pageTools: string[];
}

export const NO_PAGE_VALUES: PageValues = { slots: {}, contextJson: '' };

/** What the compiled agent takes from a page, or null when it takes nothing. */
export function pageInputsOf(payload: PlaygroundRunPayload): PageInputs | null {
	const { profile } = payload;
	if (profile.type === 'decision' || profile.type === 'host') return null;
	const inputs = 'inputs' in profile ? profile.inputs : undefined;
	const slots = inputs?.slots ?? {};
	const takesContext = inputs?.context?.from.includes('client') ?? false;
	const pageTools = Object.keys(playgroundPageTools(payload));
	if (!Object.keys(slots).length && !takesContext && !pageTools.length) return null;
	return { slots, takesContext, pageTools };
}

/** The value a slot sends: the one picked while the profile still lists it, else its first. */
export function slotValue(inputs: PageInputs, values: PageValues, name: string): string {
	const allowed = inputs.slots[name] ?? [];
	const picked = allowed.find((value) => value === values.slots[name]);
	return picked ?? allowed.at(0) ?? '';
}

/** What goes with a turn or a call. Context that is not JSON is not sent, and says why. */
export function sentPageValues(
	inputs: PageInputs | null,
	values: PageValues,
): { slots?: Record<string, string>; context?: unknown; contextError?: string } {
	if (!inputs) return {};
	const names = Object.keys(inputs.slots);
	const slots = names.length
		? Object.fromEntries(names.map((name) => [name, slotValue(inputs, values, name)]))
		: undefined;
	const typed = inputs.takesContext ? values.contextJson.trim() : '';
	if (!typed) return { slots };
	try {
		return { slots, context: JSON.parse(typed) as unknown };
	} catch {
		return { slots, contextError: 'Context must be JSON.' };
	}
}

export function loadPageValues(agentKey: string): PageValues {
	try {
		const kept: unknown = JSON.parse(session()?.getItem(`${PAGE_PREFIX}${agentKey}`) ?? 'null');
		if (!isRecord(kept) || !isRecord(kept.slots) || typeof kept.contextJson !== 'string') {
			return NO_PAGE_VALUES;
		}
		const slots = Object.fromEntries(
			Object.entries(kept.slots).filter(
				(entry): entry is [string, string] => typeof entry[1] === 'string',
			),
		);
		return { slots, contextJson: kept.contextJson };
	} catch {
		return NO_PAGE_VALUES;
	}
}

/** Never throws: a full or blocked store keeps nothing. */
export function savePageValues(agentKey: string, values: PageValues): void {
	try {
		session()?.setItem(`${PAGE_PREFIX}${agentKey}`, JSON.stringify(values));
	} catch {
		// Nothing is kept.
	}
}
