import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { resolveTheorumRoot } from './scripts/resolve-theorum-root.mjs';

function theorumAliases(theorumRoot: string) {
	const theorumSchema = path.resolve(theorumRoot, 'src/kernel/schema.ts');
	const theorumGoogleSpeechVoices = path.resolve(
		theorumRoot,
		'src/presets/google/speech-voices.ts',
	);

	return {
		// Package-style subpaths used in app source (must precede the bare `theorum` file alias).
		'theorum/schema': theorumSchema,
		'theorum/host': path.resolve(theorumRoot, 'src/host/mod.ts'),
		'theorum/guardrails': path.resolve(theorumRoot, 'src/guardrails/mod.ts'),
		'theorum/presets/google/speech-voices': theorumGoogleSpeechVoices,
		'theorum/presets/google': path.resolve(theorumRoot, 'src/presets/google.ts'),
		'theorum/providers/google/live': path.resolve(theorumRoot, 'src/providers/google/live/mod.ts'),
		theorum: path.resolve(theorumRoot, 'mod.ts'),
		// Legacy aliases kept for any remaining @theorum imports.
		'@theorum/core': path.resolve(theorumRoot, 'mod.ts'),
		'@theorum/core/host': path.resolve(theorumRoot, 'src/host/mod.ts'),
		'@theorum/schema': theorumSchema,
		'@theorum/presets/google/speech-voices': theorumGoogleSpeechVoices,
		'@theorum/guardrails': path.resolve(theorumRoot, 'src/guardrails/mod.ts'),
		'@theorum/presets/google': path.resolve(theorumRoot, 'src/presets/google.ts'),
		'@theorum/providers/google/live': path.resolve(theorumRoot, 'src/providers/google/live/mod.ts'),
	};
}

export default defineConfig(() => {
	const { root: theorumRoot, source: theorumSource } = resolveTheorumRoot();
	const aliases = theorumAliases(theorumRoot);
	const kernelSubmoduleHead = (() => {
		try {
			return execFileSync('git', ['-C', theorumRoot, 'rev-parse', '--short', 'HEAD'], {
				encoding: 'utf8',
			}).trim();
		} catch {
			return '';
		}
	})();
	const kernelPackageVersion = (() => {
		try {
			const denoJson = JSON.parse(readFileSync(path.join(theorumRoot, 'deno.json'), 'utf8')) as {
				version?: string;
			};
			return denoJson.version ?? '1.0.0';
		} catch {
			return '1.0.0';
		}
	})();

	return {
		define: {
			'import.meta.env.KERNEL_SUBMODULE_HEAD': JSON.stringify(kernelSubmoduleHead),
			'import.meta.env.KERNEL_PACKAGE_VERSION': JSON.stringify(kernelPackageVersion),
			'import.meta.env.KERNEL_SOURCE': JSON.stringify(theorumSource),
		},
		plugins: [
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				},
				adapter: adapter(),
				alias: aliases,
			}),
		],
		resolve: {
			alias: aliases,
		},
		ssr: {
			noExternal: [
				'theorum',
				'theorum/schema',
				'theorum/host',
				'theorum/guardrails',
				'theorum/presets/google',
				'theorum/presets/google/speech-voices',
				'theorum/providers/google/live',
				'@theorum/core',
				'@theorum/core/host',
				'@theorum/guardrails',
				'@theorum/presets/google',
				'@theorum/providers/google/live',
				'@xyflow/svelte',
				'@xyflow/system',
			],
		},
	};
});
