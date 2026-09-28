import { createContext } from 'react-router';
import type { PlaygroundSteerInbox } from './lib/.server/playground-steer';

/** Worker secrets the site reads (wrangler secret put / .dev.vars), and its bindings. Free-tier Gemini keys only: nothing on the site spends on a paid key. */
export type SiteEnv = {
	/** The playground's mid-turn steer inboxes (`wrangler.jsonc` `durable_objects`). */
	STEER_INBOX: DurableObjectNamespace<PlaygroundSteerInbox>;
	GEMINI_API_KEY_FREE_A?: string;
	GEMINI_API_KEY_FREE_B?: string;
	GEMINI_API_KEY_FREE_C?: string;
	OPENROUTER_API_KEY?: string;
};

/** Per-request Cloudflare bindings, set by `workers/app.ts` and read in loaders/actions. */
export const cloudflareContext = createContext<{ env: SiteEnv; ctx: ExecutionContext }>();
