import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { Heading } from '@astryxdesign/core/Heading';
import { useClipboard } from '@astryxdesign/core/hooks';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { IconCheck, IconTerminal2 } from '@tabler/icons-react';
import { useBootHold } from '@theoremjs/studio/ui/boot-mark.tsx';
import { SHELL_REVEAL } from '@theoremjs/studio/ui/shell-motion.ts';
import { PAGE_ICONS } from '@theoremjs/studio/ui/studio-shell.tsx';
import {
	type ComponentProps,
	lazy,
	type RefObject,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import { INSTALL_COMMANDS, PACKAGE_TILES, type PackageId } from '../../lib/home-content';
import { stillRenditions } from '../../lib/stills';
import { useScrollStops } from '../home-scroll-stops';
import { openedOn, useDrawn } from '../opening-screen';
import { Statement } from '../statement';
import { createPackagesPull } from './packages-pull';
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

const AgentsMap = lazy(() => import('./agents-map'));

/** What a tile shows of its package, live, over its still. */
const LIVE: Partial<Record<TileId, ReturnType<typeof lazy>>> = {
	agents: AgentsMap,
	studio: lazy(() => import('./studio-editor')),
	interface: lazy(() => import('./interface-chat')),
};

/** How long the page is left alone before a tile's live piece is fetched, as the goals' agent is. */
const LIVE_IDLE_MS = 1500;

const opensOnPackages = () => openedOn((id) => id === 'packages' || id === 'agents');

/**
 * A tile's live piece, fetched once the page has been left alone. When the page opens on this
 * screen it is fetched at once, and the loading mark waits until it has drawn.
 */
function LateLive({ id, props }: { id: TileId; props?: ComponentProps<typeof AgentsMap> }) {
	const [isDue, setIsDue] = useState(false);
	const box = useRef<HTMLDivElement>(null);
	const [boxes] = useState(() => [box]);
	useBootHold(useDrawn(boxes), opensOnPackages);
	useEffect(() => {
		if (opensOnPackages()) {
			setIsDue(true);
			return;
		}
		const timer = setTimeout(() => {
			setIsDue(true);
		}, LIVE_IDLE_MS);
		return () => {
			clearTimeout(timer);
		};
	}, []);
	const Live = LIVE[id];
	return (
		<div className="packages-live" ref={box}>
			{isDue && Live ? (
				<Suspense fallback={null}>
					<Live {...props} />
				</Suspense>
			) : null}
		</div>
	);
}

/** When the page opens on this screen, its stills load at once and the loading mark waits for them. */
function useStillsHold(row: RefObject<HTMLUListElement | null>) {
	const [isDecoded, setIsDecoded] = useState(false);
	useBootHold(isDecoded, opensOnPackages);
	useEffect(() => {
		const stills = [...(row.current?.querySelectorAll('img') ?? [])];
		if (!opensOnPackages()) return;
		let live = true;
		for (const still of stills) still.loading = 'eager';
		void Promise.allSettled(stills.map((still) => still.decode())).then(() => {
			if (live) setIsDecoded(true);
		});
		return () => {
			live = false;
		};
	}, [row]);
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

/** How much of the screen is in before the stills rise. */
const ARRIVE_AT = 0.35;

/**
 * The stills wait below while the screen is away and rise once it comes in. Under the loading
 * mark they wait until the mark gives way, so they rise as the page is shown.
 */
function useArrival() {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const frame = ref.current;
		if (!frame) return;
		const covered = () => document.documentElement.hasAttribute('data-boot-pending');
		const arrive = () => {
			if (covered()) return;
			delete frame.dataset.waiting;
		};
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.intersectionRatio >= ARRIVE_AT) arrive();
					else if (!entry.isIntersecting) frame.dataset.waiting = '';
				}
			},
			{ root: frame.closest('.home-scroll'), threshold: [0, ARRIVE_AT] },
		);
		frame.dataset.waiting = '';
		observer.observe(frame);
		const onReveal = () => {
			const box = frame.getBoundingClientRect();
			if (box.top < window.innerHeight * (1 - ARRIVE_AT) && box.bottom > 0) {
				delete frame.dataset.waiting;
			}
		};
		window.addEventListener(SHELL_REVEAL, onReveal);
		return () => {
			observer.disconnect();
			window.removeEventListener(SHELL_REVEAL, onReveal);
			delete frame.dataset.waiting;
		};
	}, []);
	return ref;
}

/**
 * The packages and their run: one screen of travel after them. Scroll holds the screen, and the Agents
 * still widens to the larger side of the golden ratio on the left as the others leave, its words
 * and shade fading; once it rests there, its map draws more. The pull is 0 on the packages and 1 on agents.
 */
function usePackagesRun(scrollRoot: RefObject<HTMLElement | null>) {
	const runRef = useRef<HTMLElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [pull] = useState(createPackagesPull);
	const onPull = useCallback(
		(run: HTMLElement, value: number) => {
			run.style.setProperty('--packages-pull', String(value));
			pull.set(value);
			setIsOpen(value === 1);
		},
		[pull],
	);
	const onClear = useCallback(
		(run: HTMLElement) => {
			run.style.removeProperty('--packages-pull');
			pull.set(0);
			setIsOpen(false);
		},
		[pull],
	);
	const onRest = useCallback(() => {}, []);
	useScrollStops({
		scrollRoot,
		runRef,
		stop: 'packages-stop',
		lead: true,
		onPull,
		onRest,
		onClear,
	});
	return { runRef, isOpen, pull };
}

/** The screen after the goals: the packages, one tall still each. Each names its package, says what it is, and installs it. */
export function PackagesBoard({ scrollRoot }: { scrollRoot: RefObject<HTMLElement | null> }) {
	const { runRef, isOpen, pull } = usePackagesRun(scrollRoot);
	const frameRef = useArrival();
	const rowRef = useRef<HTMLUListElement>(null);
	useStillsHold(rowRef);
	return (
		<section
			ref={runRef}
			className="packages-run"
			id="packages"
			aria-label="Packages"
			data-open={isOpen ? '' : undefined}
		>
			<div className="packages-pin">
				<div className="packages-frame" ref={frameRef}>
					<ul className="packages-row" ref={rowRef}>
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
									<LateLive id={id} {...(id === 'agents' ? { props: { pull } } : {})} />
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
			</div>
			<div className="packages-stop" id="agents" data-home-stop="agents" aria-hidden />
		</section>
	);
}
