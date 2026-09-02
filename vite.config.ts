import { execSync } from 'node:child_process';
import path from 'node:path';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/** Kernel root — always the nested git submodule at `theorum/`. */
function resolveTheorumRoot(): string {
	return path.resolve(import.meta.dirname, 'theorum');
}

export default defineConfig(() => {
	const theorumRoot = resolveTheorumRoot();
	const theorumSchema = path.resolve(theorumRoot, 'src/kernel/schema.ts');
	const theorumGoogleSpeechVoices = path.resolve(
		theorumRoot,
		'src/presets/google/speech-voices.ts',
	);
	const kernelSubmoduleHead = (() => {
		try {
			return execSync('git -C theorum rev-parse --short HEAD', { encoding: 'utf8' }).trim();
		} catch {
			return '';
		}
	})();

	return {
		define: {
			'import.meta.env.KERNEL_SUBMODULE_HEAD': JSON.stringify(kernelSubmoduleHead),
		},
		plugins: [
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				},
				adapter: adapter(),
				alias: {
					'@theorum/core': path.resolve(theorumRoot, 'mod.ts'),
					'@theorum/schema': theorumSchema,
					'@theorum/presets/google/speech-voices': theorumGoogleSpeechVoices,
					'@theorum/guardrails': path.resolve(theorumRoot, 'src/guardrails/mod.ts'),
					'@theorum/presets/google': path.resolve(theorumRoot, 'src/presets/google.ts'),
					'@theorum/providers/google/live': path.resolve(
						theorumRoot,
						'src/providers/google/live/mod.ts',
					),
					theorum: path.resolve(theorumRoot, 'mod.ts'),
				},
			}),
		],
		resolve: {
			alias: {
				'@theorum/core': path.resolve(theorumRoot, 'mod.ts'),
				'@theorum/schema': theorumSchema,
				'@theorum/presets/google/speech-voices': theorumGoogleSpeechVoices,
				'@theorum/guardrails': path.resolve(theorumRoot, 'src/guardrails/mod.ts'),
				'@theorum/presets/google': path.resolve(theorumRoot, 'src/presets/google.ts'),
				'@theorum/providers/google/live': path.resolve(
					theorumRoot,
					'src/providers/google/live/mod.ts',
				),
				theorum: path.resolve(theorumRoot, 'mod.ts'),
			},
		},
		ssr: {
			noExternal: [
				'@theorum/core',
				'@theorum/guardrails',
				'theorum',
				'@theorum/presets/google',
				'@theorum/providers/google/live',
				'@xyflow/svelte',
				'@xyflow/system',
			],
		},
	};
});
