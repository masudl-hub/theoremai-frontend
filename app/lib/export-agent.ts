import type { CompiledPlayground } from '@theoremai/playground';

const PACKAGES = [
	'@theoremai/agents',
	'@theoremai/react',
	'zod',
	'react',
	'react-dom',
	'@astryxdesign/core',
	'@astryxdesign/theme-neutral',
	'@stylexjs/stylex',
];

const INSTALL = `npm install ${PACKAGES.join(' ')}`;

/** Where the host mounts `createTheoremHandler`; `TheoremChat`'s default endpoint. */
const ENDPOINT = '/api/theorem';

/** Turn profiles run through `createTheoremHandler`; live profiles run through a relay. */
function servesTurns({ profile }: CompiledPlayground): boolean {
	return profile.type !== 'live';
}

/** The provider options the handler needs, each key read from the server's environment. */
function providerSource({ profile }: CompiledPlayground): string {
	const json = JSON.stringify(profile);
	const parts: string[] = [];
	if (json.includes('"provider":"google"')) {
		parts.push(
			'gemini: { vault: { slotA: process.env.GEMINI_API_KEY, slotB: undefined, slotC: undefined, paid: undefined } }',
		);
	}
	if (json.includes('"provider":"openrouter"')) {
		parts.push('openAiGateway: { apiKey: process.env.OPENROUTER_API_KEY }');
	}
	if (json.includes('"provider":"local"')) {
		parts.push("local: { baseUrl: process.env.LOCAL_MODEL_URL ?? 'http://127.0.0.1:11434' }");
	}
	return `{\n${parts.map((part) => `    ${part},`).join('\n')}\n  }`;
}

/** The agent as one `.tsx`: the profile, the route, and the chat, marked where to split. */
export function exportBundle(compiled: CompiledPlayground, source: string): string {
	const turns = servesTurns(compiled);
	const header = [
		'/**',
		` * ${compiled.agentId}, exported from the Theorem Playground.`,
		' *',
		...(turns
			? [
					' * One file in three parts; split it along the ─── lines before you ship:',
					' *   1. agent.ts       server only: the profile and its tools.',
					` *   2. theorem.ts     server only: the route the chat talks to, at ${ENDPOINT}.`,
					' *   3. AgentChat.tsx  the browser: the chat, pointed at that route.',
					' * Parts 1 and 2 read your model keys; nothing in them may reach the browser.',
				]
			: [
					` * A ${compiled.profile.type} profile: register it on your server, then run it`,
					' * through your own relay (see @theoremai/react/live).',
				]),
		' *',
		` *   ${INSTALL}`,
		' */',
	].join('\n');
	const parts = [header, '', '// ─── 1. agent.ts (server only) ───', '', source.trimEnd()];
	if (turns) {
		parts.push(
			'',
			'// ─── 2. theorem.ts (server only) ───',
			'',
			"import { createTheoremHandler } from '@theoremai/react/server';",
			'',
			`/** Mount at ${ENDPOINT}/*: it answers /turn, /invoke and /steer. */`,
			'export const theorem = createTheoremHandler({',
			'  profile,',
			`  provider: ${providerSource(compiled)},`,
			'});',
			'',
			'// ─── 3. AgentChat.tsx (browser) ───',
			'',
			"import { TheoremChat } from '@theoremai/react/ui';",
			'',
			'export function AgentChat() {',
			`  return <TheoremChat endpoint="${ENDPOINT}" />;`,
			'}',
		);
	}
	return `${parts.join('\n')}\n`;
}

/** The bundle with a brief for a coding agent: what to ask, what to install, where each part goes. */
export function llmBrief(compiled: CompiledPlayground, source: string): string {
	const turns = servesTurns(compiled);
	const tools = compiled.customTools.map((tool) => `\`${tool.name}\``);
	return `# Add the Theorem agent \`${compiled.agentId}\` to this app

The code below was exported from the Theorem Playground. It defines a ${compiled.profile.type} agent profile${
		turns ? ', a server route that runs it, and a ready-made chat that talks to that route' : ''
	}. Wire it into this codebase.

## Before you write code, ask me${
		turns
			? `
- Whether I want a UI at all, since the answer decides what you install and build:
  - Theorem's ready-made chat (\`TheoremChat\`, part 3 of the export);
  - my own UI on \`useTheoremChat\` from \`@theoremai/react\`, which gives the conversation state without the styling;
  - or none: my server code calls \`runTurn\` from \`@theoremai/agents\` directly, and parts 2 and 3 are dropped.`
			: ''
	}
- Which framework this app uses, and where server routes live (so the handler mounts at \`${ENDPOINT}\`, or the path you pick).
- Where model keys come from: environment variables, a secrets manager, or each user's own key.
- Who may use the agent: anyone, or only signed-in users (the handler takes a \`session\` resolver).
- Whether sessions must survive restarts or span several instances (then pass a shared \`sessionStore\`).${
		tools.length
			? `\n- What each tool should really do: ${tools.join(', ')} return stand-in data today. Where does the real data come from, and what credentials does each need?`
			: ''
	}
- If I want a UI: where it should appear, and whether it should match an existing theme.

## Install
${
	turns
		? `Install only what my answer about the UI needs:
- No UI: \`npm install @theoremai/agents zod\`
- My own UI: \`npm install @theoremai/agents @theoremai/react zod react react-dom\`
- Theorem's chat: \`${INSTALL}\``
		: `\`\`\`bash
${INSTALL}
\`\`\``
}

## Organise it
- \`agent.ts\` (server only): the profile, its tools and output schema, as exported. One module, so the profile has one source of truth.${
		turns
			? `
- \`theorem.ts\` (server only): \`createTheoremHandler\`, mounted so every path under \`${ENDPOINT}\` reaches it.
- \`AgentChat.tsx\` (browser), only if I want a UI: \`TheoremChat\` from \`@theoremai/react/ui\`, or my own component on \`useTheoremChat\`, pointed at that route.
- With no UI, skip both and call \`runTurn\` from server code that imports \`agent.ts\`.`
			: `
- A relay you host for the live session, and \`LiveRunner\` from \`@theoremai/react/live\` in the browser.`
	}

## Do
- Read model keys on the server only, from the environment or a secrets manager.
- Keep \`registerProfile\`, \`registerTool\` and the handler in server-only modules; the browser imports only \`@theoremai/react\`, \`/ui\` or \`/live\`.
- Replace each tool's stand-in handler with the real call; its input is already checked against the Zod schema given.
- Change the profile's settings in this one module, or in the playground and export again.

## Don't
- Don't import \`agent.ts\` or \`theorem.ts\` from browser code, or put a key in a \`VITE_\`, \`NEXT_PUBLIC_\` or other client variable.
- Don't log request bodies or tool credentials; the handler keeps credentials per session, off the wire.
- Don't copy the profile into several places.
- Don't turn off the profile's guardrails to make a test pass.

## The export
\`\`\`tsx
${exportBundle(compiled, source).trimEnd()}
\`\`\`
`;
}
