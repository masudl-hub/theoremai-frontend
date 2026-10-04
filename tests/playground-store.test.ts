import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	addAgent,
	agentNodeId,
	createBlankDraft,
	createExampleDraft,
	type PlaygroundWorkspace,
	workspaceFromDraft,
} from '@theoremjs/playground';
import {
	clearConversation,
	createPlaygroundStore,
	restoreConversation,
	restorePlayground,
	saveConversation,
} from '../app/lib/playground-store.ts';

const KEY = 'theorem.playground.v2';
const V1_KEY = 'theorem.playground.v1';

function keep(workspace: unknown) {
	sessionStorage.setItem(KEY, JSON.stringify({ v: 2, workspace, revision: 4 }));
}

function keepV1(draft: unknown) {
	sessionStorage.setItem(V1_KEY, JSON.stringify({ v: 1, draft, revision: 4, selectedId: 'models' }));
}

/** A workspace of the example and a blank agent, the example open. */
function twoAgents(): PlaygroundWorkspace {
	const workspace = addAgent(workspaceFromDraft(createExampleDraft()), createBlankDraft());
	return { ...workspace, selected: agentNodeId(workspace.agents[0]?.key ?? '') };
}

test('a kept workspace in the current shape comes back', () => {
	keep(twoAgents());
	const restored = restorePlayground();
	assert.equal(restored.kind, 'restored');
	assert.equal(restored.kind === 'restored' && restored.value.workspace.agents.length, 2);
	sessionStorage.clear();
});

test('a workspace with an agent kept before the draft grew a section is set aside', () => {
	const workspace = twoAgents();
	const [first, second] = workspace.agents;
	assert.ok(first && second);
	const { egressChecks: _dropped, ...olderGuardrails } = second.guardrails;
	keep({ ...workspace, agents: [first, { ...second, guardrails: olderGuardrails }] });
	saveConversation(first.key, { blocks: [], session: {} } as never);
	assert.equal(restorePlayground().kind, 'discarded');
	assert.equal(sessionStorage.getItem(KEY), null);
	assert.equal(restoreConversation(first.key), undefined);
});

test('an agent kept with a field of another type is set aside', () => {
	const workspace = twoAgents();
	const [first] = workspace.agents;
	assert.ok(first);
	const identity = { ...first.identity, system: [{ text: 'x', private: true }] };
	keep({ ...workspace, agents: [{ ...first, identity }] });
	assert.equal(restorePlayground().kind, 'discarded');
	sessionStorage.clear();
});

test('a draft kept by the one-agent playground opens as a workspace holding it', () => {
	const draft = createExampleDraft();
	keepV1(draft);
	sessionStorage.setItem('theorem.playground.v1.chat', JSON.stringify({ blocks: [], session: {} }));
	const restored = restorePlayground();
	assert.equal(restored.kind, 'restored');
	if (restored.kind !== 'restored') return;
	const { workspace, revision } = restored.value;
	const [agent] = workspace.agents;
	assert.equal(revision, 4);
	assert.equal(agent?.identity.agentId, 'travel.concierge');
	assert.deepEqual(agent.tools.allow, draft.toolSpecs.map((tool) => tool.key));
	assert.equal(workspace.selected, agentNodeId(agent.key, 'models'));
	assert.ok(restoreConversation(agent.key));
	assert.equal(sessionStorage.getItem(V1_KEY), null);
	sessionStorage.clear();
});

test('a one-agent draft in an older shape is set aside', () => {
	const blank = createBlankDraft();
	const { egressChecks: _dropped, ...olderGuardrails } = blank.guardrails;
	keepV1({ ...blank, guardrails: olderGuardrails });
	assert.equal(restorePlayground().kind, 'discarded');
	assert.equal(sessionStorage.getItem(V1_KEY), null);
});

test('the store edits the open agent, with the whole library as its tools', () => {
	const workspace = twoAgents();
	const [concierge, blank] = workspace.agents;
	assert.ok(concierge && blank);
	const store = createPlaygroundStore({ workspace, revision: 0 });
	assert.equal(store.getFocus(), concierge.key);
	store.select(agentNodeId(blank.key, 'models'));
	assert.equal(store.getFocus(), blank.key);
	assert.equal(store.getRevision(), 0, 'opening a node is not an edit');
	assert.equal(store.getDraft().toolSpecs.length, workspace.toolSpecs.length);
	store.updateDraft((draft) => ({ ...draft, identity: { ...draft.identity, agentId: 'helper' } }));
	const [, edited] = store.getWorkspace().agents;
	assert.equal(edited?.identity.agentId, 'helper');
	assert.deepEqual(edited.tools.allow, [], 'the blank agent still allows none of the tools');
	assert.equal(store.getWorkspace().agents[0], concierge);
	assert.deepEqual(store.changesSince(0)[0]?.sections, ['identity']);
});

test('a library tool keeps the agent that was open', () => {
	const workspace = twoAgents();
	const [, blank] = workspace.agents;
	const tool = workspace.toolSpecs[0];
	assert.ok(blank && tool);
	const store = createPlaygroundStore({ workspace, revision: 0 });
	store.select(agentNodeId(blank.key));
	store.select(`toolSpec:${tool.key}`);
	assert.equal(store.getFocus(), blank.key);
});

test('each agent keeps a conversation of its own', () => {
	saveConversation('a', { blocks: [], session: { id: 'a' } } as never);
	saveConversation('b', { blocks: [], session: { id: 'b' } } as never);
	clearConversation('a');
	assert.equal(restoreConversation('a'), undefined);
	assert.ok(restoreConversation('b'));
	clearConversation();
	assert.equal(restoreConversation('b'), undefined);
});
