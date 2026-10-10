import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { ProfileEditor } from '@theoremjs/studio/ui/profile-editor.tsx';
import { type SetStateAction, useState } from 'react';
import { homeAgentDraft } from '../lib/home-agent';
import type { HomeAgentState, HomeAgentStore } from '../lib/home-agent-store';
import type { GoalId } from '../lib/home-goals';

/** The sections of the profile each goal is about, as the studio names them. */
const SECTIONS: Record<GoalId, readonly { id: string; label: string }[]> = {
	'source-of-truth': [
		{ id: 'inputs', label: 'Inputs' },
		{ id: 'outputs', label: 'Outputs' },
	],
	experiment: [
		{ id: 'identity', label: 'Type' },
		{ id: 'models', label: 'Models' },
	],
	boundaries: [{ id: 'guardrails', label: 'Guardrails' }],
};

/**
 * The studio's own editor for the sections a goal is about. Its edits go to the same agent as
 * the file's, so the file, the form and the tokens are one thing.
 */
export default function GoalForm({
	store,
	state,
	goal,
}: {
	store: HomeAgentStore;
	state: HomeAgentState;
	goal: GoalId;
}) {
	const sections = SECTIONS[goal];
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
				draft={homeAgentDraft(state.agent)}
				setDraft={(action: SetStateAction<StudioDraftOf>) => {
					store.edit((draft) => (typeof action === 'function' ? action(draft) : action));
				}}
				selectedId={selected}
				onSelect={() => {}}
				issues={issues}
			/>
		</div>
	);
}

type StudioDraftOf = ReturnType<typeof homeAgentDraft>;
