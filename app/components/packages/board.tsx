import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { Heading } from '@astryxdesign/core/Heading';
import { useClipboard } from '@astryxdesign/core/hooks';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { IconCheck, IconTerminal2 } from '@tabler/icons-react';
import { PAGE_ICONS } from '@theoremjs/studio/ui/studio-shell.tsx';
import { INSTALL_COMMANDS, PACKAGE_TILES, type PackageId } from '../../lib/home-content';
import { stillRenditions } from '../../lib/stills';
import './packages.css';

type TileId = (typeof PACKAGE_TILES)[number]['id'];

/** Each tile's still, and where its crop sits. */
const STILLS: Record<TileId, { src: string; position: string }> = {
	agents: { src: '/imagery/th30_ocean.png', position: '30% 50%' },
	studio: { src: '/imagery/th30_maplecanopies.png', position: '40% 50%' },
	interface: { src: '/imagery/th30_tropicalforest.png', position: '0% 50%' },
};

const DocsIcon = PAGE_ICONS.Docs;

/** Copies a tile's install command. With more than one package it asks which, and each choice shows its command. */
function InstallButton({ packages }: { packages: readonly PackageId[] }) {
	const { copy, isCopied } = useClipboard({ announce: 'Install command copied' });
	const shown = INSTALL_COMMANDS.filter((pkg) => packages.includes(pkg.id));
	const icon = isCopied ? <IconCheck aria-hidden /> : <IconTerminal2 aria-hidden />;
	if (shown.length === 1) {
		const { command } = shown[0];
		return (
			<IconButton
				label={isCopied ? 'Copied' : `Copy ${command}`}
				tooltip={isCopied ? 'Copied' : command}
				variant="ghost"
				icon={icon}
				onClick={() => {
					void copy(command);
				}}
			/>
		);
	}
	return (
		<DropdownMenu
			button={{
				label: isCopied ? 'Copied' : 'Copy an install command',
				tooltip: isCopied ? 'Copied' : 'Install',
				variant: 'ghost',
				isIconOnly: true,
				icon,
			}}
			hasChevron={false}
			placement="below"
			items={shown.map(({ id, label, command }) => ({
				id,
				label,
				description: command,
				onClick: () => {
					void copy(command);
				},
			}))}
		/>
	);
}

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
								<div className="packages-head">
									<Heading level={2} type="display-3" className="packages-name">
										{title}
									</Heading>
									<InstallButton packages={packages} />
									<IconButton
										label={`${title} docs`}
										tooltip="Docs"
										variant="ghost"
										href={docs}
										{...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
										icon={<DocsIcon aria-hidden />}
									/>
								</div>
								<Text className="packages-description">{description}</Text>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
