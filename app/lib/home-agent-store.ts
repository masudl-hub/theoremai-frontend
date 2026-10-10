import type { CodeApply } from '@theoremjs/studio/ui/studio-host.ts';
import {
	compileHomeAgent,
	createHomeAgent,
	type DraftEdit,
	editHomeDraft,
	type HomeAgent,
	type HomeCompile,
	readHomeSource,
	toggleToken,
} from './home-agent';
import type { GoalTokenId } from './home-goals';

export type HomeGood = Extract<HomeCompile, { ok: true }>;

export type HomeAgentState = {
	agent: HomeAgent;
	compiled: HomeCompile;
	/** The last agent that compiled: what runs, and the file on screen, while an edit has issues. */
	good: HomeGood | undefined;
	/** Whether the file on screen came from a token. Typing never moves the editor's view. */
	fromToken: boolean;
	/** Counts each start over, so the conversation starts over with the agent. */
	runs: number;
	/** Whether the file and the conversation are as the page gave them: nothing to start over. */
	isFresh: boolean;
};

/** The goals screen's agent, outside React: the tokens, the editor and the stage all read it. */
export function createHomeAgentStore() {
	const listeners = new Set<() => void>();
	const origin = compileHomeAgent(createHomeAgent());
	/** The file the page starts with. */
	const start = origin.ok ? origin.source : undefined;
	let hasTalked = false;
	const settle = (
		agent: HomeAgent,
		before: HomeAgentState | undefined,
		fromToken: boolean,
		compiled = compileHomeAgent(agent),
	): HomeAgentState => {
		return {
			agent,
			compiled,
			good: compiled.ok ? compiled : before?.good,
			fromToken,
			runs: before?.runs ?? 0,
			isFresh: !hasTalked && compiled.ok && compiled.source === start,
		};
	};
	let state = settle(createHomeAgent(), undefined, false, origin);
	const set = (next: HomeAgentState) => {
		state = next;
		for (const listener of listeners) listener();
	};
	return {
		get: () => state,
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		toggle: (id: GoalTokenId) => {
			set(settle(toggleToken(state.agent, id), state, true));
		},
		/** A change from the studio's form. */
		edit: (change: DraftEdit) => {
			set(settle(editHomeDraft(state.agent, change), state, false));
		},
		read: (text: string): CodeApply => {
			const { agent, errors, spans } = readHomeSource(state.agent, text);
			if (!errors.length) set(settle(agent, state, false));
			return { errors, spans };
		},
		/** The visitor sent something: the conversation is theirs now. */
		talked: () => {
			if (hasTalked) return;
			hasTalked = true;
			set({ ...state, isFresh: false });
		},
		startOver: () => {
			hasTalked = false;
			set({ ...settle(createHomeAgent(), undefined, true), runs: state.runs + 1 });
		},
	};
}

export type HomeAgentStore = ReturnType<typeof createHomeAgentStore>;
