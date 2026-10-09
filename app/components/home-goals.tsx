import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import type { CSSProperties, ReactNode } from 'react';
import { GOAL_BEATS, type GoalBeat, type GoalToken } from '../lib/home-goals';
import { GOALS } from '../lib/site-pitch';
import './home-goals.css';

/** The picked token of each beat, by beat number. Overview is beat 0, so the first beat is 1. */
export type PickedTokens = Readonly<Record<number, GoalToken | undefined>>;

function vars(values: Record<string, string | number>): CSSProperties {
	return values;
}

const goalIndex = (beat: GoalBeat) => GOALS.findIndex(({ id }) => id === beat.goal);

/**
 * How large each tile is at any scroll position, as custom properties for the tile stack. A
 * tile is large for every beat of its goal, and the other two are small for as long as any
 * goal is open.
 */
export function goalStackVars(): CSSProperties {
	const out: Record<string, string> = {};
	GOALS.forEach(({ id }, index) => {
		const first = GOAL_BEATS.findIndex(({ goal }) => goal === id);
		const last = GOAL_BEATS.findLastIndex(({ goal }) => goal === id) + 1;
		const grow = `--home-goal-grow-${String(index)}`;
		out[grow] =
			`calc(clamp(0, var(--home-goal-at) - ${String(first)}, 1) - clamp(0, var(--home-goal-at) - ${String(last)}, 1))`;
		out[`--home-goal-size-${String(index)}`] =
			`calc(1 + (var(--home-goal-ratio, 1) - 1) * var(${grow}) - (1 - var(--home-goal-small)) * (var(--home-goal-in) - var(${grow})))`;
	});
	return vars(out);
}

/** One tile's own share of the stack: its growth, its size, and how far the tiles above push it. */
export function goalTileVars(index: number): CSSProperties {
	const above = GOALS.slice(0, index)
		.map((_, other) => `(var(--home-goal-size-${String(other)}) - 1)`)
		.join(' + ');
	return vars({
		'--home-goal-grow': `var(--home-goal-grow-${String(index)})`,
		'--home-goal-size': `var(--home-goal-size-${String(index)})`,
		'--home-goal-above': above === '' ? '0' : `calc(${above})`,
	});
}

/** A beat's place in the left column: the goal, the lede, how it works, and the changes. */
export function GoalBlock({
	beat,
	number,
	picked,
	onPick,
}: {
	beat: GoalBeat;
	number: number;
	picked: GoalToken | undefined;
	onPick: (token: GoalToken | undefined) => void;
}) {
	const goal = GOALS[goalIndex(beat)];
	const opensGoal = GOAL_BEATS.findIndex(({ goal: id }) => id === beat.goal) === number - 1;
	return (
		<section
			id={opensGoal ? beat.goal : undefined}
			className="home-stage-lead home-goal-block home-goal-beat"
			aria-label={goal.title}
			data-home-beat={number}
			style={vars({ '--home-goal-beat': number })}
		>
			<Text className="home-goal-name" color="secondary" weight="semibold">
				{goal.title}
			</Text>
			<Heading className="home-goal-lede" level={2}>
				{beat.lede}
			</Heading>
			<Text className="home-stage-statement">{beat.explainer}</Text>
			{beat.controls.map(({ label, tokens }) => (
				<div key={label} className="home-goal-controls" role="group" aria-label={label}>
					<Text className="home-goal-controls-label" size="sm" color="secondary">
						{label}
					</Text>
					<div className="home-goal-tokens">
						{tokens.map((token) => (
							<ToggleButton
								key={token.label}
								size="sm"
								label={token.label}
								isPressed={picked === token}
								onPressedChange={(isPressed) => {
									onPick(isPressed ? token : undefined);
								}}
							/>
						))}
					</div>
				</div>
			))}
		</section>
	);
}

/**
 * What sits on a goal's large still for one beat. `children` is the live part, inset on the
 * still. The prompt says what to try after a change.
 */
export function GoalStage({
	beat,
	number,
	picked,
	children,
}: {
	beat: GoalBeat;
	number: number;
	picked: GoalToken | undefined;
	children?: ReactNode;
}) {
	return (
		<div
			className="home-goal-stage"
			data-home-beat={number}
			style={vars({ '--home-goal-beat': number, '--home-goal-slot': goalIndex(beat) })}
		>
			{children ? <div className="home-goal-stage-inset">{children}</div> : null}
			<div className="home-goal-prompt" aria-live="polite">
				{picked ? <Text weight="medium">{picked.prompt}</Text> : null}
			</div>
		</div>
	);
}
