import type { CompiledPlayground } from '@theoremjs/playground';

const PACKAGES = [
	'@theoremjs/agents',
	'@theoremjs/react',
	'zod',
	'react',
	'react-dom',
	'@astryxdesign/core',
	'@stylexjs/stylex',
];

const INSTALL = `npm install ${PACKAGES.join(' ')}`;

/** Where the host mounts `createTheoremHandler`; `TheoremChat`'s default endpoint. */
const ENDPOINT = '/api/theorem';

/** Where the host mounts `createTheoremDecisionHandler`; `TheoremDecision`'s default endpoint. */
const DECISION_ENDPOINT = '/api/decision';

/** Where the host mounts `createTheoremHostHandler`; `TheoremHost`'s default endpoint. */
const HOST_ENDPOINT = '/api/host';

/** Turn profiles run through `createTheoremHandler`; live profiles run through a relay. */
function servesTurns({ profile }: CompiledPlayground): boolean {
	return profile.type !== 'live' && profile.type !== 'decision' && profile.type !== 'host';
}

/** A host: the profile and its tools, the route that runs them, and the console that calls them. */
function hostBundle(compiled: CompiledPlayground, source: string): string {
	return `${[
		'/**',
		` * ${compiled.agentId}, exported from the Theorem Playground.`,
		' *',
		' * One file in three parts; split it along the ─── lines before you ship:',
		' *   1. agent.ts         server only: the profile and its tools.',
		` *   2. host.ts          server only: the route that runs them, at ${HOST_ENDPOINT}.`,
		' *   3. AgentHost.tsx    the browser: a form per tool and its result.',
		' * Parts 1 and 2 read your tool keys; nothing in them may reach the browser.',
		' *',
		` *   ${INSTALL}`,
		' */',
		'',
		'// ─── 1. agent.ts (server only) ───',
		'',
		source.trimEnd(),
		'',
		'// ─── 2. host.ts (server only) ───',
		'',
		"import { createTheoremHostHandler } from '@theoremjs/react/server';",
		'',
		`/** Mount at ${HOST_ENDPOINT}/*: it describes the tools, and answers /call and /invoke. No model runs. */`,
		'export const host = createTheoremHostHandler({ profile });',
		'',
		'// ─── 3. AgentHost.tsx (browser) ───',
		'',
		"import { TheoremHost } from '@theoremjs/react/ui';",
		'',
		'export function AgentHost() {',
		`  return <TheoremHost endpoint="${HOST_ENDPOINT}" />;`,
		'}',
	].join('\n')}\n`;
}

/** The host bundle with a brief for a coding agent. */
function hostBrief(compiled: CompiledPlayground, source: string): string {
	const tools = compiled.customTools.map((tool) => `\`${tool.name}\``);
	return `# Add the Theorem host \`${compiled.agentId}\` to this app

The code below was exported from the Theorem Playground. It defines a host profile: a governed set of tools${
		tools.length ? ` (${tools.join(', ')})` : ''
	} that runs no model, a server route that calls them under the profile's permissions and guardrails, and a package-prepared console for trying them. Wire it into this codebase.

## Before you write code, ask me
- Who calls the tools: a person in \`TheoremHost\` (part 3), an MCP client, or my own code, which then drops part 3.
- Which framework this app uses, and where server routes live (so the handler mounts at \`${HOST_ENDPOINT}\`, or the path you pick).
- Where each tool's keys come from, if any need them.
- Who may call the route, and how often.

## Install
\`\`\`bash
${INSTALL}
\`\`\`

## Do
- Keep the tools and their keys on the server: the browser sends only a tool's name and input.
- Rate-limit the route per user or address.

## Don't
- Don't import \`agent.ts\` or \`host.ts\` from browser code, or put a key in a \`VITE_\`, \`NEXT_PUBLIC_\` or other client variable.

## The export
\`\`\`tsx
${hostBundle(compiled, source).trimEnd()}
\`\`\`
`;
}

/** A decision: the profile and its questions, the route that answers them, and the page that asks. */
function decisionBundle(compiled: CompiledPlayground, source: string): string {
	const provider =
		compiled.profile.type === 'decision'
			? Object.values(compiled.profile.models)[0]?.provider
			: 'typesafe';
	const keyName = provider === 'openrouter' ? 'OPENROUTER_API_KEY' : 'TYPESAFE_API_KEY';
	return `${[
		'/**',
		` * ${compiled.agentId}, exported from the Theorem Playground.`,
		' *',
		' * One file in three parts; split it along the ─── lines before you ship:',
		' *   1. agent.ts          server only: the profile and the questions it asks.',
		` *   2. decision.ts       server only: the route that answers them, at ${DECISION_ENDPOINT}.`,
		' *   3. AgentDecision.tsx the browser: the state field and the answers.',
		` * Parts 1 and 2 read your ${provider === 'openrouter' ? 'OpenRouter' : 'TypeSafe'} key; nothing in them may reach the browser.`,
		' *',
		` *   ${INSTALL}`,
		' */',
		'',
		'// ─── 1. agent.ts (server only) ───',
		'',
		source.trimEnd(),
		'',
		'// ─── 2. decision.ts (server only) ───',
		'',
		"import { createTheoremDecisionHandler } from '@theoremjs/react/server';",
		'',
		`/** Mount at ${DECISION_ENDPOINT} and ${DECISION_ENDPOINT}/decide. The questions stay here; the browser sends only the state. */`,
		'export const decision = createTheoremDecisionHandler({',
		'  profile,',
		'  questions,',
		`  apiKey: process.env.${keyName},`,
		'});',
		'',
		'// ─── 3. AgentDecision.tsx (browser) ───',
		'',
		"import { TheoremDecision } from '@theoremjs/react/ui';",
		'',
		'export function AgentDecision() {',
		`  return <TheoremDecision endpoint="${DECISION_ENDPOINT}" />;`,
		'}',
	].join('\n')}\n`;
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
	if (compiled.profile.type === 'decision') return decisionBundle(compiled, source);
	if (compiled.profile.type === 'host') return hostBundle(compiled, source);
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
					' * through your own relay (see @theoremjs/react/live).',
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
			"import { createTheoremHandler } from '@theoremjs/react/server';",
			'',
			`/** Mount at ${ENDPOINT}/*: it answers /turn, /invoke and /steer. */`,
			'export const theorem = createTheoremHandler({',
			'  profile,',
			`  provider: ${providerSource(compiled)},`,
			'});',
			'',
			'// ─── 3. AgentChat.tsx (browser) ───',
			'',
			"import { TheoremChat } from '@theoremjs/react/ui';",
			'',
			'export function AgentChat() {',
			`  return <TheoremChat endpoint="${ENDPOINT}" />;`,
			'}',
		);
	}
	return `${parts.join('\n')}\n`;
}

/** The decision bundle with a brief for a coding agent. */
function decisionBrief(compiled: CompiledPlayground, source: string): string {
	const provider =
		compiled.profile.type === 'decision'
			? Object.values(compiled.profile.models)[0]?.provider
			: 'typesafe';
	const providerName = provider === 'openrouter' ? 'OpenRouter' : 'TypeSafe';
	return `# Add the Theorem decision \`${compiled.agentId}\` to this app

The code below was exported from the Theorem Playground. It defines a decision profile that asks a ${providerName} model a fixed set of questions about a piece of JSON state, a server route that answers them, and a package-prepared user interface for trying it. Wire it into this codebase.

## Before you write code, ask me
- Where the state comes from: typed by a person in \`TheoremDecision\` (part 3), or built by my own code, which then calls \`runDecision\` from \`@theoremjs/agents\` on the server and drops parts 2 and 3.
- Which framework this app uses, and where server routes live (so the handler mounts at \`${DECISION_ENDPOINT}\`, or the path you pick).
- Where the ${providerName} key comes from: an environment variable or a secrets manager.
- Who may call the route, and how many decisions each caller may make: every decision spends the key.

## Install
\`\`\`bash
${INSTALL}
\`\`\`

## Do
- Read the key on the server only.
- Keep the questions on the server: the browser sends only the state, so no one can spend the key on questions of their own.
- Rate-limit the route per user or address.

## Don't
- Don't import \`agent.ts\` or \`decision.ts\` from browser code, or put the key in a \`VITE_\`, \`NEXT_PUBLIC_\` or other client variable.
- Don't log the state if it can hold personal data.

## The export
\`\`\`tsx
${exportBundle(compiled, source).trimEnd()}
\`\`\`
`;
}

/** The bundle with a brief for a coding agent: what to ask, what to install, where each part goes. */
export function llmBrief(compiled: CompiledPlayground, source: string): string {
	if (compiled.profile.type === 'decision') return decisionBrief(compiled, source);
	if (compiled.profile.type === 'host') return hostBrief(compiled, source);
	const turns = servesTurns(compiled);
	const tools = compiled.customTools.map((tool) => `\`${tool.name}\``);
	return `# Add the Theorem agent \`${compiled.agentId}\` to this app

The code below was exported from the Theorem Playground. It defines a ${compiled.profile.type} agent profile${
		turns
			? ', a server route that runs it, and a package-prepared user interface that talks to that route'
			: ''
	}. Wire it into this codebase.

## Before you write code, ask me${
		turns
			? `
- Whether I want a UI at all, since the answer decides what you install and build:
  - The package-prepared user interface (\`TheoremChat\`, part 3 of the export);
  - my own UI on \`useTheoremChat\` from \`@theoremjs/react\`, which gives the conversation state without the styling;
  - or none: my server code calls \`runTurn\` from \`@theoremjs/agents\` directly, and parts 2 and 3 are dropped.`
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
- No UI: \`npm install @theoremjs/agents zod\`
- My own UI: \`npm install @theoremjs/agents @theoremjs/react zod react react-dom\`
- The package-prepared user interface: \`${INSTALL}\``
		: `\`\`\`bash
${INSTALL}
\`\`\``
}

## Organise it
- \`agent.ts\` (server only): the profile, its tools and output schema, as exported. One module, so the profile has one source of truth.${
		turns
			? `
- \`theorem.ts\` (server only): \`createTheoremHandler\`, mounted so every path under \`${ENDPOINT}\` reaches it.
- \`AgentChat.tsx\` (browser), only if I want a UI: \`TheoremChat\` from \`@theoremjs/react/ui\`, or my own component on \`useTheoremChat\`, pointed at that route.
- With no UI, skip both and call \`runTurn\` from server code that imports \`agent.ts\`.`
			: `
- A relay you host for the live session, and \`LiveRunner\` from \`@theoremjs/react/live\` in the browser.`
	}

## Do
- Read model keys on the server only, from the environment or a secrets manager.
- Keep \`registerProfile\`, \`registerTool\` and the handler in server-only modules; the browser imports only \`@theoremjs/react\`, \`/ui\` or \`/live\`.
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
