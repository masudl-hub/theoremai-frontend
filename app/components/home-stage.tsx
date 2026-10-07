import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { IconBrush, IconCircleDot, IconShieldCheck } from '@tabler/icons-react';
import type { RefObject } from 'react';
import { HomeIntro } from './home-intro';
import { PageSummary } from './page-summary';
import { StillText, StillTitle } from './still-caption';
import './home-stage.css';

const HEADLINE = [
	{ text: 'Agents are', claim: false },
	{ text: 'probabilistic.', claim: false },
	{ text: 'Your architecture', claim: true },
	{ text: 'shouldn’t be.', claim: true },
] as const;

const ARGUMENT =
	'Agent outputs vary every turn. Users still need an experience they can understand and trust. theorem helps you build that experience around a clear agent contract.';

/**
 * Each still is the idea.
 * One river through orange rock. Saffron laid out to try.
 * Obsidian shores are the boundary.
 */
const STILLS: readonly {
	icon: typeof IconShieldCheck;
	title: string;
	text: string;
	src: string;
	alt: string;
}[] = [
	{
		icon: IconCircleDot,
		title: 'One source of truth',
		text: 'Keep execution and interface aligned, rather than maintaining separate versions of what your agent can do.',
		src: '/imagery/th30_orangecanyon.png',
		alt: 'A single river cutting through an orange canyon, with clouds and their shadows',
	},
	{
		icon: IconBrush,
		title: 'Room to experiment',
		text: 'Change models, providers, and modalities without rebuilding the surrounding application. Find what works for your agent.',
		src: '/imagery/th30_dryingsaffron.png',
		alt: 'Purple saffron laid out in plots divided by dirt paths, with clouds and their shadows',
	},
	{
		icon: IconShieldCheck,
		title: 'Built-in boundaries',
		text: 'Check what enters, what leaves, and what tools can access. Keep protections and permissions explicit.',
		src: '/imagery/th30_obsidianshores.png',
		alt: 'Black obsidian rock meeting deep teal water, with pale foam along the shore',
	},
];

type Still = (typeof STILLS)[number];

function StillRow({ still }: { still: Still }) {
	const Icon = still.icon;
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

function overviewSummary(): string {
	const headline = HEADLINE.map(({ text }) => text).join(' ');
	const goals = STILLS.map((still) => `${still.title} (${still.text})`).join('; ');
	return `${headline} ${ARGUMENT} Three goals, each with an aerial still: ${goals}.`;
}

function StageCopy() {
	return (
		<div className="home-hero-copy">
			<PageSummary name="Overview" text={overviewSummary()} />
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
						{STILLS.map((still) => (
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
