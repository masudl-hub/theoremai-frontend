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

let built: StudioDraftHandler | undefined;

/**
 * The isolate's handler, built from the first request's `env`: every request in an isolate has the
 * same bindings, but not always the same `env` object (the dev server gives each its own), and a
 * handler per object would forget each chat and session after one reply. The chats' sealing key is
 * the site's, so every isolate opens every chat.
 */
export function studioServer(env: SiteEnv): StudioDraftHandler {
	let handler = built;
	if (!handler) {
		handler = createStudioDraftHandler({
			lent: {
				...ON_SITE,
				resolveHost,
				hostOptions: (profile) => studioProviders(env, profile),
			},
			resolveHost,
			spend: (kind, request) =>
				import.meta.env.DEV
					? Promise.resolve()
					: spendAllowance(
							env.DECIDE_ALLOWANCE && allowanceStore(env.DECIDE_ALLOWANCE),
							ALLOWANCE[kind],
							request,
						),
			steer: studioSteerInbox(env.STEER_INBOX),
			...(env.CONVERSATION_SEAL_KEY ? { conversationKey: env.CONVERSATION_SEAL_KEY } : {}),
			...(env.PROBE_LOG
				? { onProbePassed: d1ProbeLog(env.PROBE_LOG, getKernelPackageVersion()) }
				: {}),
		});
		built = handler;
	}
	return handler;
}
