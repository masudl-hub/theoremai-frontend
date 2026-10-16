import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createKernelScope, defineProfile, geminiProvider } from '@theoremjs/agents';
import { createMemoryConversationStore, createMemorySteerInbox } from '@theoremjs/react/server';
import { studioDemoVault, streamStudioTurn } from '../app/lib/.server/studio-turn.ts';

const env = {
	GEMINI_API_KEY_FREE_A: 'fixture-google-a',
	GEMINI_API_KEY_FREE_B: 'fixture-google-b',
	OPENROUTER_API_KEY: 'fixture-router',
};

test('demo vault resolves model slots, provider defaults and explicit fallback without crossing providers', () => {
	const scope = createKernelScope();
	scope.providers.register(geminiProvider, { keySlot: 'main', fallbackKeySlot: 'overflow' });
	const profile = defineProfile({
		id: 'test',
		type: 'text',
		identity: { handle: 'test' },
		models: { main: { protocol: 'geminiInteractions', provider: 'gemini', apiId: 'gemini-3.5-flash-lite' } },
		inputs: { text: true },
		tools: { allow: [] },
	});
	assert.deepEqual(studioDemoVault(env, profile, scope.providers), {
		main: 'fixture-google-a',
		overflow: 'fixture-google-b',
	});
	assert.deepEqual(
		studioDemoVault(
			env,
			{
				...profile,
				models: { main: { ...profile.models.main, keySlot: 'custom', fallbackKeySlot: 'spare' } },
			},
			scope.providers,
		),
		{ custom: 'fixture-google-a', spare: 'fixture-google-b' },
	);
	assert.deepEqual(
		studioDemoVault(env, {
			...profile,
			models: {
				main: { ...profile.models.main, keySlot: 'shared' },
				other: { protocol: 'openRouter', provider: 'openrouter', apiId: 'openrouter/free', keySlot: 'shared' },
			},
		}),
		{ shared: undefined },
	);
});

test('server studio runs a registered OpenRouter provider using the demo vault', async () => {
	const original = globalThis.fetch;
	let calls = 0;
	globalThis.fetch = async (input, init) => {
		const request = input instanceof Request ? input : new Request(input, init);
		assert.equal(new URL(request.url).hostname, 'openrouter.ai');
		assert.equal(request.headers.get('authorization'), 'Bearer fixture-router');
		const body = await request.json();
		assert.equal(body.model, 'openrouter/free');
		calls++;
		return new Response(
			`data: ${JSON.stringify({ id: 'fixture-response', model: 'fixture/free', created: 0, object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content: 'Verified.' }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`,
			{ headers: { 'content-type': 'text/event-stream' } },
		);
	};
	try {
		const events = await Array.fromAsync(
			streamStudioTurn({
				profile: {
					id: 'server-smoke',
					type: 'text',
					identity: { handle: 'Smoke' },
					models: { main: { protocol: 'openRouter', provider: 'openrouter', apiId: 'openrouter/free', keySlot: 'router' } },
					inputs: { text: true },
					tools: { allow: [] },
				},
				customTools: [],
				steer: createMemorySteerInbox(),
				request: { input: { text: 'Hello' } },
				conversations: { sessionId: 'server-smoke', store: createMemoryConversationStore() },
				signal: new AbortController().signal,
				env,
			}),
		);
		assert.equal(calls, 1);
		assert.equal(
			events
				.filter((event) => event.type === 'text')
				.map((event) => event.text)
				.join(''),
			'Verified.',
		);
		assert.ok(events.some((event) => event.type === 'done' && event.stop.kind === 'completed'));
		assert.equal(
			events.some((event) => event.type === 'error'),
			false,
		);
	} finally {
		globalThis.fetch = original;
	}
});
