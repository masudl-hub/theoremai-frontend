import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { ProfileEditor } from '@theoremjs/studio/ui/profile-editor.tsx';
import { memo, type SetStateAction, useState } from 'react';
import { homeAgentDraft } from '../lib/home-agent';
import type { HomeAgentState, HomeAgentStore } from '../lib/home-agent-store';
import type { GoalId } from '../lib/home-goals';

/** The sections of the profile each goal is about, as the studio names them. */
const SECTIONS: Record<GoalId, readonly { id: string; label: string }[]> = {
	experience: [
		{ id: 'inputs', label: 'Inputs' },
		{ id: 'outputs', label: 'Outputs' },
		{ id: 'tools', label: 'Tools' },
		{ id: 'guardrails', label: 'Guardrails' },
	],
	experiment: [
		{ id: 'identity', label: 'Type' },
		{ id: 'models', label: 'Models' },
	],
	boundaries: [{ id: 'guardrails', label: 'Guardrails' }],
};

type Section = { id: string; label: string };

/**
 * Extra category tabs for experiment by profile type (not one tab per model/tool —
 * those drill in from the Models / Tools lists, as guardrails do).
 */
function experimentSections(draft: StudioDraftOf): Section[] {
	const type = draft.identity.profileType;
	return [
		...(['live', 'speech', 'decision'].includes(type) ? [{ id: type, label: type }] : []),
		...(type === 'embedding' ? [{ id: 'inputs', label: 'Inputs' }] : []),
		...(type === 'host' ? [{ id: 'tools', label: 'Tools' }] : []),
	];
}

/** The sections a goal shows for this draft. */
function goalSections(goal: GoalId, draft: StudioDraftOf): readonly Section[] {
	if (goal === 'experience') return SECTIONS[goal];
	if (goal === 'experiment') return [...SECTIONS[goal], ...experimentSections(draft)];
	return SECTIONS[goal];
}

/**
 * The studio's own editor for the sections a goal is about. Its edits go to the same agent as
 * the file's, so the file, the form and the tokens are one thing.
 */
function GoalForm({
	store,
	state,
	goal,
}: {
	store: HomeAgentStore;
	state: HomeAgentState;
	goal: GoalId;
}) {
	const draft = homeAgentDraft(state.agent);
	const sections = goalSections(goal, draft);
	const [chosen, setChosen] = useState<string>();
	const selected = (sections.find(({ id }) => id === chosen) ?? sections[0]).id;
	const issues = state.compiled.ok ? [] : state.compiled.issues;
	return (
		<div className="home-goal-form">
			{sections.length > 1 ? (
				<SegmentedControl
					label="Section"
					size="sm"
					layout="fill"
					value={selected}
					onChange={setChosen}
				>
					{sections.map(({ id, label }) => (
						<SegmentedControlItem key={id} value={id} label={label} />
					))}
				</SegmentedControl>
			) : null}
			<ProfileEditor
				draft={draft}
				setDraft={(action: SetStateAction<StudioDraftOf>) => {
					store.edit((draft) => (typeof action === 'function' ? action(draft) : action));
				}}
				selectedId={selected}
				onSelect={setChosen}
				issues={issues}
			/>
		</div>
	);
}

type StudioDraftOf = ReturnType<typeof homeAgentDraft>;

export const MemoGoalForm = memo(GoalForm);
