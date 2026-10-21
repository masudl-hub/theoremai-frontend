import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { INSTALL_COMMANDS } from '../../lib/home-content';
import { stillRenditions } from '../../lib/stills';
import './packages.css';

type PackageId = (typeof INSTALL_COMMANDS)[number]['id'];

/** Each package's still, and where its crop sits: the quiet part of the picture is under the words. */
const STILLS: Record<PackageId, { src: string; position: string }> = {
	agents: { src: '/imagery/th30_ocean.png', position: '30% 50%' },
	web: { src: '/imagery/th30_tropicalforest.png', position: '50% 50%' },
	react: { src: '/imagery/th30_violetheather.png', position: '20% 50%' },
	studio: { src: '/imagery/th30_maplecanopies.png', position: '40% 50%' },
};

/** The screen after the goals: the four packages, one tall still each, named on the picture. */
export function PackagesBoard() {
	return (
		<div className="packages-frame">
			<ul className="packages-row">
				{INSTALL_COMMANDS.map(({ id, label, lead }) => {
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
									{label}
								</Heading>
								<Text className="packages-lead">{lead}</Text>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
