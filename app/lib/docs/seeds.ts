/**
 * Studio cookbooks and slices compiled into docs snippets. Same omit-strip path as the
 * studio — never hand-type defineProfile with materialised defaults.
 */

import {
	compileStudio,
	createConsoleExampleDraft,
	createExampleDraft,
	createGeminiEmbeddingExampleDraft,
	createLiveExampleDraft,
	createNarratorExampleDraft,
	createPageReaderExampleDraft,
	createResearchScoutDraft,
	ON_OWN_KEYS,
	RESEARCH_FIRST_TURN_PROMPT,
	readStudioSource,
	resolveCookbookSlice,
	type StudioDraft,
	studioSource,
} from '@theoremjs/studio';
import type { StudioSeedId } from './schema';

/** The research scout pared to two tools for the `firstTurn` program. */
function firstTurnDraft(): StudioDraft {
	const scout = createResearchScoutDraft();
	return {
		...scout,
		// why: A line that reads a slot needs a turn that chooses it, and this program chooses none.
		identity: { ...scout.identity, system: scout.identity.system.slice(0, 1) },
		inputs: { ...scout.inputs, slots: [] },
		tools: { ...scout.tools, parallel: false },
		toolSpecs: scout.toolSpecs
			.filter(({ toolName }) => toolName === 'search_github' || toolName === 'search_web')
			.map(({ stageAgentKey: _stage, headersJson: _headers, ...tool }) => tool),
		outputs: {
			...scout.outputs,
			mode: 'text',
			schemaId: '',
			schemaJson: '',
			validationEnabled: false,
			itemRules: {},
		},
	};
}

/** A compiled text profile with a `runTurn` entrypoint, and the way back to the profile alone. */
function turnDoor(exportName: string, prompt: string, keySlot: string) {
	const wrap = (source: string, profileId: string): string => {
		const imports = source.replace(
			/import \{\n((?: {2}\w+,\n)+)\} from '@theoremjs\/agents';/,
			(_match, names: string) => {
				const have = new Set(
					[...names.matchAll(/ {2}(\w+),/g)].map((row) => row[1]).filter(Boolean),
				);
				for (const name of ['runTurn']) have.add(name);
				const list = [...have].map((name) => `  ${name},`).join('\n');
				return `import {\n${list}\n} from '@theoremjs/agents';`;
			},
		);
		if (imports === source) {
			throw new Error(`DOCS_SEEDS.${exportName}: could not patch @theoremjs/agents imports`);
		}
		return `${imports}
export async function ${exportName}(apiKey: string) {
  const hostOptions = {
    vault: { ${keySlot}: apiKey },
  };

  for await (const event of runTurn(
    {
      profile: ${JSON.stringify(profileId)},
      input: {
        text: ${JSON.stringify(prompt)},
      },
    },
    hostOptions,
  )) {
    if (event.type === 'text') process.stdout.write(event.text);
  }
}
`;
	};
	const unwrap = (text: string): string => text.split(`export async function ${exportName}(`)[0];
	return { wrap, unwrap };
}

const asIs = { wrap: (source: string): string => source, unwrap: (text: string): string => text };

/** Each seed's studio draft, the question its program asks, and how its compiled profile is wrapped for the docs fence. */
const SEEDS: Record<
	StudioSeedId,
	{
		draft: () => StudioDraft;
		question: string;
		wrap: (source: string, profileId: string) => string;
		unwrap: (text: string) => string;
	}
> = {
	firstTurn: {
		draft: firstTurnDraft,
		question: RESEARCH_FIRST_TURN_PROMPT,
		...turnDoor('firstTurn', RESEARCH_FIRST_TURN_PROMPT, 'openrouter'),
	},
	research: {
		draft: createResearchScoutDraft,
		question: RESEARCH_FIRST_TURN_PROMPT,
		...turnDoor('runResearchScout', RESEARCH_FIRST_TURN_PROMPT, 'openrouter'),
	},
	concierge: {
		draft: createExampleDraft,
		question: 'Plan two days in Lisbon in March.',
		...asIs,
	},
	architect: {
		draft: createExampleDraft,
		question: 'Compare Cloudflare Workers and AWS Lambda cold starts.',
		...asIs,
	},
	'live-concierge': {
		draft: createLiveExampleDraft,
		question: '',
		...asIs,
	},
	decision: {
		draft: createPageReaderExampleDraft,
		question: '',
		...asIs,
	},
	'gemini-embedding-2': {
		draft: createGeminiEmbeddingExampleDraft,
		question: '',
		...asIs,
	},
	narrator: {
		draft: createNarratorExampleDraft,
		question: 'Welcome to the research briefing.',
		...asIs,
	},
	console: {
		draft: createConsoleExampleDraft,
		question: '',
		...asIs,
	},
};

/** The question the seed's program asks, for the studio composer to start with. */
export function docsSeedQuestion(seed: StudioSeedId): string {
	return SEEDS[seed].question;
}

export function docsSeedDraft(seed: StudioSeedId): StudioDraft {
	return SEEDS[seed].draft();
}

/** A draft of the seed as its docs program, or what stops it compiling. */
export function seedProgram(seed: StudioSeedId, draft: StudioDraft) {
	const compiled = compileStudio(draft, ON_OWN_KEYS);
	if (!compiled.ok) return { ok: false as const, issues: compiled.issues };
	return {
		ok: true as const,
		code: SEEDS[seed].wrap(studioSource(compiled), compiled.agentId),
	};
}

/** The seed's docs program read back into a draft, the door around it set aside. */
export function readSeedProgram(seed: StudioSeedId, text: string, draft: StudioDraft) {
	return readStudioSource(SEEDS[seed].unwrap(text), draft);
}

export function compileSeedSource(seed: StudioSeedId): string {
	const program = seedProgram(seed, docsSeedDraft(seed));
	if (!program.ok) {
		const issues = program.issues.map((issue) => issue.message).join('; ');
		throw new Error(`DOCS_SEEDS.${seed} failed to compile: ${issues}`);
	}
	return program.code;
}

/** Resolves an atomic cookbook slice (`<cookbook>:profile:<agentId>#<fields>` or `<cookbook>:tool:<name>#<fields>`). */
export function compileSliceSource(sliceSpec: string): string {
	return resolveCookbookSlice(sliceSpec);
}
