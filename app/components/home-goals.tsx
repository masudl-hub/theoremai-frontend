import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Token } from '@astryxdesign/core/Token';
import { IconListDetails } from '@tabler/icons-react';
import { type CSSProperties, useState } from 'react';
import { GOAL_BEATS, type GoalBeat, type GoalToken } from '../lib/home-goals';
import { GOALS } from '../lib/site-pitch';
import { Statement } from './statement';
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
	out['--home-goal-walk'] =
		`calc(${GOALS.map((_, index) => `${String(index)} * var(--home-goal-grow-${String(index)})`).join(' + ')})`;
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

/** Names between backticks are set as docs sets them: a name the catalog defines shows its card. */
function GoalExamples({
	tokens,
	isOn,
	onPick,
}: {
	tokens: readonly GoalToken[];
	isOn: (token: GoalToken) => boolean;
	onPick: (token: GoalToken) => void;
}) {
	const extras = tokens.slice(2);
	const [selected, setSelected] = useState<GoalToken>();
	const visible = [...tokens.slice(0, 2), ...(selected && isOn(selected) ? [selected] : [])];
	return (
		<div className="home-goal-tokens">
			{visible.map((token) => (
				<Token
					key={token.id}
					label={token.label}
					color={isOn(token) ? 'blue' : 'default'}
					aria-pressed={isOn(token)}
					onClick={() => {
						onPick(token);
					}}
				/>
			))}
			{extras.length ? (
				<DropdownMenu
					presentation="popover"
					menuWidth={360}
					menuMaxHeight={360}
					renderTrigger={(props) => (
						<IconButton
							{...props}
							label="Show all examples"
							tooltip="Show all examples"
							variant="ghost"
							size="sm"
							icon={<Icon icon={IconListDetails} size="sm" />}
						/>
					)}
				>
					{tokens.map((token) => (
						<DropdownMenuItem
							key={token.id}
							label={token.label}
							description={token.description ?? token.prompt}
							onClick={() => {
								if (extras.includes(token)) setSelected(token);
								onPick(token);
							}}
						/>
					))}
				</DropdownMenu>
			) : null}
		</div>
	);
}

/** A beat's place in the left column: the goal, the lede, how it works, and the changes. */
export function GoalBlock({
	beat,
	number,
	isOn,
	onPick,
}: {
	beat: GoalBeat;
	number: number;
	/** Whether the agent has a token's change now. */
	isOn: (token: GoalToken) => boolean;
	onPick: (token: GoalToken) => void;
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
			<Heading className="home-stage-headline home-goal-lede" level={2}>
				<span className="home-stage-line is-quiet">{beat.lede}</span>
			</Heading>
			<Statement>{beat.explainer}</Statement>
			{beat.controls.map(({ label, tokens }) => (
				<div key={label} className="home-goal-controls" role="group" aria-label={label}>
					<GoalExamples tokens={tokens} isOn={isOn} onPick={onPick} />
				</div>
			))}
		</section>
	);
}
