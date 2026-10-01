import { useEffect, useSyncExternalStore } from 'react';

export type Th30Page = {
	title: string;
	summary: string;
	/** What the visitor has scrolled to or selected on the page, if it says. */
	viewing?: string;
};

/** Route `handle` a page exports so th30 knows where the visitor is. */
export type Th30PageHandle = {
	th30Page?: (data: never, hash: string) => Th30Page;
};

/** The playground's live state, as th30 is told it. */
export type Th30PlaygroundState = {
	agent: string;
	type: string;
	issues: number;
	section?: string;
};

let playgroundState: Th30PlaygroundState | null = null;
const listeners = new Set<() => void>();

function setPlaygroundState(next: Th30PlaygroundState | null) {
	const same =
		next === playgroundState ||
		(next !== null &&
			playgroundState !== null &&
			next.agent === playgroundState.agent &&
			next.type === playgroundState.type &&
			next.issues === playgroundState.issues &&
			next.section === playgroundState.section);
	if (same) return;
	playgroundState = next;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The playground reports its state while it is mounted. */
export function useReportTh30Playground(state: Th30PlaygroundState) {
	const { agent, type, issues, section } = state;
	useEffect(() => {
		setPlaygroundState({ agent, type, issues, section });
	}, [agent, type, issues, section]);
	useEffect(
		() => () => {
			setPlaygroundState(null);
		},
		[],
	);
}

export function useTh30PlaygroundState(): Th30PlaygroundState | null {
	return useSyncExternalStore(
		subscribe,
		() => playgroundState,
		() => null,
	);
}

/** The one line th30 reads to know the page: `(page) /path — Title: summary [state]`. */
export function th30PageLine(
	pathname: string,
	page: Th30Page,
	playground: Th30PlaygroundState | null,
): string {
	const state: string[] = [];
	if (page.viewing) state.push(`viewing: ${page.viewing}`);
	if (playground) {
		state.push(
			`agent: ${playground.agent}`,
			`type: ${playground.type}`,
			playground.issues === 0
				? 'no issues'
				: `${String(playground.issues)} ${playground.issues === 1 ? 'issue' : 'issues'}`,
		);
		if (playground.section) state.push(`section: ${playground.section}`);
	}
	const tail = state.length ? ` [${state.join(', ')}]` : '';
	return `(page) ${pathname} — ${page.title}: ${page.summary}${tail}`;
}
