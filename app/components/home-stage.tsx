import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { IconBrush, IconCircleDot, IconShieldCheck } from '@tabler/icons-react';
import { type RefObject, useState } from 'react';
import { Link } from 'react-router';
import { HEADLINE } from '../lib/home-content';
import { GOAL_BEATS } from '../lib/home-goals';
import { ARGUMENT, GOALS } from '../lib/site-pitch';
import { GoalBlock, GoalStage, goalStackVars, goalTileVars, type PickedTokens } from './home-goals';
import { HomeIntro } from './home-intro';
import { StillText, StillTitle } from './still-caption';
import './home-stage.css';

const GOAL_ICONS = {
	'source-of-truth': IconCircleDot,
	experiment: IconBrush,
	boundaries: IconShieldCheck,
} as const;

type Still = (typeof GOALS)[number];

/** A tile is also the way to its goal: the small ones are the map of the goals screen. */
function StillRow({ still, index }: { still: Still; index: number }) {
	const Icon = GOAL_ICONS[still.id];
	return (
		<figure className="home-stage-still" style={goalTileVars(index)}>
			<Link
				className="home-stage-still-media"
				to={{ hash: `#${still.id}` }}
				preventScrollReset
				aria-label={`Go to: ${still.title}`}
			>
				<img src={still.src} alt={still.alt} decoding="async" fetchPriority="low" />
				<span className="home-stage-still-icon" aria-hidden>
					<Icon size={40} stroke={1.5} />
				</span>
			</Link>
			<figcaption>
				<StillTitle>{still.title}</StillTitle>
				<StillText>{still.text}</StillText>
			</figcaption>
		</figure>
	);
}

const STACK_VARS = goalStackVars();

function StageCopy() {
	const [picked, setPicked] = useState<PickedTokens>({});
	return (
		<div className="home-hero-copy">
			<div className="home-stage-frame">
				<div className="home-stage-split">
					<div className="home-stage-leads">
						<div className="home-stage-lead home-goal-block" data-home-beat={0}>
							<Heading className="home-stage-headline" level={2}>
								{HEADLINE.map(({ text, claim }) => (
									<span key={text} className={`home-stage-line ${claim ? 'is-claim' : 'is-quiet'}`}>
										{text}
									</span>
								))}
							</Heading>
							<Text className="home-stage-statement">{ARGUMENT}</Text>
						</div>
						{GOAL_BEATS.map((beat, index) => (
							<GoalBlock
								key={beat.lede}
								beat={beat}
								number={index + 1}
								picked={picked[index + 1]}
								onPick={(token) => {
									setPicked((now) => ({ ...now, [index + 1]: token }));
								}}
							/>
						))}
					</div>
					<VStack className="home-stage-stills" gap={4} justify="center" style={STACK_VARS}>
						{GOALS.map((still, index) => (
							<StillRow key={still.title} still={still} index={index} />
						))}
						{GOAL_BEATS.map((beat, index) => (
							<GoalStage
								key={beat.lede}
								beat={beat}
								number={index + 1}
								picked={picked[index + 1]}
							/>
						))}
					</VStack>
				</div>
			</div>
		</div>
	);
}

const GOAL_STOPS = GOAL_BEATS.map(({ goal }) => goal);

/** Landing, then overview, then the beats of the three goals. Showcase is the next screen. */
export function HomeStage({ scrollRoot }: { scrollRoot: RefObject<HTMLDivElement | null> }) {
	return <HomeIntro scrollRoot={scrollRoot} next={<StageCopy />} stops={GOAL_STOPS} />;
}
