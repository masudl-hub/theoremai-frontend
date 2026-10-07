/**
 * The prompt the docs landing copies, for a coding agent in the reader's own project. It points
 * the agent at these docs, makes it ask and plan before it builds, and keeps the package's own
 * rules (server-only keys, guardrails on, only fields the docs define) as the terms of the build.
 */
export function starterPrompt(origin: string): string {
	return `I want to add a Theorem agent to this project. Theorem is a TypeScript package: you write an agent once as a profile, and every turn runs from it.

Where to look. Read these before you write anything, and again when unsure:
- Docs: ${origin}/llms.txt lists every chapter. Each one is at ${origin}/docs/<slug>.md.
- Source and issues: https://github.com/masudl-hub/theoremai
- Packages: https://www.npmjs.com/package/@theoremjs%2Fagents, https://jsr.io/@theoremjs/agents and https://www.npmjs.com/package/@theoremjs%2Freact
- Ask the repo: https://deepwiki.com/masudl-hub/theoremai

Install what the build needs:
- \`npm install @theoremjs/agents zod\` is the agent: profiles, tools, guardrails and \`runTurn\`. \`zod\` checks tool input.
- If it needs a frontend, \`npm install @theoremjs/react react react-dom\` gives \`useTheoremChat\`, the conversation state for your own UI. The ready-made \`TheoremChat\` also needs \`@astryxdesign/core @stylexjs/stylex\`.

First, ask me what I'm building: the agent's purpose, who will use it, and the user stories it must serve. Then give me a plan, with the profile you propose and what each tool and guardrail is for, and wait for my yes before you change anything.

While you build: keep keys and the profile in server-only code, use only the profile fields the docs define, keep guardrails on, and make any tool that writes, spends or sends ask a person first. Run one turn, then tell me what you decided and what you couldn't check.
`;
}
