import type { InputStatus } from '@astryxdesign/core/Field';
import type { PlaygroundIssue } from '@theoremjs/playground';
import { createContext, useContext } from 'react';

/**
 * The inspector's contexts, apart from its components: a module that imports the playground package
 * re-runs when that package changes, and a context made again would leave its readers on the old one.
 */

/** The compile issues for the node being edited; rows show the ones on their field. */
export const NodeIssues = createContext<readonly PlaygroundIssue[]>([]);

/**
 * Looks up the error status for a draft field of the node being edited, and for a list field, the
 * entry at `index`. Several issues on one field show as one message.
 */
export function useFieldStatus(): (field?: string, index?: number) => InputStatus | undefined {
	const issues = useContext(NodeIssues);
	return (field, index) => {
		if (field === undefined) return undefined;
		const messages = issues
			.filter((issue) => issue.field === field && issue.index === index)
			.map((issue) => issue.message);
		return messages.length ? { type: 'error', message: messages.join(' ') } : undefined;
	};
}

/** Marks a row that has an issue, so the issue pill can scroll to it. */
export const ISSUE_ROW_ATTRIBUTE = 'data-issue';

/**
 * How many of a list row's picks show as badges before the rest are counted: two while the editor
 * is at its default width or wider, one once it is narrowed.
 */
export const ListBadges = createContext(1);
