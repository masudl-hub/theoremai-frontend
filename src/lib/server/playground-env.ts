import { env as privateEnv } from '$env/dynamic/private';
import type { PlaygroundTurnEnv } from './playground-turn';

export function resolvePlaygroundTurnEnv(platformEnv?: PlaygroundTurnEnv): PlaygroundTurnEnv {
	return {
		GEMINI_API_KEY: platformEnv?.GEMINI_API_KEY ?? privateEnv.GEMINI_API_KEY,
		GEMINI_API_KEY_FREE_A: platformEnv?.GEMINI_API_KEY_FREE_A ?? privateEnv.GEMINI_API_KEY_FREE_A,
		GEMINI_API_KEY_FREE_B: platformEnv?.GEMINI_API_KEY_FREE_B ?? privateEnv.GEMINI_API_KEY_FREE_B,
		GEMINI_API_KEY_FREE_C: platformEnv?.GEMINI_API_KEY_FREE_C ?? privateEnv.GEMINI_API_KEY_FREE_C,
		OPENROUTER_API_KEY: platformEnv?.OPENROUTER_API_KEY ?? privateEnv.OPENROUTER_API_KEY,
	};
}
