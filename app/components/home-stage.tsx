import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { IconBrush, IconCircleDot, IconShieldCheck } from '@tabler/icons-react';
import type { RefObject } from 'react';
import { HomeIntro } from './home-intro';
import './home-stage.css';

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
				<Heading level={3}>{still.title}</Heading>
				<Text>{still.text}</Text>
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
							<span className="home-stage-line is-quiet">Agents are</span>
							<span className="home-stage-line is-quiet">probabilistic.</span>
							<span className="home-stage-line is-claim">Your architecture</span>
							<span className="home-stage-line is-claim">shouldn’t be.</span>
						</Heading>
						<Text className="home-stage-statement">{ARGUMENT}</Text>
					</div>
					<div className="home-stage-stills">
						{STILLS.map((still) => (
							<StillRow key={still.title} still={still} />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

/** Landing, then overview. Showcase is the next screen. */
export function HomeStage({ scrollRoot }: { scrollRoot: RefObject<HTMLDivElement | null> }) {
	return <HomeIntro scrollRoot={scrollRoot} next={<StageCopy />} />;
}
