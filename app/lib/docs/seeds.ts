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
	includeFacet,
	type PlaygroundDraft,
	playgroundSource,
	setProfileType,
} from '@theoremjs/playground';
import type { PlaygroundSeedId } from './schema';

const HARBOR_SYSTEM = [
	'You are Harbor front desk for shippers.',
	'Calm voice. Short sentences. One clear next step.',
	'When a file is attached, say what you can use from it before you advise.',
	'Call harbor_holdStatus when the person names a shipment id.',
	'For road legs between yards, call haversine_distance with the lat/lon pairs,',
	'then convert_units if they want miles. Estimate driving hours at 80 km/h from the km result.',
	'If you cannot help, say so and offer a human ops handoff.',
].join('\n');

const HARBOR_REPLY_SCHEMA = JSON.stringify({
	type: 'object',
	properties: {
		reply: { type: 'string' },
		nextStep: { type: 'string' },
		etaHours: { type: 'number' },
	},
	required: ['reply', 'nextStep'],
});

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
	'Shipment H-1042 is stuck in Rotterdam (51.92, 4.48).',
	'How far is that from our Antwerp yard (51.22, 4.40),',
	'about how many road hours, and what is the hold?',
].join(' ');

function demoSpecs(...names: string[]) {
	const wanted = new Set(names);
	return demoToolSpecs()
		.filter((seed) => wanted.has(seed.data.toolName))
		.map((seed) => defaultToolSpec(seed.data));
}

/** The Harbor hold lookup the desk calls first. */
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
	draft = includeFacet(draft, 'outputs');
	draft = includeFacet(draft, 'turnBehaviour');
	return {
		...draft,
		identity: {
			agentId: 'harbor.desk',
			profileType: 'text',
			handle: 'desk',
			system: HARBOR_SYSTEM,
			systemByRoleJson: '',
		},
		models: { ...draft.models, defaultModel: 'main' },
		modelBindings: [
			defaultModelBinding({
				modelId: 'main',
				protocol: 'openAi',
				provider: 'openrouter',
				apiId: 'openrouter/free',
			}),
		],
		toolSpecs: [harborHoldToolSpec(), ...demoSpecs('haversine_distance', 'convert_units')],
		inputs: harborDeskInputs(),
		outputs: {
			...draft.outputs,
			mode: 'structured',
			schemaId: 'harbor.desk.reply',
			schemaJson: HARBOR_REPLY_SCHEMA,
		},
		turnBehaviour: {
			...draft.turnBehaviour,
			allowSteering: true,
		},
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
    openAiGateway: { apiKey },
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
    if (event.type === 'structured') {
      console.log(JSON.stringify(event.structured, null, 2));
    }
  }
}
`;
}

/** Each seed's playground draft, and how its compiled profile is wrapped for the docs fence. */
const SEEDS: Record<
	PlaygroundSeedId,
	{ draft: () => PlaygroundDraft; wrap: (source: string, profileId: string) => string }
> = {
	firstTurn: { draft: firstTurnDraft, wrap: withFirstTurnDoor },
};

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
