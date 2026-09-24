import { createContext } from 'react-router';

/** Worker secrets the site reads (wrangler secret put / .dev.vars). */
export type SiteEnv = {
	GEMINI_API_KEY?: string;
	GEMINI_API_KEY_FREE_A?: string;
	GEMINI_API_KEY_FREE_B?: string;
	GEMINI_API_KEY_FREE_C?: string;
	OPENROUTER_API_KEY?: string;
};

/** Per-request Cloudflare bindings, set by `workers/app.ts` and read in loaders/actions. */
export const cloudflareContext = createContext<{ env: SiteEnv; ctx: ExecutionContext }>();
