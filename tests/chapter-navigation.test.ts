import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	chapterIsOpen,
	chapterNavigationTree,
	setChapterCollapsed,
} from '../app/lib/docs/chapter-navigation.ts';
import type { DocTreeNode } from '../app/lib/docs/schema.ts';

test('chapter navigation keeps groups and sub-group links while hiding deeper levels', () => {
	const tree: DocTreeNode[] = [
		{
			id: 'profiles',
			label: 'Profiles & Modalities',
			children: [
				{
					id: 'profiles',
					label: 'Overview',
					slug: 'profiles',
					children: [
						{
							id: 'profiles/text',
							label: 'Text Profiles',
							slug: 'profiles/text',
							children: [
								{
									id: 'profiles/text:heading',
									label: 'Heading',
									slug: 'profiles/text',
									blockId: 'heading',
									children: [],
								},
							],
						},
					],
				},
			],
		},
	];
	const visible = chapterNavigationTree(tree);
	assert.deepEqual(visible[0]?.children[0]?.children[0], {
		id: 'profiles/text',
		label: 'Text Profiles',
		slug: 'profiles/text',
		children: [],
	});
	assert.equal(visible[0]?.id, 'profiles');
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

test('subgroup collapse does not collapse parent group', () => {
	const initial = new Map<string, boolean>();
	const collapsed = setChapterCollapsed(initial, 'profiles', true);
	assert.equal(chapterIsOpen('group:profiles', true, collapsed), true);
	assert.equal(chapterIsOpen('profiles', true, collapsed), false);
});
