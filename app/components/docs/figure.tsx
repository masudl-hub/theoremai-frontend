import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { MediaTheme } from '@astryxdesign/core/theme';
import { VStack } from '@astryxdesign/core/VStack';
import type { CSSProperties } from 'react';
import { CHAPTER_ICON } from '../../lib/docs/chapter-icons';
import type { DocFigure, LanesFigure, SequenceFigure } from '../../lib/docs/figure';

type FigureStep = DocFigure['steps'][number];
type FigurePart = NonNullable<FigureStep['parts']>[number];

/** A part's name. With a chapter, it carries that chapter's icon and links to it. */
function PartLabel({ part }: { part: FigurePart }) {
	if (part.chapter === undefined) {
		return (
			<Text type="label" weight="medium">
				{part.label}
			</Text>
		);
	}
	return (
		<HStack gap={1.5} vAlign="center">
			<Icon icon={CHAPTER_ICON[part.chapter]} size="sm" color="secondary" />
			<Link href={`/docs/${part.chapter}`} type="label" weight="medium" color="primary">
				{part.label}
			</Link>
		</HStack>
	);
}

function Parts({ parts }: { parts: NonNullable<FigureStep['parts']> }) {
	return (
		<Grid columns={{ minWidth: 200, max: Math.min(parts.length, 3) }} columnGap={6} rowGap={3}>
			{parts.map((part) => (
				<VStack key={part.label} gap={0.5}>
					<PartLabel part={part} />
					{part.text === undefined ? null : (
						<Text type="supporting" color="secondary">
							{part.text}
						</Text>
					)}
				</VStack>
			))}
		</Grid>
	);
}

function StepText({ step }: { step: FigureStep }) {
	return (
		<VStack gap={3}>
			<VStack gap={0.5}>
				<Text type="large" weight="medium">
					{step.label}
				</Text>
				<Text type="supporting" color="secondary">
					{step.text}
				</Text>
			</VStack>
			{step.parts ? <Parts parts={step.parts} /> : null}
		</VStack>
	);
}

/** A step whose number is beside its text. */
function StepCard({
	step,
	number,
	maxWidth,
}: {
	step: FigureStep;
	number: number;
	maxWidth?: number;
}) {
	return (
		<Card variant="glass" padding={4} width="100%" maxWidth={maxWidth} elevation="med">
			<HStack gap={3} vAlign="start">
				<StackItem size="static">
					<Badge label={String(number)} />
				</StackItem>
				<StackItem size="fill">
					<StepText step={step} />
				</StackItem>
			</HStack>
		</Card>
	);
}

/** A step in a row: its number above its text, because the card is narrow. */
function RowStepCard({ step, number }: { step: FigureStep; number: number }) {
	return (
		<Card variant="glass" padding={4} elevation="med">
			<VStack gap={3} hAlign="start">
				<Badge label={String(number)} />
				<StepText step={step} />
			</VStack>
		</Card>
	);
}

function Sequence({ figure }: { figure: SequenceFigure }) {
	if (figure.layout === 'row') {
		return (
			<Grid columns={{ minWidth: 200, max: figure.steps.length }} gap={3}>
				{figure.steps.map((step, at) => (
					<RowStepCard key={step.label} step={step} number={at + 1} />
				))}
			</Grid>
		);
	}
	return (
		<VStack gap={3} hAlign="center">
			{figure.steps.map((step, at) => (
				<StepCard key={step.label} step={step} number={at + 1} maxWidth={592} />
			))}
		</VStack>
	);
}

/** Where a lane sits on the line: the first at the start, the last at the end, a third between them. */
function laneAlign(figure: LanesFigure, lane: string): 'start' | 'center' | 'end' {
	const at = figure.lanes.indexOf(lane);
	if (at === 0) return 'start';
	return at === figure.lanes.length - 1 ? 'end' : 'center';
}

/** The widest a card in an outer lane grows. On a narrow page the card fills the line. */
const OUTER_LANE_WIDTH = 400;

/**
 * Each step sits in the lane of the actor that did it, so the path of the turn shows who acted.
 * A step in the middle lane spans the line, because the turn crosses that lane each time.
 */
function Lanes({ figure }: { figure: LanesFigure }) {
	return (
		<VStack gap={3}>
			<MediaTheme mode="dark">
				<Grid columns={figure.lanes.length} gap={3}>
					{figure.lanes.map((lane) => (
						<HStack key={lane} hAlign={laneAlign(figure, lane)}>
							<Text type="label" weight="medium">
								{lane}
							</Text>
						</HStack>
					))}
				</Grid>
			</MediaTheme>
			{figure.steps.map((step, at) => (
				<HStack key={step.label} hAlign={laneAlign(figure, step.lane)}>
					<StepCard
						step={step}
						number={at + 1}
						maxWidth={laneAlign(figure, step.lane) === 'center' ? undefined : OUTER_LANE_WIDTH}
					/>
				</HStack>
			))}
		</VStack>
	);
}

/** A `figure` fence: its steps in order, each on its own card over the still. */
export function DocsFigure({ figure }: { figure: DocFigure }) {
	const still = {
		'--figure-still': `url("${figure.still.src}")`,
		'--figure-position': figure.still.position,
	} as CSSProperties;
	return (
		<VStack gap={2} role="figure" aria-label={figure.caption}>
			<Card variant="still" padding={6} style={still}>
				{figure.kind === 'lanes' ? <Lanes figure={figure} /> : <Sequence figure={figure} />}
			</Card>
			<Text type="supporting" color="secondary">
				{figure.caption}
			</Text>
		</VStack>
	);
}
