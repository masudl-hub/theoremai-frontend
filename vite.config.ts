import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { resolveTheoremaiRoot } from './scripts/resolve-theoremai-root.mjs';
import { liveRelayDevPlugin } from './scripts/vite-live-relay-plugin.mjs';
import { runSpaIndexPlugin } from './scripts/vite-run-spa-index-plugin.mjs';

export default defineConfig(() => {
	const { root: theoremaiRoot, source: theoremaiSource } = resolveTheoremaiRoot();
	const kernelSubmoduleHead = (() => {
		try {
			return execFileSync('git', ['-C', theoremaiRoot, 'rev-parse', '--short', 'HEAD'], {
				encoding: 'utf8',
			}).trim();
		} catch {
			return '';
		}
	})();
	const kernelPackageVersion = (() => {
		try {
			const denoJson = JSON.parse(readFileSync(path.join(theoremaiRoot, 'deno.json'), 'utf8')) as {
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
			'import.meta.env.KERNEL_SOURCE': JSON.stringify(theoremaiSource),
		},
		plugins: [
			tailwindcss(),
			runSpaIndexPlugin(),
			// Before sveltekit so /api/live/relay upgrades are claimed (Vite otherwise
			// never completes the handshake; Workers WebSocketPair is absent in Node).
			liveRelayDevPlugin(),
			sveltekit({
				compilerOptions: {
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				},
				adapter: adapter(),
			}),
		],
		ssr: {
			noExternal: [
				'@tabler/icons-svelte',
				'@theoremai/agents',
				'@theoremai/agents/schema',
				'@theoremai/agents/host',
				'@theoremai/agents/guardrails',
				'@theoremai/agents/presets/google',
				'@theoremai/agents/interface',
				'@theoremai/playground',
				'@theoremai/agents/presets/google/speech-voices',
				'@theoremai/agents/providers/google/live',
				'@theoremai/react',
				'@theoremai/react/client',
				'@xyflow/svelte',
				'@xyflow/system',
			],
		},
	};
});
