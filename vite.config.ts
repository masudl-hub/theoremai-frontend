import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

/** Prefer the sibling kernel checkout so schema/types stay live while both repos are open. */
function resolveTheorumRoot(): string {
	const sibling = path.resolve(import.meta.dirname, '../theorum');
	const nested = path.resolve(import.meta.dirname, 'theorum');
	if (fs.existsSync(path.join(sibling, 'mod.ts'))) return sibling;
	return nested;
}

const theorumRoot = resolveTheorumRoot();
const theorumSchema = path.resolve(theorumRoot, 'src/kernel/schema.ts');
const theorumGoogleSpeechVoices = path.resolve(
	theorumRoot,
	'src/presets/google/speech-voices.ts'
);

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			alias: {
				'@theorum/core': path.resolve(theorumRoot, 'mod.ts'),
				'@theorum/schema': theorumSchema,
				'@theorum/presets/google/speech-voices': theorumGoogleSpeechVoices,
				theorum: path.resolve(theorumRoot, 'mod.ts')
			}
		})
	],
	resolve: {
		alias: {
			'@theorum/core': path.resolve(theorumRoot, 'mod.ts'),
			'@theorum/schema': theorumSchema,
			'@theorum/presets/google/speech-voices': theorumGoogleSpeechVoices,
			theorum: path.resolve(theorumRoot, 'mod.ts')
		}
	},
	ssr: {
		noExternal: ['@theorum/core', 'theorum', '@xyflow/svelte', '@xyflow/system']
	}
});
