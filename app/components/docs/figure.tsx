import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { type ComponentProps, type CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import type { DocFigure, SequenceFigure, SwitchbackFigure } from '../../lib/docs/figure';
import { stillRenditions } from '../../lib/stills';

import { LanesFlow } from './lanes-flow';
import { SwitchbackFlow } from './switchback-flow';

/** Most steps on one row of a sequence, and the width a switchback's rows need. */
const ROW_STEPS = 4;
const ROW_MIN_WIDTH = 640;

/** The steps as switchback rows: each row runs back the way the last one ended. */
function sequenceRows(figure: SequenceFigure): SwitchbackFigure['rows'] {
	const rows: SwitchbackFigure['rows'] = [];
	for (let at = 0; at < figure.steps.length; at += ROW_STEPS) {
		rows.push({
			direction: rows.length % 2 === 0 ? 'ltr' : 'rtl',
			steps: figure.steps.slice(at, at + ROW_STEPS).map((step) => ({
				label: step.label,
				text: step.text,
				token: { label: step.label, kind: step.kind },
			})),
		});
	}
	return rows;
}

/** A switchback's rows as the one line it runs along. */
function switchbackSteps(figure: SwitchbackFigure): ComponentProps<typeof LanesFlow>['steps'] {
	return figure.rows.flatMap((row) =>
		row.steps.map((step) => ({
			label: step.token?.label ?? step.label,
			kind: step.token?.kind,
			text: step.text ?? step.parts?.map((part) => part.text ?? part.label).join(' · ') ?? '',
		})),
	);
}

/** The steps across in switchback rows where they fit, and down one line where they don't. */
function FittedFlow({
	rows,
	caption,
	steps,
}: {
	rows: SwitchbackFigure['rows'];
	caption: string;
	steps: ComponentProps<typeof LanesFlow>['steps'];
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(ROW_MIN_WIDTH);

	useLayoutEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const measure = () => {
			setWidth(root.getBoundingClientRect().width);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(root);
		return () => {
			observer.disconnect();
		};
	}, []);

	return (
		<div ref={rootRef}>
			{width >= ROW_MIN_WIDTH ? (
				<SwitchbackFlow figure={{ kind: 'switchback', caption, rows }} />
			) : (
				<LanesFlow lanes={['']} steps={steps} />
			)}
		</div>
	);
}

/** Steps in order, down one line when they carry parts, which a row has no room for. */
function Sequence({ figure }: { figure: SequenceFigure }) {
	if (figure.steps.some((step) => step.parts)) {
		return <LanesFlow lanes={['']} steps={figure.steps} />;
	}
	return <FittedFlow rows={sequenceRows(figure)} caption={figure.caption} steps={figure.steps} />;
}

/** A `figure` fence: its steps in order, as one line on one panel. */
export function DocsFigure({ figure }: { figure: DocFigure }) {
	const still = figure.still
		? ({
				'--figure-still': `url("${stillRenditions(figure.still.src).full}")`,
				'--figure-position': figure.still.position,
			} as CSSProperties)
		: undefined;

	const content =
		figure.kind === 'switchback' ? (
			<FittedFlow rows={figure.rows} caption={figure.caption} steps={switchbackSteps(figure)} />
		) : figure.kind === 'lanes' ? (
			<LanesFlow lanes={figure.lanes} steps={figure.steps} />
		) : (
			<Sequence figure={figure} />
		);

	return (
		<VStack gap={2} role="figure" aria-label={figure.caption}>
			{still ? (
				<Card variant="still" padding={6} style={still}>
					<Card variant="glass" padding={0} elevation="med" width="100%">
						{content}
					</Card>
				</Card>
			) : (
				<Card variant="glass" padding={4} elevation="low">
					{content}
				</Card>
			)}
			<Text type="supporting" color="secondary">
				{figure.caption}
			</Text>
		</VStack>
	);
}
