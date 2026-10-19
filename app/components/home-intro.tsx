import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { useClipboard } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { IconAlpha, IconCheck, IconCopy } from '@tabler/icons-react';
import {
	type CSSProperties,
	type ReactNode,
	type RefObject,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { INSTALL_COMMANDS } from '../lib/home-content';
import { SITE_PACKAGES, SITE_SECTIONS } from '../lib/site-nav';
import { EARLY_DAYS, HOME_TAGLINE } from '../lib/site-pitch';
import { useHomeGoalsScroll } from './home-goals-pull';
import { useHomeIntroWordmarkFit } from './home-intro-wordmark-fit';
import { useHomeIntroScroll } from './home-shell-pull';
import { NewTabLink } from './links';
import './home-intro.css';

function IntroNavItem({
	href,
	label,
	icon: Icon,
	innerRef,
}: {
	href: string;
	label: string;
	icon: (typeof SITE_SECTIONS)[number]['icon'] | (typeof SITE_PACKAGES)[number]['icon'];
	innerRef?: (node: HTMLElement | null) => void;
}) {
	const slotRef = useRef<HTMLDivElement>(null);
	const external = href.startsWith('http');
	const icon = <Icon stroke="1.75" aria-hidden />;
	return (
		<div
			ref={(node) => {
				slotRef.current = node;
				innerRef?.(node);
			}}
			className="home-intro-nav-slot"
		>
			<Button
				as={external ? NewTabLink : undefined}
				variant="ghost"
				size="lg"
				href={href}
				label={label}
				icon={icon}
				isIconOnly
				data-home-intro-nav={href}
			/>
			<Tooltip content={label} placement="end" anchorRef={slotRef} />
		</div>
	);
}

/** A package's install command to copy, and the switch between packages; the switch stays put as the command changes length. */
function InstallCopy() {
	const { copy, isCopied } = useClipboard({ announce: 'Install command copied' });
	const [chosen, setChosen] = useState<string>(INSTALL_COMMANDS[0].id);
	const { command } = INSTALL_COMMANDS.find(({ id }) => id === chosen) ?? INSTALL_COMMANDS[0];
	return (
		<div className="home-intro-install">
			<Button
				className="home-intro-install-copy"
				variant="ghost"
				size="sm"
				icon={isCopied ? <IconCheck aria-hidden /> : <IconCopy aria-hidden />}
				label={isCopied ? 'Copied' : command}
				onClick={() => {
					void copy(command);
				}}
			/>
			<SegmentedControl label="Package" size="sm" value={chosen} onChange={setChosen}>
				{INSTALL_COMMANDS.map(({ id, label }) => (
					<SegmentedControlItem key={id} value={id} label={label} />
				))}
			</SegmentedControl>
		</div>
	);
}

/** Where Theorem stands, over the tagline: early, and changing. */
function EarlyDays() {
	return (
		<span className="home-intro-status">
			<Tooltip content={EARLY_DAYS.note} placement="end" focusTrigger="always" touchTrigger="tap">
				<Token
					label={EARLY_DAYS.label}
					size="sm"
					icon={<Icon icon={IconAlpha} size="sm" />}
					tabIndex={0}
				/>
			</Tooltip>
		</span>
	);
}

function NavItems({ itemRefs }: { itemRefs: RefObject<Record<string, HTMLElement | null>> }) {
	const setItemRef = (href: string) => (node: HTMLElement | null) => {
		itemRefs.current[href] = node;
	};
	return (
		<>
			{[SITE_SECTIONS, SITE_PACKAGES].map((group) => (
				<div key={group[0]?.href} className="home-intro-group">
					<div className="home-intro-group-items">
						{group.map(({ href, label, icon }) => (
							<IntroNavItem
								key={href}
								href={href}
								label={label}
								icon={icon}
								innerRef={setItemRef(href)}
							/>
						))}
					</div>
				</div>
			))}
		</>
	);
}

function NavSpacers() {
	return (
		<div className="home-intro-groups" aria-hidden>
			<div className="home-intro-group">
				<div className="home-intro-group-items">
					{SITE_SECTIONS.map(({ href }) => (
						<div key={href} className="home-intro-nav-spacer" data-home-nav-from={href} />
					))}
				</div>
			</div>
			<div className="home-intro-group">
				<div className="home-intro-group-items">
					{SITE_PACKAGES.map(({ href }) => (
						<div key={href} className="home-intro-nav-spacer" data-home-nav-from={href} />
					))}
				</div>
			</div>
		</div>
	);
}

export function HomeIntro({
	scrollRoot,
	next,
	stops,
}: {
	scrollRoot: RefObject<HTMLDivElement | null>;
	next: ReactNode;
	/** One scroll stop after overview for each entry. Each names the screen it belongs to. */
	stops: readonly string[];
}) {
	const runRef = useRef<HTMLElement>(null);
	const wordmarkTrackRef = useRef<HTMLDivElement>(null);
	const wordmarkRef = useRef<HTMLHeadingElement>(null);
	const itemRefs = useRef<Record<string, HTMLElement | null>>({});
	const [flightReady, setFlightReady] = useState(false);
	useHomeIntroWordmarkFit(wordmarkTrackRef, wordmarkRef);
	const { reduced } = useHomeIntroScroll(scrollRoot, runRef, itemRefs, flightReady);
	useHomeGoalsScroll(scrollRoot, runRef, reduced);

	useLayoutEffect(() => {
		setFlightReady(!reduced);
	}, [reduced]);

	const nav = <NavItems itemRefs={itemRefs} />;

	return (
		<section
			ref={runRef}
			className="home-contract"
			data-reduced={reduced ? '' : undefined}
			style={{ '--home-goal-stops': stops.length } as CSSProperties}
		>
			<div className="home-contract-frame">
				<section id="landing" className="home-intro-pin" aria-label="Landing">
					<div className="home-intro-card">
						<div className="home-intro-top">
							{flightReady ? (
								<>
									<NavSpacers />
									{createPortal(
										<div className="home-intro-flight">
											<div className="home-intro-groups">{nav}</div>
										</div>,
										document.body,
									)}
								</>
							) : (
								<div className="home-intro-groups">{nav}</div>
							)}
							<div className="home-intro-install-row home-intro-chrome">
								<InstallCopy />
							</div>
						</div>

						<div className="home-intro-spacer" aria-hidden />
					</div>
					<div className="home-intro-bottom">
						<EarlyDays />
						<Heading level={2} className="home-intro-tagline" textWrap="balance">
							{HOME_TAGLINE}
						</Heading>
						<div ref={wordmarkTrackRef} className="home-intro-wordmark-track">
							<Heading ref={wordmarkRef} className="home-intro-wordmark" level={1} hasCapsize>
								theorem
							</Heading>
						</div>
					</div>
				</section>
				<section
					id="overview"
					className="home-contract-next home-page home-stage-page"
					aria-label="Overview"
				>
					{next}
				</section>
			</div>
			<div className="home-contract-settle" aria-hidden />
			{stops.map((screen, index) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: a screen may own several stops, in a fixed order
					key={index}
					className="home-goal-stop"
					data-home-stop={screen}
					aria-hidden
				/>
			))}
		</section>
	);
}
