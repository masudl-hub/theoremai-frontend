/**
 * The studio screen's server on this site: the package's handler, given the site's policy. Its
 * keys and models (`SITE_KEYS`), each day's allowances, the steer inboxes and the probe log are
 * the site's; the routes are the package's.
 */
import {
	createStudioDraftHandler,
	type StudioDraftHandler,
	type StudioSpend,
} from '@theoremjs/studio/server';
import type { SiteEnv } from '../../cloudflare';
import { ON_SITE } from '../studio-supplies';
import { d1ProbeLog } from './guardrail-probe';
import { resolveHost } from './resolve-host';
import { type AllowanceKind, spendAllowance } from './studio-allowance';
import { allowanceStore } from './studio-decide-allowance';
import { studioSteerInbox } from './studio-steer';
import { studioProviders } from './studio-turn';
import { getKernelPackageVersion } from './theoremai';

/** What each spend takes of the site's day: an agent tool's turn is one more request. */
const ALLOWANCE: Record<StudioSpend, AllowanceKind> = {
	decision: 'decision',
	call: 'call',
	agent: 'request',
};

const built = new WeakMap<SiteEnv, StudioDraftHandler>();

/**
 * The handler for `env`. A Worker's isolate keeps one `env`, so its sessions, the chats' sealing
 * key and the in-memory page tool results last as long as the isolate.
 */
export function studioServer(env: SiteEnv): StudioDraftHandler {
	let handler = built.get(env);
	if (!handler) {
		handler = createStudioDraftHandler({
			lent: {
				...ON_SITE,
				resolveHost,
				hostOptions: (profile) => studioProviders(env, profile),
			},
			resolveHost,
			spend: (kind, request) =>
				spendAllowance(
					env.DECIDE_ALLOWANCE && allowanceStore(env.DECIDE_ALLOWANCE),
					ALLOWANCE[kind],
					request,
				),
			steer: studioSteerInbox(env.STEER_INBOX),
			...(env.PROBE_LOG
				? { onProbePassed: d1ProbeLog(env.PROBE_LOG, getKernelPackageVersion()) }
				: {}),
		});
		built.set(env, handler);
	}
	return handler;
}
