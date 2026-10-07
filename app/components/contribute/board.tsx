import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { IconBrandDiscord, IconBug, IconCode, IconLock } from '@tabler/icons-react';
import type { ComponentType } from 'react';
import { CONTRIBUTE_INTRO, WAYS } from '../../lib/home-content';
import { NewTabLink } from '../links';
import { StillText, StillTitle } from '../still-caption';
import '../home-stage.css';
import './contribute.css';

type Way = (typeof WAYS)[number];

const WAY_ICONS: Record<Way['id'], ComponentType<{ size?: number; stroke?: number }>> = {
	issue: IconBug,
	code: IconCode,
	discord: IconBrandDiscord,
	security: IconLock,
};

function WayTile({ way }: { way: Way }) {
	const Icon = WAY_ICONS[way.id];
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
						<Text color="secondary">{CONTRIBUTE_INTRO}</Text>
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
