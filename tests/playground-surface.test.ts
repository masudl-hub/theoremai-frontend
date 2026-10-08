import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSurfaceRuntime } from '@theoremjs/agents/surface';
import {
	createBlankDraft,
	type PlaygroundDraft,
	type PlaygroundWorkspace,
	setProfileType,
	workspaceFromDraft,
} from '@theoremjs/playground';
import { type PlaygroundSurfaceHost, playgroundSurface } from '@theoremjs/playground/surface';
import { createPlaygroundStore } from '../app/lib/playground-store.ts';

const KEY = ['AIzaSy', 'TESTONLY0000000000000000000000000'].join('');

function setup(draft: PlaygroundDraft = setProfileType(createBlankDraft(), 'text')) {
	const store = createPlaygroundStore({ workspace: workspaceFromDraft(draft), revision: 0 });
	const vault: Record<string, string> = {};
	const host: PlaygroundSurfaceHost = {
		getDraft: store.getDraft,
		getRevision: store.getRevision,
		getMode: () => 'byok',
		update: (next) => store.updateDraft(next, 'th30'),
		replaceDraft: (next) => store.updateDraft(next, 'th30'),
		select: store.select,
		changesSince: (since) =>
			store.changesSince(since).map((change) => ({
				revision: change.revision,
				by: change.by === 'th30' ? 'agent' : 'person',
				sections: change.sections,
			})),
		subscribe: store.subscribe,
		key: (slot) => vault[slot] ?? '',
		openKeys: () => undefined,
		send: () => Promise.resolve(null),
		newConversation: () => undefined,
		launch: () => undefined,
		exportAgent: () => Promise.resolve(true),
	};
	const notes: string[] = [];
	const runtime = createSurfaceRuntime({ onNote: (line) => notes.push(line) });
	runtime.mount(playgroundSurface(host));
	return { store, vault, runtime, notes };
}

type Answer = Record<string, unknown>;

test("th30's set lands in the store as its own edit, and the visitor's makes the next one stale", async () => {
	const { store, runtime, notes } = setup();
	const applied = (await runtime.answer(
		'act',
		{ at: 'playground/identity', action: 'set', input: { changes: { handle: 'pic' } }, basedOn: 0 },
		'c1',
	)) as Answer;
	assert.equal(applied.status, 'applied');
	assert.equal(store.getDraft().identity.handle, 'pic');
	assert.equal(store.changesSince(0)[0]?.by, 'th30');
	assert.deepEqual(notes, []);
	store.updateDraft({ ...store.getDraft(), identity: { ...store.getDraft().identity, system: 'x' } });
	assert.equal(notes.length, 1);
	const stale = (await runtime.answer(
		'act',
		{ at: 'playground/identity', action: 'set', input: { changes: { handle: 'b' } }, basedOn: 1 },
		'c2',
	)) as Answer;
	assert.equal(stale.status, 'stale');
	assert.equal(store.getDraft().identity.handle, 'pic');
});

test('a key never leaves the page in a look', async () => {
	const { runtime, vault, store } = setup();
	const slot = store.getDraft().models.key || 'slot_a';
	vault[slot] = KEY;
	const view = await runtime.answer('look', { at: `playground/key:${slot}` }, 'c1');
	assert.ok(!JSON.stringify(view).includes(KEY));
	assert.equal((view as { title?: string }).title, `Key ${slot}`);
	assert.ok(!JSON.stringify(runtime.stateLine()).includes(KEY));
});

test('a kept draft masks tool credentials and leaves plain settings as typed', async () => {
	sessionStorage.clear();
	const { store, runtime } = setup();
	for (const toolName of ['weather', 'plain']) {
		await runtime.answer(
			'act',
			{ at: 'playground', action: 'addTool', input: { toolName }, basedOn: store.getRevision() },
			toolName,
		);
	}
	const draft = store.getDraft();
	const [weather, other] = draft.toolSpecs.slice(-2);
	assert.ok(weather && other);
	const plain = '{\n  "Accept": "application/json"\n}';
	store.updateDraft({
		...draft,
		toolSpecs: draft.toolSpecs.map((spec) =>
			spec.key === weather.key
				? {
						...spec,
						endpoint: 'https://api.test/v1?api_key=s3cr3tvalue&city=Paris',
						headersJson: '{"X-Api-Key":"s3cr3theader"}',
					}
				: spec.key === other.key
					? { ...spec, endpoint: 'https://api.test', headersJson: plain }
					: spec,
		),
	});
	store.flush();
	const kept = sessionStorage.getItem('theorem.playground.v2') ?? '';
	assert.ok(!kept.includes('s3cr3tvalue'));
	assert.ok(!kept.includes('s3cr3theader'));
	assert.ok(kept.includes('city=Paris'));
	const tools = (JSON.parse(kept) as { workspace: PlaygroundWorkspace }).workspace.toolSpecs;
	const keptOther = tools.find((spec) => spec.key === other.key);
	assert.equal(keptOther?.endpoint, 'https://api.test');
	assert.equal(keptOther?.headersJson, plain);
	const live = store.getDraft().toolSpecs.find((spec) => spec.key === weather.key);
	assert.equal(live?.headersJson, '{"X-Api-Key":"s3cr3theader"}');
});
