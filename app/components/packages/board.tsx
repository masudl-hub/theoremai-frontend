import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { Heading } from '@astryxdesign/core/Heading';
import { useClipboard } from '@astryxdesign/core/hooks';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { IconCheck, IconTerminal2 } from '@tabler/icons-react';
import { PAGE_ICONS } from '@theoremjs/studio/ui/studio-shell.tsx';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { INSTALL_COMMANDS, PACKAGE_TILES, type PackageId } from '../../lib/home-content';
import { stillRenditions } from '../../lib/stills';
import { Statement } from '../statement';
import '../install-copy.css';
import './packages.css';

type TileId = (typeof PACKAGE_TILES)[number]['id'];

/** Each tile's still, and where its crop sits. */
const STILLS: Record<TileId, { src: string; position: string }> = {
	agents: { src: '/imagery/th30_ocean.png', position: '30% 50%' },
	studio: { src: '/imagery/th30_maplecanopies.png', position: '40% 50%' },
	interface: { src: '/imagery/th30_tropicalforest.png', position: '0% 50%' },
};

const DocsIcon = PAGE_ICONS.Docs;

const InterfaceChat = lazy(() => import('./interface-chat'));

/** How long the page is left alone before the interface tile's chat is fetched, as the goals' agent is. */
const CHAT_IDLE_MS = 1500;

/** The interface tile's chat, fetched once the page has been left alone. */
function LateInterfaceChat() {
	const [isDue, setIsDue] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => {
			setIsDue(true);
		}, CHAT_IDLE_MS);
		return () => {
			clearTimeout(timer);
		};
	}, []);
	return isDue ? (
		<Suspense fallback={null}>
			<InterfaceChat />
		</Suspense>
	) : null;
}

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

/** A package's name in a tile's description: hovering shows its install command, pressing copies it. */
function PackageName({ label, command }: { label: string; command: string }) {
	const { copy, isCopied } = useClipboard({ announce: 'Install command copied' });
	const ref = useRef<HTMLButtonElement>(null);
	return (
		<>
			<button
				ref={ref}
				type="button"
				className="install-copy-package"
				aria-label={`${label}. Copy ${command}`}
				onClick={() => {
					void copy(command);
				}}
			>
				{label}
			</button>
			<Tooltip content={isCopied ? 'Copied' : command} anchorRef={ref} />
		</>
	);
}

/** Draws a backticked name that is one of the tile's packages as its `PackageName`. */
function packageNames(packages: readonly PackageId[]) {
	return (text: string) => {
		const pkg = INSTALL_COMMANDS.find(({ id, label }) => label === text && packages.includes(id));
		return pkg ? <PackageName key={text} label={pkg.label} command={pkg.command} /> : undefined;
	};
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
							{id === 'interface' ? <LateInterfaceChat /> : null}
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
								<Statement className="packages-description" name={packageNames(packages)}>
									{description}
								</Statement>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
