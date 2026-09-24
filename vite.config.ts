import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { kernelMetaDefine } from './scripts/kernel-meta.mjs';
import { resolveTheoremaiRoot } from './scripts/resolve-theoremai-root.mjs';
import { liveRelayDevPlugin } from './scripts/vite-live-relay-plugin.mjs';
import { runSpaIndexPlugin } from './scripts/vite-run-spa-index-plugin.mjs';

export default defineConfig(() => ({
	define: kernelMetaDefine(resolveTheoremaiRoot()),
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
}));
