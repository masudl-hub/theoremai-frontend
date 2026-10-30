import {
	agentModulePath,
	compileWorkspace,
	ON_OWN_KEYS,
	type StudioWorkspace,
	workspaceSource,
} from '@theoremjs/studio';

/**
 * The sections the card keeps open: what the map draws from, and what the agent takes and how it
 * replies. Every other object or list folds.
 */
const OPEN = new Set(['models', 'tools', 'allow', 'inputs', 'attachments', 'outputs']);
/** A line that opens an object or a list under a key: its indent, its key, and the bracket. */
const OPENER = /^(\s+)('[^']*'|\w+): ([[{])$/;
const CLOSES = { '{': '}', '[': ']' } as const;

/** The profile module the studio writes for an agent of the workspace, as its lines. */
function profileModule(workspace: StudioWorkspace, agentKey: string): string[] {
	const compiled = compileWorkspace(workspace, ON_OWN_KEYS);
	const agent = workspace.agents.find((each) => each.key === agentKey);
	if (!compiled.ok || !agent) return [];
	const path = agentModulePath(agent.identity.agentId.trim());
	return (
		workspaceSource(compiled)
			.find((file) => file.path === path)
			?.code.split('\n') ?? []
	);
}

/**
 * An agent's profile module as an editor shows it folded: each object or list under a key folds to
 * one line, but the sections the card keeps open, and what holds one line shows it on the key's.
 */
export function foldedProfile(workspace: StudioWorkspace, agentKey: string): string[] {
	const lines = profileModule(workspace, agentKey);
	const folded: string[] = [];
	for (let index = 0; index < lines.length; index += 1) {
		const fold = foldAt(lines, index);
		if (!fold) {
			folded.push(lines[index] ?? '');
			continue;
		}
		folded.push(fold.text);
		index = fold.end;
	}
	return folded;
}

/** The fold of the object or list a line opens, through the line it ends on; none when it stays open. */
function foldAt(lines: string[], index: number): { text: string; end: number } | undefined {
	const [, indent = '', key = '', bracket] = OPENER.exec(lines[index] ?? '') ?? [];
	if ((bracket !== '{' && bracket !== '[') || OPEN.has(key)) return undefined;
	const close = `${indent}${CLOSES[bracket]}`;
	const end = lines.findIndex((each, at) => at > index && each.startsWith(close));
	const after = lines[end]?.slice(close.length) ?? '';
	const next = lines[index + 1] ?? '';
	// why: What holds one line shows it on its own, as a short object prints.
	if (end === index + 2 && !OPENER.test(next)) {
		return {
			text: `${indent}${key}: ${bracket} ${next.trim().replace(/,$/, '')} ${CLOSES[bracket]}${after}`,
			end,
		};
	}
	return {
		text: `${indent}${key}: ${bracket} … ${CLOSES[bracket]}${after}`,
		end: end < 0 ? lines.length : end,
	};
}
