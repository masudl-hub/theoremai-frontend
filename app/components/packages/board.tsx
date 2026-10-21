import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { PACKAGE_TILES } from '../../lib/home-content';
import { stillRenditions } from '../../lib/stills';
import './packages.css';

type TileId = (typeof PACKAGE_TILES)[number]['id'];

/** Each tile's still, and where its crop sits: the quiet part of the picture is under the words. */
const STILLS: Record<TileId, { src: string; position: string }> = {
	agents: { src: '/imagery/th30_ocean.png', position: '30% 50%' },
	studio: { src: '/imagery/th30_maplecanopies.png', position: '40% 50%' },
	interface: { src: '/imagery/th30_tropicalforest.png', position: '50% 50%' },
};

/** The screen after the goals: the packages, one tall still each, named on the picture. */
export function PackagesBoard() {
	return (
		<div className="packages-frame">
			<ul className="packages-row">
				{PACKAGE_TILES.map(({ id, title, packages }) => {
					const still = STILLS[id];
					return (
						<li key={id} className="packages-tile">
							<img
								className="packages-still"
								src={stillRenditions(still.src).full}
								alt=""
								decoding="async"
								loading="lazy"
								style={{ objectPosition: still.position }}
							/>
							<div className="packages-words">
								<Heading level={2} type="display-3" className="packages-name">
									{title}
								</Heading>
								{packages.length === 1 ? (
									<Text className="packages-lead">{packages[0].lead}</Text>
								) : (
									packages.map(({ id: pkg, label, lead }) => (
										<Text key={pkg} className="packages-lead">
											<strong className="packages-lead-name">{label}.</strong> {lead}
										</Text>
									))
								)}
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
