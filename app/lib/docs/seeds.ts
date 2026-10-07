/**
 * Playground drafts compiled into docs snippets. Same omit-strip path as the
 * playground — never hand-type defineProfile with materialised defaults.
 */

import {
	compilePlayground,
	createBlankDraft,
	defaultModelBinding,
	defaultToolSpec,
	demoToolSpecs,
	excludeFacet,
	type PlaygroundDraft,
	playgroundSource,
	setProfileType,
} from '@theoremjs/playground';
import type { PlaygroundSeedId } from './schema';

const HARBOR_SYSTEM = [
	'You are the Harbor front desk for shippers.',
	'Use a calm voice and short sentences. Give one clear next step.',
	'When a file is attached, say what you can use from it before you advise.',
	'Call harbor_holdStatus when the person names a shipment id.',
	'Call get_weather with the coordinates of a port when weather can delay a release.',
	'Call search_web for news about a port, such as a strike or a closure.',
	'If you cannot help, say so and offer a handoff to a person in operations.',
].join('\n');

const HARBOR_HOLD_INPUT = JSON.stringify({
	type: 'object',
	properties: { shipmentId: { type: 'string' } },
	required: ['shipmentId'],
});

const HARBOR_HOLD_OUTPUT = JSON.stringify({
	type: 'object',
	properties: {
		status: { type: 'string' },
		reason: { type: 'string' },
	},
	required: ['status', 'reason'],
});

const HARBOR_HOLD_STUB = JSON.stringify({
	status: 'hold',
	reason: 'Customs needs the commercial invoice PDF.',
});

const FIRST_TURN_PROMPT = [
	'Shipment H-1042 is on hold at Rotterdam (51.92, 4.48).',
	'What is the hold, and can the weather or news at the port delay the release?',
].join(' ');

function demoSpecs(...names: string[]) {
	const wanted = new Set(names);
	return demoToolSpecs()
		.filter((seed) => wanted.has(seed.data.toolName))
		.map((seed) => defaultToolSpec(seed.data));
}

/** The Harbor hold lookup: a function tool, Harbor's own code. */
function harborHoldToolSpec() {
	return defaultToolSpec({
		toolName: 'harbor_holdStatus',
		description: 'Look up why a Harbor shipment is on hold.',
		category: 'ops',
		access: 'read-only',
		permission: 'auto',
		loadTier: 'T0',
		paths: ['*'],
		inputJson: HARBOR_HOLD_INPUT,
		outputJson: HARBOR_HOLD_OUTPUT,
		stubOutputJson: HARBOR_HOLD_STUB,
	});
}

/** What the desk accepts in a turn: text, images and PDFs. */
function harborDeskInputs(): PlaygroundDraft['inputs'] {
	return {
		text: true,
		attachmentsAccept: ['image/*', 'application/pdf'],
		voiceAccept: [],
		maxFiles: 4,
		maxBytes: 5_000_000,
		maxTurnBytes: 12_000_000,
		limitsByMimeJson: '',
		slotsJson: '',
		contextFrom: [],
		contextMaxChars: null,
	};
}

/**
 * Harbor front desk — Getting started fence.
 * Guardrails stay omitted: resolve-on defaults. Authored `canary: true` would
 * materialise the omit path. Tool id is `harbor_holdStatus` (playground names
 * disallow dots).
 */
function firstTurnDraft(): PlaygroundDraft {
	let draft = setProfileType(createBlankDraft(), 'text');
	draft = excludeFacet(draft, 'observability');
	return {
		...draft,
		identity: {
			agentId: 'harbor.desk',
			profileType: 'text',
			handle: 'desk',
			system: HARBOR_SYSTEM,
			systemByRoleJson: '',
		},
		models: { ...draft.models, defaultModel: 'main', key: '' },
		modelBindings: [
			defaultModelBinding({
				modelId: 'main',
				protocol: 'openAi',
				provider: 'openrouter',
				apiId: 'openrouter/free',
				keySlot: 'openrouter',
			}),
		],
		// One tool of each kind: a function, an HTTP endpoint and an MCP server.
		toolSpecs: [harborHoldToolSpec(), ...demoSpecs('get_weather', 'search_web')],
		inputs: harborDeskInputs(),
		wording: {
			'error.auth': 'Sign in to Harbor to continue at the desk.',
		},
	};
}

/** Getting started wraps the compiled profile with createProvider + runTurn. */
function withFirstTurnDoor(source: string, profileId: string): string {
	const imports = source.replace(
		/import \{\n((?: {2}\w+,\n)+)\} from '@theoremjs\/agents';/,
		(_match, names: string) => {
			const have = new Set([...names.matchAll(/ {2}(\w+),/g)].map((row) => row[1]).filter(Boolean));
			for (const name of ['createProvider', 'runTurn']) have.add(name);
			const list = [...have].map((name) => `  ${name},`).join('\n');
			return `import {\n${list}\n} from '@theoremjs/agents';`;
		},
	);
	if (imports === source) {
		throw new Error('DOCS_SEEDS.firstTurn: could not patch @theoremjs/agents imports');
	}
	return `${imports}
export async function firstTurn(apiKey: string) {
  const provider = createProvider(profile, {
    vault: { openrouter: apiKey },
  });

  for await (const event of runTurn(
    {
      profile: ${JSON.stringify(profileId)},
      input: {
        text: ${JSON.stringify(FIRST_TURN_PROMPT)},
      },
    },
    provider,
  )) {
    if (event.type === 'text') process.stdout.write(event.text);
  }
}
`;
}

/** Each seed's playground draft, the question its program asks, and how its compiled profile is wrapped for the docs fence. */
const SEEDS: Record<
	PlaygroundSeedId,
	{
		draft: () => PlaygroundDraft;
		question: string;
		wrap: (source: string, profileId: string) => string;
	}
> = {
	firstTurn: { draft: firstTurnDraft, question: FIRST_TURN_PROMPT, wrap: withFirstTurnDoor },
};

/** The question the seed's program asks, for the playground composer to start with. */
export function docsSeedQuestion(seed: PlaygroundSeedId): string {
	return SEEDS[seed].question;
}

export function docsSeedDraft(seed: PlaygroundSeedId): PlaygroundDraft {
	return SEEDS[seed].draft();
}

export function compileSeedSource(seed: PlaygroundSeedId): string {
	const compiled = compilePlayground(docsSeedDraft(seed));
	if (!compiled.ok) {
		const issues = compiled.issues.map((issue) => issue.message).join('; ');
		throw new Error(`DOCS_SEEDS.${seed} failed to compile: ${issues}`);
	}
	const { wrap } = SEEDS[seed];
	return wrap(playgroundSource(compiled), compiled.agentId);
}
