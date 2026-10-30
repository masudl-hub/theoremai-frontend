import { Banner } from '@astryxdesign/core/Banner';
import { Icon } from '@astryxdesign/core/Icon';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import {
	type StudioDraft,
	type StudioIssue,
	type StudioSourceError,
	studioTree,
} from '@theoremjs/studio';
import { FACET_ICON } from '@theoremjs/studio/ui/lib/facet-icons.ts';
import { ProfileEditor } from '@theoremjs/studio/ui/profile-editor.tsx';
import { type SetStateAction, useEffect, useState } from 'react';
import type { StudioSeedId } from '../../lib/docs/schema';
import { docsSeedDraft, readSeedProgram, seedProgram } from '../../lib/docs/seeds';

type Form = {
	draft: StudioDraft;
	/** The program this draft was read from or wrote: the last that compiled. */
	code: string;
	issues: readonly StudioIssue[];
	errors: readonly StudioSourceError[];
};

/** The form for a program. A program it cannot read keeps the draft, and says why. */
function readForm(seed: StudioSeedId, code: string, draft: StudioDraft): Form {
	const read = readSeedProgram(seed, code, draft);
	return read.ok
		? { draft: read.draft, code, issues: [], errors: [] }
		: { draft, code, issues: [], errors: read.errors };
}

/**
 * The studio's own editor for a seeded program. The code is the one truth: the form reads it, and
 * an edit that compiles writes it, so the code, its tokens and the form are one thing.
 */
export default function SeedForm({
	seed,
	code,
	onCode,
}: {
	seed: StudioSeedId;
	code: string;
	onCode: (code: string) => void;
}) {
	const [form, setForm] = useState(() => readForm(seed, code, docsSeedDraft(seed)));
	const [seen, setSeen] = useState(code);
	const [selected, setSelected] = useState('identity');

	if (code !== seen) {
		setSeen(code);
		if (code !== form.code) setForm(readForm(seed, code, form.draft));
	}

	useEffect(() => {
		onCode(form.code);
	}, [form.code, onCode]);

	const root = studioTree(form.draft);
	const sections = [root, ...root.children];
	return (
		<>
			<SegmentedControl
				label="Section"
				size="sm"
				layout="fill"
				value={selected}
				onChange={setSelected}
			>
				{sections.map(({ id, label, ref }) => (
					<Tooltip key={id} content={label}>
						<SegmentedControlItem
							value={id}
							label={label}
							isLabelHidden
							icon={<Icon icon={FACET_ICON[ref.facet as keyof typeof FACET_ICON]} size="sm" />}
						/>
					</Tooltip>
				))}
			</SegmentedControl>
			{form.errors.map(({ message, line }) => (
				<Banner
					key={`${String(line)}-${message}`}
					status="error"
					title={`The code cannot be read at line ${String(line)}`}
					description={message}
				/>
			))}
			<ProfileEditor
				draft={form.draft}
				setDraft={(action: SetStateAction<StudioDraft>) => {
					setForm((prev) => {
						const draft = typeof action === 'function' ? action(prev.draft) : action;
						const program = seedProgram(seed, draft);
						return program.ok
							? { draft, code: program.code, issues: [], errors: [] }
							: { draft, code: prev.code, issues: program.issues, errors: [] };
					});
				}}
				selectedId={selected}
				onSelect={setSelected}
				issues={form.issues}
			/>
		</>
	);
}
