import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolveTheorumRoot } from '../../scripts/resolve-theorum-root.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, '../..');
const { root: theorumRoot } = resolveTheorumRoot(repoRoot);

const theorumAliases = {
	'theorum/schema': path.resolve(theorumRoot, 'src/kernel/schema.ts'),
	'theorum/host': path.resolve(theorumRoot, 'src/host/mod.ts'),
	'theorum/guardrails': path.resolve(theorumRoot, 'src/guardrails/mod.ts'),
	'theorum/interface': path.resolve(theorumRoot, 'src/interface/mod.ts'),
	'theorum/playground': path.resolve(theorumRoot, 'src/playground/mod.ts'),
	'theorum/kernel': path.resolve(theorumRoot, 'src/kernel/mod.ts'),
	'theorum/presets/google/speech-voices': path.resolve(
		theorumRoot,
		'src/presets/google/speech-voices.ts',
	),
	'theorum/presets/google': path.resolve(theorumRoot, 'src/presets/google.ts'),
	'theorum/providers/google/live': path.resolve(theorumRoot, 'src/providers/google/live/mod.ts'),
	theorum: path.resolve(theorumRoot, 'mod.ts'),
	'@theorum/react': path.resolve(theorumRoot, 'react/src/index.ts'),
	'@theorum/react/client': path.resolve(theorumRoot, 'react/src/client/index.ts'),
};

export default defineConfig({
	base: '/playground/run/',
	plugins: [react()],
	resolve: {
		alias: theorumAliases,
		// Package lives outside this workspace; pin React to the host install.
		dedupe: ['react', 'react-dom'],
	},
	server: {
		port: 5174,
		proxy: {
			'/api': {
				target: 'http://localhost:5173',
				changeOrigin: true,
				ws: true,
			},
		},
		fs: {
			allow: [repoRoot, theorumRoot],
		},
	},
	optimizeDeps: {
		exclude: ['theorum'],
	},
});
