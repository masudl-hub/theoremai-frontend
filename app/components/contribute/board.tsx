import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { IconBrandDiscord, IconBug, IconCode, IconLock } from '@tabler/icons-react';
import type { ComponentType } from 'react';
import { NewTabLink } from '../links';
import { StillText, StillTitle } from '../still-caption';
import '../home-stage.css';
import './contribute.css';

const REPO = 'https://github.com/masudl-hub/theoremai';

/** The Discord server's invite. */
const DISCORD_HREF = 'https://discord.gg/X6RQvSWQ58';

type Way = {
	id: string;
	title: string;
	note: string;
	href: string;
	icon: ComponentType<{ size?: number; stroke?: number }>;
	src: string;
};

/** The stills are the overview's kind: a place from above, with the way's icon laid over it. */
const WAYS: readonly Way[] = [
	{
		id: 'issue',
		note: 'Found a bug, or have an idea? Tell us what you ran and what happened.',
		title: 'Raise an issue',
		href: `${REPO}/issues/new`,
		icon: IconBug,
		src: '/imagery/th30_crimsoncrater.png',
	},
	{
		id: 'code',
		note: 'Set up the repo, run the checks, and send us a pull request.',
		title: 'Contribute code',
		href: `${REPO}/blob/main/CONTRIBUTING.md`,
		icon: IconCode,
		src: '/imagery/th30_braidedriver.png',
	},
	{
		id: 'discord',
		note: 'Ask questions, share what you build, and meet other builders.',
		title: 'Join the Discord',
		href: DISCORD_HREF,
		icon: IconBrandDiscord,
		src: '/imagery/th30_cherryblossoms.png',
	},
	{
		id: 'security',
		note: 'Found a security problem? Tell us privately, not in a public issue.',
		title: 'Report a vulnerability',
		href: `${REPO}/security/advisories/new`,
		icon: IconLock,
		src: '/imagery/th30_blueabyss.png',
	},
];

function WayTile({ way }: { way: Way }) {
	const Icon = way.icon;
	return (
		<NewTabLink className="contribute-tile" href={way.href}>
			<VStack gap={3}>
				<span className="home-stage-still-media contribute-tile-media">
					<img src={way.src} alt="" decoding="async" loading="lazy" />
					<span className="home-stage-still-icon" aria-hidden>
						<Icon size={40} stroke={1.5} />
					</span>
				</span>
				<VStack gap={1}>
					<StillTitle>{way.title}</StillTitle>
					<StillText maxLines={2}>{way.note}</StillText>
				</VStack>
			</VStack>
		</NewTabLink>
	);
}

/**
 * The last screen of the landing page: a heading and a line, then four ways in, one row.
 * The showcase's dotted field (`.home-dotted`, one layer under both screens) runs on behind it and fades out.
 */
export function ContributeBoard() {
	return (
		<div className="contribute-frame">
			<div className="contribute-body">
				<div className="contribute-content">
					<div className="contribute-intro">
						<Heading level={1} type="display-3">
							Contribute to the theory
						</Heading>
						<Text color="secondary">
							Theorem is open source. Questions, bugs, ideas, and code are all welcome.
						</Text>
					</div>
					<Grid columns={{ minWidth: 160, max: 4 }} gap={4} rowGap={6}>
						{WAYS.map((way) => (
							<WayTile key={way.id} way={way} />
						))}
					</Grid>
				</div>
			</div>
		</div>
	);
}
