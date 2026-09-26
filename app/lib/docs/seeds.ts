/**
 * Playground drafts compiled into docs snippets. Same omit-strip path as the
 * playground — never hand-type defineProfile with materialized defaults.
 */

import {
	compilePlayground,
	createBlankDraft,
	type PlaygroundDraft,
	playgroundSource,
	setProfileType,
} from '@theoremai/playground';
import type { PlaygroundSeedId } from './schema';

function withIdentity(
	draft: PlaygroundDraft,
	identity: PlaygroundDraft['identity'],
): PlaygroundDraft {
	return { ...draft, identity };
}

export function docsSeedDraft(seed: PlaygroundSeedId): PlaygroundDraft {
	if (seed === 'firstTurn') {
		return withIdentity(setProfileType(createBlankDraft(), 'text'), {
			agentId: 'docs.first-turn',
			profileType: 'text',
			handle: 'guide',
			system: 'Answer from the profile contract.',
		});
	}
	return withIdentity(setProfileType(createBlankDraft(), 'live'), {
		agentId: 'docs.live-voice',
		profileType: 'live',
		handle: 'voice',
		system: 'A short live session for the docs try-it.',
	});
}

export function compileSeedSource(seed: PlaygroundSeedId): string {
	const compiled = compilePlayground(docsSeedDraft(seed));
	if (!compiled.ok) {
		const issues = compiled.issues.map((issue) => issue.message).join('; ');
		throw new Error(`DOCS_SEEDS.${seed} failed to compile: ${issues}`);
	}
	return playgroundSource(compiled);
}
