import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	chapterIsOpen,
	chapterNavigationTree,
	setChapterCollapsed,
} from '../app/lib/docs/chapter-navigation.ts';
import type { DocTreeNode } from '../app/lib/docs/schema.ts';

test('chapter navigation keeps chapter and section links while hiding deeper headings', () => {
	const tree: DocTreeNode[] = [
		{
			id: 'start',
			label: 'Getting started',
			slug: 'start',
			children: [
				{
					id: 'start:profile',
					label: 'The profile',
					slug: 'start',
					blockId: 'profile',
					children: [
						{
							id: 'start:models',
							label: 'Models',
							slug: 'start',
							blockId: 'models',
							children: [],
						},
					],
				},
			],
		},
	];
	const visible = chapterNavigationTree(tree);
	assert.deepEqual(visible[0]?.children[0], {
		id: 'start:profile',
		label: 'The profile',
		slug: 'start',
		blockId: 'profile',
		children: [],
	});
	assert.equal(visible[0]?.slug, 'start');
	assert.equal(tree[0]?.children[0]?.children[0]?.blockId, 'models');
});

test('the current chapter can collapse and reopen despite its automatic expansion', () => {
	const initial = new Map<string, boolean>();
	assert.equal(chapterIsOpen('start', true, initial), true);
	const collapsed = setChapterCollapsed(initial, 'start', true);
	assert.equal(chapterIsOpen('start', true, collapsed), false);
	assert.equal(chapterIsOpen('start', true, setChapterCollapsed(collapsed, 'start', false)), true);
	assert.equal(initial.size, 0);
	assert.equal(chapterIsOpen('tools', true, collapsed), true);
});

test('manual toggles override search expansion without opening unrelated chapters', () => {
	const collapsed = setChapterCollapsed(new Map(), 'tools', true);
	assert.equal(chapterIsOpen('tools', true, collapsed), false);
	const opened = setChapterCollapsed(collapsed, 'tools', false);
	assert.equal(chapterIsOpen('tools', false, opened), true);
	assert.equal(chapterIsOpen('start', false, opened), false);
});
