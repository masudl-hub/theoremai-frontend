import assert from 'node:assert/strict';
import { test } from 'node:test';
import { searchDocs } from '../app/lib/docs/query.ts';
import type { DocArticle, DocIndex } from '../app/lib/docs/schema.ts';

function chapter(slug: string, title: string, sections: [string, string, string][]): DocArticle {
	let body = '';
	const entries = sections.map(([id, heading, text]) => {
		const start = body.length;
		body += `## ${heading}\n${text}\n\n`;
		return { id, title: heading, start, end: body.length };
	});
	return {
		slug,
		title,
		summary: `${title}.`,
		canonicalPath: `/docs/${slug}`,
		body,
		sections: entries,
		symbols: [],
		terms: {},
	} as unknown as DocArticle;
}

function field(path: string, doc: string) {
	return { kind: 'field', id: path, path, chapter: 'runner', meta: { doc } };
}

const runner = chapter('runner', 'Running a turn', [
	['5-resume-a-gate', '5. Resume a gate', 'When a person answers a gate, send the answer and the turn goes on.'],
	['3-read-the-stream', '3. Read the stream', 'Each event arrives as it happens.'],
]);
const glossary = {
	...chapter('glossary', 'Glossary', []),
	symbols: [
		field('live.resumed.afterMs', 'The shortest time away that earns the prompt; a shorter drop resumes silently.'),
		field('labels.session.gate_expired', 'Shown when a gate waited too long and a person can no longer answer it.'),
		field('turnBehaviour.resumption.allowContinue', 'Which resumptions a person may ask for; a gate can be one.'),
	],
} as unknown as DocArticle;
const articles = [runner, glossary];
const index = {
	articles,
	tree: [],
	suggested: [],
	bySlug: Object.fromEntries(articles.map((article) => [article.slug, article])),
} as unknown as DocIndex;

const first = (query: string) => searchDocs(index, query).results[0]?.blockId;

test('words like "a" do not let every place match a question', () => {
	assert.equal(first('resume a gate'), '5-resume-a-gate');
	assert.equal(first('how do I resume a gate'), '5-resume-a-gate');
});

test('a hit shows the line that answers, not its own numbered heading', () => {
	assert.equal(
		searchDocs(index, 'resume a gate').results[0]?.excerpt,
		'When a person answers a gate, send the answer and the turn goes on.',
	);
});

test('a guide named by the words comes before glossary rows that also name them', () => {
	assert.equal(first('gate'), '5-resume-a-gate');
});

test('a glossary row named by the words still comes before guides that only mention them', () => {
	assert.equal(first('allowContinue'), 'turnBehaviour.resumption.allowContinue');
});

test('a question of only common words still searches by them', () => {
	assert.ok(searchDocs(index, 'the').totalMatches > 0);
});
