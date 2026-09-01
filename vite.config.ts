import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { defineConfig } from 'vite';

const theorumRoot = path.resolve(import.meta.dirname, 'theorum');

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
				theorum: path.resolve(theorumRoot, 'mod.ts')
			}
		})
	],
	resolve: {
		alias: {
			'@theorum/core': path.resolve(theorumRoot, 'mod.ts'),
			theorum: path.resolve(theorumRoot, 'mod.ts')
		}
	},
	ssr: {
		noExternal: ['@theorum/core', 'theorum']
	}
});
