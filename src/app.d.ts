// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
/// <reference types="@sveltejs/kit" />
/// <reference path="../.svelte-kit/ambient.d.ts" />
/// <reference path="../theorum-deno-shim.d.ts" />

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				GEMINI_API_KEY?: string;
				GEMINI_API_KEY_FREE_A?: string;
				GEMINI_API_KEY_FREE_B?: string;
				GEMINI_API_KEY_FREE_C?: string;
				OPENROUTER_API_KEY?: string;
			};
		}
	}
}

interface ImportMetaEnv {
	readonly KERNEL_SUBMODULE_HEAD?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

export {};
