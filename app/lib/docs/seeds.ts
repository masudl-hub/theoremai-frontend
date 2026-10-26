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
	createResearchScoutDraft,
	createSpanExampleDraft,
	decisionExampleDraft,
	ON_OWN_KEYS,
	RESEARCH_FIRST_TURN_PROMPT,
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

/** Wraps a compiled text profile with a `runTurn` entrypoint. */
function withTurnDoor(exportName: string, prompt: string, keySlot = 'gemini') {
	return (source: string, profileId: string): string => {
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
}

const asIs = (source: string): string => source;

/** Each seed's studio draft, the question its program asks, and how its compiled profile is wrapped for the docs fence. */
const SEEDS: Record<
	StudioSeedId,
	{
		draft: () => StudioDraft;
		question: string;
		wrap: (source: string, profileId: string) => string;
	}
> = {
	firstTurn: {
		draft: firstTurnDraft,
		question: RESEARCH_FIRST_TURN_PROMPT,
		wrap: withTurnDoor('firstTurn', RESEARCH_FIRST_TURN_PROMPT, 'gemini'),
	},
	research: {
		draft: createResearchScoutDraft,
		question: RESEARCH_FIRST_TURN_PROMPT,
		wrap: withTurnDoor('runResearchScout', RESEARCH_FIRST_TURN_PROMPT, 'gemini'),
	},
	concierge: {
		draft: createExampleDraft,
		question: 'Plan two days in Lisbon in March.',
		wrap: asIs,
	},
	architect: {
		draft: createExampleDraft,
		question: 'Compare Cloudflare Workers and AWS Lambda cold starts.',
		wrap: asIs,
	},
	'live-concierge': {
		draft: createLiveExampleDraft,
		question: '',
		wrap: asIs,
	},
	decision: {
		draft: () => decisionExampleDraft(),
		question: '',
		wrap: asIs,
	},
	'span-decision': {
		draft: createSpanExampleDraft,
		question: '',
		wrap: asIs,
	},
	'gemini-embedding-2': {
		draft: createGeminiEmbeddingExampleDraft,
		question: '',
		wrap: asIs,
	},
	narrator: {
		draft: createNarratorExampleDraft,
		question: 'Welcome to the research briefing.',
		wrap: asIs,
	},
	console: {
		draft: createConsoleExampleDraft,
		question: '',
		wrap: asIs,
	},
};

/** The question the seed's program asks, for the studio composer to start with. */
export function docsSeedQuestion(seed: StudioSeedId): string {
	return SEEDS[seed].question;
}

export function docsSeedDraft(seed: StudioSeedId): StudioDraft {
	return SEEDS[seed].draft();
}

export function compileSeedSource(seed: StudioSeedId): string {
	const compiled = compileStudio(docsSeedDraft(seed), ON_OWN_KEYS);
	if (!compiled.ok) {
		const issues = compiled.issues.map((issue) => issue.message).join('; ');
		throw new Error(`DOCS_SEEDS.${seed} failed to compile: ${issues}`);
	}
	const { wrap } = SEEDS[seed];
	return wrap(studioSource(compiled), compiled.agentId);
}

/** Resolves an atomic cookbook slice (`<cookbook>:profile:<agentId>#<fields>` or `<cookbook>:tool:<name>#<fields>`). */
export function compileSliceSource(sliceSpec: string): string {
	return resolveCookbookSlice(sliceSpec);
}
