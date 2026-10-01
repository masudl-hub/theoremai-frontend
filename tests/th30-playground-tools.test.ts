import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBlankDraft, setProfileType, type PlaygroundDraft } from '@theoremjs/playground';
import { createPlaygroundTools, type PlaygroundToolsHost } from '../app/lib/th30-playground-tools.ts';
import { createPlaygroundStore } from '../app/lib/playground-store.ts';

function setup(draft: PlaygroundDraft = setProfileType(createBlankDraft(), 'image')) {
	const store = createPlaygroundStore({ draft, revision: 0, selectedId: 'identity', ledger: [] });
	let replaced = 0;
	const host: PlaygroundToolsHost = {
		getDraft: store.getDraft,
		getRevision: store.getRevision,
		getMode: () => 'demo',
		getSelected: store.getSelectedId,
		update: (next) => store.update(next, 'th30'),
		replaceDraft: (next) => {
			replaced += 1;
			store.update(next, 'th30');
		},
		select: store.select,
		ledger: store.ledger,
		lastChanges: (since) => store.changesSince(since).flatMap((change) => change.sections),
		keysFilled: () => false,
		openKeys: () => undefined,
		send: () => Promise.resolve(null),
		newConversation: () => undefined,
		launch: () => undefined,
		exportAgent: () => Promise.resolve(true),
	};
	return { store, tools: createPlaygroundTools(host), replaced: () => replaced };
}

type Result = { applied?: boolean; reason?: string; revision?: number; rejected?: { field: string }[] };

test('a replayed call id returns the first result and applies nothing', async () => {
	const { store, tools } = setup();
	const first = (await tools.editSection({ nodeId: 'identity', changes: { handle: 'pic' } }, 'c1')) as Result;
	const revision = store.getRevision();
	const again = await tools.editSection({ nodeId: 'identity', changes: { handle: 'other' } }, 'c1');
	assert.equal(first.applied, true);
	assert.deepEqual(again, first);
	assert.equal(store.getRevision(), revision);
	assert.equal(store.getDraft().identity.handle, 'pic');
});

test('a stale basedOn applies nothing and names what changed', async () => {
	const { store, tools } = setup();
	await tools.editSection({ nodeId: 'identity', changes: { handle: 'a' } }, 'c1');
	store.update({ ...store.getDraft(), identity: { ...store.getDraft().identity, system: 'x' } });
	const stale = (await tools.editSection({ nodeId: 'identity', changes: { handle: 'b' }, basedOn: 1 }, 'c2')) as Result;
	assert.equal(stale.applied, false);
	assert.equal(stale.reason, 'changed');
	assert.equal(store.getDraft().identity.handle, 'a');
});

test('back-to-back edits build on each other', async () => {
	const { store, tools } = setup();
	await tools.editSection({ nodeId: 'identity', changes: { handle: 'a' } }, 'c1');
	await tools.editSection({ nodeId: 'identity', changes: { system: 'be brief' } }, 'c2');
	assert.equal(store.getDraft().identity.handle, 'a');
	assert.equal(store.getDraft().identity.system, 'be brief');
});

test('bad settings are rejected one by one while the rest apply', async () => {
	const { store, tools } = setup();
	const result = (await tools.editSection(
		{ nodeId: 'identity', changes: { handle: 'ok', nope: 1, profileType: 'text' } },
		'c1',
	)) as Result;
	assert.equal(store.getDraft().identity.handle, 'ok');
	assert.deepEqual(result.rejected?.map((r) => r.field).sort(), ['nope', 'profileType']);
});

test('an unknown section applies nothing', async () => {
	const { tools } = setup();
	const result = (await tools.editSection({ nodeId: 'bogus', changes: { a: 1 } }, 'c1')) as Result;
	assert.equal(result.applied, false);
});

test('newAgent with the same intent twice applies once', async () => {
	const { tools, replaced } = setup();
	const a = await tools.newAgent({ type: 'text', intent: 'k' }, 'c1');
	const b = await tools.newAgent({ type: 'text', intent: 'k' }, 'c2');
	assert.deepEqual(a, b);
	assert.equal(replaced(), 1);
});

test('state reads the revision and sections', async () => {
	const { tools } = setup();
	const state = (await tools.playgroundState({}, 'c1')) as { type: string; nodes: unknown[]; revision: number };
	assert.equal(state.type, 'image');
	assert.ok(state.nodes.length > 0);
});
