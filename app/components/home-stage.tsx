import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { IconBrush, IconCircleDot, IconShieldCheck } from '@tabler/icons-react';
import type { RefObject } from 'react';
import { ARGUMENT, GOALS, HEADLINE } from '../lib/home-content';
import { HomeIntro } from './home-intro';
import { StillText, StillTitle } from './still-caption';
import './home-stage.css';

const GOAL_ICONS = {
	'source-of-truth': IconCircleDot,
	experiment: IconBrush,
	boundaries: IconShieldCheck,
} as const;

type Still = (typeof GOALS)[number];

function StillRow({ still }: { still: Still }) {
	const Icon = GOAL_ICONS[still.id];
	return (
		<figure className="home-stage-still">
			<div className="home-stage-still-media">
				<img src={still.src} alt={still.alt} decoding="async" fetchPriority="low" />
				<span className="home-stage-still-icon" aria-hidden>
					<Icon size={40} stroke={1.5} />
				</span>
			</div>
			<figcaption>
				<StillTitle>{still.title}</StillTitle>
				<StillText>{still.text}</StillText>
			</figcaption>
		</figure>
	);
}

function StageCopy() {
	return (
		<div className="home-hero-copy">
			<div className="home-stage-frame">
				<div className="home-stage-split">
					<div className="home-stage-lead">
						<Heading className="home-stage-headline" level={2}>
							{HEADLINE.map(({ text, claim }) => (
								<span key={text} className={`home-stage-line ${claim ? 'is-claim' : 'is-quiet'}`}>
									{text}
								</span>
							))}
						</Heading>
						<Text className="home-stage-statement">{ARGUMENT}</Text>
					</div>
					<VStack className="home-stage-stills" gap={4} justify="center">
						{GOALS.map((still) => (
							<StillRow key={still.title} still={still} />
						))}
					</VStack>
				</div>
			</div>
		</div>
	);
}

/** Landing, then overview. Showcase is the next screen. */
export function HomeStage({ scrollRoot }: { scrollRoot: RefObject<HTMLDivElement | null> }) {
	return <HomeIntro scrollRoot={scrollRoot} next={<StageCopy />} />;
}
