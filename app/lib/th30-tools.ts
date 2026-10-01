/** Tools th30 calls that run in the browser: the playground registers them while it is mounted. */
export const TH30_CLIENT_TOOLS = [
	'playgroundState',
	'playgroundSection',
	'newAgent',
	'setProfileType',
	'editSection',
	'includeSection',
	'excludeSection',
	'addModel',
	'removeModel',
	'addTool',
	'removeTool',
	'openKeys',
	'tryAgent',
	'newConversation',
	'launchAgent',
	'exportAgent',
] as const;

export type Th30ClientTool = (typeof TH30_CLIENT_TOOLS)[number];

export function isTh30ClientTool(name: string): name is Th30ClientTool {
	return (TH30_CLIENT_TOOLS as readonly string[]).includes(name);
}

/** Runs one call; the result goes back to th30 as the tool's output. */
export type Th30ToolHandler = (args: Record<string, unknown>, callId: string) => Promise<unknown>;
export type Th30ToolSet = Record<Th30ClientTool, Th30ToolHandler>;

let handlers: Th30ToolSet | null = null;
const mountWaiters = new Set<() => void>();

/** The playground registers its handlers while mounted; the returned function removes them. */
export function registerTh30Tools(next: Th30ToolSet): () => void {
	handlers = next;
	for (const waiter of [...mountWaiters]) waiter();
	return () => {
		if (handlers === next) handlers = null;
	};
}

export function getTh30Tool(name: Th30ClientTool): Th30ToolHandler | undefined {
	return handlers?.[name];
}

/** Resolves once handlers are registered, or `false` after `ms`. */
export function waitForTh30Tools(ms: number): Promise<boolean> {
	if (handlers) return Promise.resolve(true);
	return new Promise((resolve) => {
		const done = (found: boolean) => {
			window.clearTimeout(timer);
			mountWaiters.delete(onMount);
			resolve(found);
		};
		const onMount = () => {
			done(true);
		};
		const timer = window.setTimeout(() => {
			done(false);
		}, ms);
		mountWaiters.add(onMount);
	});
}

type NoteListener = (line: string) => void;
const noteListeners = new Set<NoteListener>();

/** A `(state)` line for th30 to read silently: what changed on the page that it didn't do itself. */
export function emitTh30Note(line: string) {
	for (const listener of noteListeners) listener(line);
}

export function onTh30Note(listener: NoteListener): () => void {
	noteListeners.add(listener);
	return () => {
		noteListeners.delete(listener);
	};
}

let stateLine: (() => string | null) | null = null;

/** The playground tells the dock how to sum up the build, for the cue a reconnecting call opens with. */
export function setTh30StateLine(read: (() => string | null) | null) {
	stateLine = read;
}

export function th30StateLine(): string | null {
	return stateLine?.() ?? null;
}
