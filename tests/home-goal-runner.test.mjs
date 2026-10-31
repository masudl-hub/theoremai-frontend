import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

test('specialized examples render their runner before a text-chat opening exists', async () => {
	const pageFetch = globalThis.fetch;
	globalThis.fetch = async (path) => new Response(await readFile(join('public', String(path))));
	const runnerId = '\0home-goal-test-runner';
	const cacheDir = await mkdtemp(join(tmpdir(), 'theorem-goal-test-'));
	const server = await createServer({
		configFile: false,
		cacheDir,
		server: { middlewareMode: true },
		resolve: { dedupe: ['react', 'react-dom', '@astryxdesign/core', '@stylexjs/stylex'] },
		ssr: { noExternal: ['@theoremjs/studio', '@theoremjs/agents', '@theoremjs/react'] },
		plugins: [{
			name: 'observe-home-runner',
			enforce: 'pre',
			resolveId(source) {
				if (source === '@theoremjs/studio/ui/studio-runner.tsx') return runnerId;
			},
			load(id) {
				if (id === runnerId) return `import {createElement} from 'react';
export function StudioRunner({payload}) {
 return createElement('div', {'data-runner-type': payload.profile.type});
}`;
			},
		}],
	});
	try {
		const { createHomeAgentStore } = await server.ssrLoadModule('/app/lib/home-agent-store.ts');
		const { GOAL_BEATS } = await server.ssrLoadModule('/app/lib/home-goals.ts');
		const { GoalLive } = await server.ssrLoadModule('/app/components/home-goals-live.tsx');
		const beat = GOAL_BEATS.find((entry) => entry.goal === 'experiment');
		const { tokenIsOn } = await server.ssrLoadModule('/app/lib/home-agent.ts');
		const ids = GOAL_BEATS.flatMap((entry) => entry.controls.flatMap((group) => group.tokens.map(({ id }) => id))).filter((id) => id !== 'harmless');
		const modes = ['live-call', 'decision', 'host', 'embedding', 'speech'];
		for (const first of ids) {
			for (const second of ids) {
				const sequence = createHomeAgentStore();
				await sequence.toggle(first);
				assert.equal(sequence.get().compiled.ok, true, first);
				const wasSelected = tokenIsOn(sequence.get().agent, second);
				await sequence.toggle(second);
				assert.equal(sequence.get().compiled.ok, true, `${first} then ${second}: ${JSON.stringify(sequence.get().compiled)}`);
				if (first !== second && !wasSelected) {
					assert.equal(tokenIsOn(sequence.get().agent, second), true, `${second} should be selected after ${first}`);
					if (modes.includes(first) || modes.includes(second)) {
						assert.equal(tokenIsOn(sequence.get().agent, first), false, `${first} should be deselected by ${second}`);
					}
				}
			}
		}
		const store = createHomeAgentStore();
		assert.ok(store.get().good.source.includes('credentials:'));
		assert.ok(store.get().good.source.includes('tool_output_http:'));
		assert.ok(store.get().good.source.includes('blockedReply:'));
		assert.deepEqual(store.read(store.get().good.source).errors, []);
		assert.equal(store.get().compiled.ok, true);
		await store.toggle('providers');
		assert.equal(store.get().compiled.ok, true);
		const models = Object.values(store.get().good.payload.profile.models);
		assert.equal(models.length, 4);
		assert.equal(models.filter(({ provider }) => provider === 'gemini').length, 3);
		await store.toggle('providers');
		assert.equal(Object.keys(store.get().good.payload.profile.models).length, 1);
		for (const id of ['host', 'embedding', 'decision', 'speech', 'live-call']) {
			const picked = beat.controls.flatMap((group) => group.tokens).find((token) => token.id === id);
			await store.toggle(id);
			const state = store.get();
			assert.equal(state.compiled.ok, true);
			const html = renderToString(createElement(GoalLive, { store, beat, picked }));
			const type = id === 'live-call' ? 'live' : id;
			assert.ok(html.includes(`data-runner-type="${type}"`), `${id} should render its own runner immediately: ${html.slice(-800)}`);
			await store.toggle(id);
			assert.equal(store.get().good.payload.profile.type, 'text');
		}
	} finally {
		globalThis.fetch = pageFetch;
		await server.close();
		await rm(cacheDir, { recursive: true, force: true });
	}
});
