/**
 * What lets th30 build an agent in the playground: tools the visitor's browser answers (the draft
 * lives there), and the prompt that says how to use them. `goTo` is a server tool the dock acts on.
 */
import { registerTool } from '@theoremjs/agents';
import { browserToolHandler } from '@theoremjs/playground/browser';
import { z } from 'zod';

const basedOn = z
	.number()
	.int()
	.optional()
	.describe('The revision you last read. A newer one means the visitor edited; nothing applies.');
const nodeId = z
	.string()
	.describe(
		'A section id from playgroundState: identity, models, modelBinding:<key>, toolSpec:<key>, …',
	);

/** The browser answers with a result or a refusal; the shape is the page's, so it is not narrowed here. */
const answer = z.record(z.string(), z.unknown());

type BrowserTool = {
	name: string;
	description: string;
	input: z.ZodType;
};

const BROWSER_TOOLS: BrowserTool[] = [
	{
		name: 'playgroundState',
		description:
			'Read the agent the visitor is building: revision, type, handle, the sections it has and can add, key slots (filled or not), and the issues blocking a run. Call it before editing and after any failure.',
		input: z.object({}),
	},
	{
		name: 'playgroundSection',
		description:
			'Read one section in full: its values, what each setting means and the options it takes, and that section’s issues. Read a section before you edit it.',
		input: z.object({ nodeId }),
	},
	{
		name: 'newAgent',
		description:
			'Start a new agent, replacing the draft (the visitor can undo). Ask first if the visitor changed the current one. `intent` is a short key for this request so a repeat applies once.',
		input: z.object({
			type: z.enum(['text', 'image', 'speech', 'live']).describe('The agent type'),
			example: z.enum(['travel', 'span']).optional().describe('Start from a worked example'),
			intent: z.string().describe('A short key for this request, e.g. "image-agent"'),
			basedOn,
		}),
	},
	{
		name: 'setProfileType',
		description: 'Change the type of the current agent; sections the new type adds are turned on.',
		input: z.object({ type: z.enum(['text', 'image', 'speech', 'live']), basedOn }),
	},
	{
		name: 'editSection',
		description:
			'Change settings in one section. `changes` maps a setting to its new value; use dotted paths for nested ones ("include.usage"). Unknown or mistyped settings are rejected one by one while the rest apply. Never put a key in here.',
		input: z.object({ nodeId, changes: z.record(z.string(), z.unknown()), basedOn }),
	},
	{
		name: 'includeSection',
		description: 'Turn on an optional section listed under canAdd in playgroundState.',
		input: z.object({ section: z.string(), basedOn }),
	},
	{
		name: 'excludeSection',
		description: 'Turn off an optional section.',
		input: z.object({ section: z.string(), basedOn }),
	},
	{
		name: 'addModel',
		description: 'Add a model to the agent; the first one becomes the default.',
		input: z.object({
			modelId: z.string().optional().describe('Your name for it'),
			provider: z.string().optional(),
			apiId: z.string().optional().describe('The provider’s model id'),
			basedOn,
		}),
	},
	{
		name: 'removeModel',
		description: 'Remove a model by its modelId.',
		input: z.object({ modelId: z.string(), basedOn }),
	},
	{
		name: 'addTool',
		description: 'Add a tool to the agent, for types that take tools.',
		input: z.object({
			toolName: z.string().optional(),
			description: z.string().optional(),
			basedOn,
		}),
	},
	{
		name: 'removeTool',
		description: 'Remove a tool by its name.',
		input: z.object({ toolName: z.string(), basedOn }),
	},
	{
		name: 'openKeys',
		description:
			'Open the keys panel so the visitor can paste a key. You never see a key; the result says only which slots are filled.',
		input: z.object({}),
	},
	{
		name: 'tryAgent',
		description:
			'Send one message to the agent in the preview and get its reply (text; media is described, never sent). Only when the agent compiles. Waits up to a minute.',
		input: z.object({ message: z.string() }),
	},
	{
		name: 'newConversation',
		description: 'Clear the preview conversation. The agent stays.',
		input: z.object({}),
	},
	{
		name: 'launchAgent',
		description: 'Open the agent in its own tab. Only when it compiles.',
		input: z.object({}),
	},
	{
		name: 'exportAgent',
		description:
			'Export the agent: "tsx" downloads code, "copy" copies it, "llm" copies a brief for a coding model.',
		input: z.object({ format: z.enum(['tsx', 'copy', 'llm']) }),
	},
];

const goToTool = {
	type: 'function' as const,
	name: 'goTo',
	description: 'Take the visitor to the home page, the docs, or the playground.',
	category: 'ui',
	access: 'read-only' as const,
	paths: ['*'],
	loadTier: 'T0' as const,
	permission: 'auto' as const,
	input: z.object({ page: z.enum(['home', 'docs', 'playground']) }),
	output: z.object({ success: z.boolean(), page: z.string() }),
	handler: (input: { page: string }) => ({ success: true, page: input.page }),
};

export const TH30_BUILDER_TOOL_IDS = [...BROWSER_TOOLS.map((tool) => tool.name), 'goTo'];

export function registerTh30BuilderTools(): void {
	for (const tool of BROWSER_TOOLS) {
		registerTool({
			type: 'function' as const,
			name: tool.name,
			description: tool.description,
			category: 'playground',
			access: 'read-only' as const,
			paths: ['*'],
			loadTier: 'T0' as const,
			permission: 'auto' as const,
			input: tool.input,
			output: answer,
			handler: browserToolHandler(tool.name),
		});
	}
	registerTool(goToTool);
}

export const TH30_BUILDER_PROMPT = `Building an agent. On the playground you can build the visitor's agent with them, using the playground tools. The visitor sees every change land.
- Ask at most 3 short questions (what it does, which type, which model), then build. Narrate in a few words, never field by field.
- Start from playgroundState. Read a section with playgroundSection before you edit it. Fix the issues playgroundState lists; an agent runs only when it has none.
- Pass basedOn with the revision you last read. If a call comes back changed, the visitor edited: read playgroundState before you go on.
- Never say a change is done unless the result says applied: true. If rejected lists settings, say which were refused and why.
- After any error, timeout, changed, or not_on_playground, call playgroundState first. Never retry blind.
- newAgent replaces the draft: ask first if the visitor has changed the current one.
- Never ask for or repeat a key. Call openKeys and let them paste it.
- When the agent compiles, offer to try it, then call tryAgent with their message and tell them what came back.
- To explain a setting, searchDocs it first. goTo takes the visitor to the home page, the docs or the playground.
- A line starting "(state)" is a silent note about what changed on the page. It is background; never read it out. If it says something you did applied late or was cancelled, tell the visitor once, in a few words.`;
