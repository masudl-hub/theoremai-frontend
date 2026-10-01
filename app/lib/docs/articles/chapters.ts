/**
 * Chapter order and retired URLs. Each chapter lives in its own file; catalog symbols compose into its
 * dictionary — do not paste FieldMeta.doc here.
 */

import type { DocArticleDef } from '../schema';
import { guardrails } from './guardrails';
import { identity } from './identity';
import { inputs } from './inputs';
import { interfaceChapter } from './interface';
import { modalities } from './modalities';
import { models } from './models';
import { outputs } from './outputs';
import { runner } from './runner';
import { start } from './start';
import { statuses } from './statuses';
import { tools } from './tools';
import { traces } from './traces';
import { turnBehaviour } from './turn-behaviour';

/** The /docs landing backdrop. */
export const LANDING_STILL = '/imagery/th30_goldenmarsh.png';

export const SITE_REDIRECTS = [
	{ from: '/#use', to: '/docs/start', reason: 'home hash retired' },
	{ from: '/#pillars', to: '/docs', reason: 'home hash retired' },
	{ from: '/#overview', to: '/docs', reason: 'home hash retired' },
	{ from: '/#architecture', to: '/docs/modalities#host', reason: 'home hash retired' },
	{ from: '/#playground', to: '/playground', reason: 'home hash retired' },
	{
		from: '/docs/profiles',
		to: '/docs/modalities',
		reason: 'profiles remapped to modalities',
	},
	{
		from: '/docs/providers',
		to: '/docs/models',
		reason: 'providers remapped to models',
	},
	{
		from: '/docs/observability',
		to: '/docs/traces',
		reason: 'observability remapped to traces',
	},
	{ from: '/docs/host', to: '/docs/modalities#host', reason: 'host is a modality' },
	{ from: '/docs/cli', to: '/docs/start', reason: 'cli deferred' },
	{ from: '/docs/ui', to: '/docs/interface', reason: 'ui folded into interface' },
	{ from: '/docs/playground', to: '/playground', reason: 'playground chapter retired' },
] as const;

export const SITE_ARTICLES: readonly DocArticleDef[] = [
	start,
	modalities,
	identity,
	models,
	tools,
	inputs,
	outputs,
	turnBehaviour,
	guardrails,
	traces,
	statuses,
	runner,
	interfaceChapter,
];
