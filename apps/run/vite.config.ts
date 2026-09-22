import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolveTheoremaiRoot } from '../../scripts/resolve-theoremai-root.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, '../..');
const { root: theoremaiRoot } = resolveTheoremaiRoot(repoRoot);

export default defineConfig({
	base: '/playground/run/',
	plugins: [react()],
	resolve: {
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
			allow: [repoRoot, theoremaiRoot],
		},
	},
	optimizeDeps: {
		exclude: ['@theoremai/agents'],
	},
});
