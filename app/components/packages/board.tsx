import { Heading } from '@astryxdesign/core/Heading';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { PAGE_ICONS } from '@theoremjs/studio/ui/studio-shell.tsx';
import { PACKAGE_TILES } from '../../lib/home-content';
import { stillRenditions } from '../../lib/stills';
import { InstallCopy } from '../install-copy';
import './packages.css';

type TileId = (typeof PACKAGE_TILES)[number]['id'];

/** Each tile's still, and where its crop sits. */
const STILLS: Record<TileId, { src: string; position: string }> = {
	agents: { src: '/imagery/th30_ocean.png', position: '30% 50%' },
	studio: { src: '/imagery/th30_maplecanopies.png', position: '40% 50%' },
	interface: { src: '/imagery/th30_tropicalforest.png', position: '0% 50%' },
};

const DocsIcon = PAGE_ICONS.Docs;

/** The screen after the goals: the packages, one tall still each. Each names its package, says what it is, and installs it. */
export function PackagesBoard() {
	return (
		<div className="packages-frame">
			<ul className="packages-row">
				{PACKAGE_TILES.map(({ id, title, description, packages, docs }) => {
					const still = STILLS[id];
					const isExternal = docs.startsWith('http');
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
								<Text color="secondary" className="packages-description">
									{description}
								</Text>
								<div className="packages-install">
									<InstallCopy packages={packages} />
									<IconButton
										label={`${title} docs`}
										tooltip="Docs"
										variant="ghost"
										href={docs}
										{...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
										icon={<DocsIcon aria-hidden />}
									/>
								</div>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
