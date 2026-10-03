import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBlankDraft, createExampleDraft } from '@theoremjs/playground';
import { restorePlayground } from '../app/lib/playground-store.ts';

const KEY = 'theorem.playground.v1';

function keep(draft: unknown) {
	sessionStorage.setItem(KEY, JSON.stringify({ v: 1, draft, revision: 4, selectedId: 'identity' }));
}

test('a kept draft in the current shape comes back', () => {
	keep(createBlankDraft());
	assert.equal(restorePlayground().kind, 'restored');
	sessionStorage.clear();
});

test('a draft kept before the draft grew a section is set aside, not compiled', () => {
	const blank = createBlankDraft();
	const { egressChecks: _dropped, ...olderGuardrails } = blank.guardrails;
	keep({ ...blank, guardrails: olderGuardrails });
	assert.equal(restorePlayground().kind, 'discarded');
	assert.equal(sessionStorage.getItem(KEY), null);
});

test('a draft kept with a field of another type is set aside, not compiled', () => {
	const blank = createBlankDraft();
	keep({ ...blank, identity: { ...blank.identity, system: [{ text: 'x', private: true }] } });
	assert.equal(restorePlayground().kind, 'discarded');
});

test('the example draft, edited, is still in the current shape', () => {
	keep({ ...createExampleDraft(), included: [] });
	assert.equal(restorePlayground().kind, 'restored');
	sessionStorage.clear();
});
