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
		const line = lines[index] ?? '';
		const [, indent = '', key = '', bracket] = OPENER.exec(line) ?? [];
		if (bracket !== '{' && bracket !== '[') {
			folded.push(line);
			continue;
		}
		const close = `${indent}${CLOSES[bracket]}`;
		const end = lines.findIndex((each, at) => at > index && each.startsWith(close));
		const after = lines[end]?.slice(close.length) ?? '';
		// why: What holds one line shows it on its own, as a short object prints.
		const only = end === index + 2 ? lines[index + 1]?.trim().replace(/,$/, '') : undefined;
		if (!OPEN.has(key) && only !== undefined && !OPENER.test(lines[index + 1] ?? '')) {
			folded.push(`${indent}${key}: ${bracket} ${only} ${CLOSES[bracket]}${after}`);
			index = end;
			continue;
		}
		if (OPEN.has(key)) {
			folded.push(line);
			continue;
		}
		folded.push(`${indent}${key}: ${bracket} … ${CLOSES[bracket]}${after}`);
		index = end < 0 ? lines.length : end;
	}
	return folded;
}
