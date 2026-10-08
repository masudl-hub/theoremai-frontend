import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { useClipboard } from '@astryxdesign/core/hooks';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { KERNEL_INSTALL_CMD } from '../lib/home-content';
import { SITE_PACKAGES, SITE_SECTIONS } from '../lib/site-nav';
import { HOME_TAGLINE } from '../lib/site-pitch';
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
	const icon = <Icon size={26} stroke="1.75" aria-hidden />;
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
				size="md"
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

function InstallCopy() {
	const { copy, isCopied } = useClipboard({ announce: 'Install command copied' });
	return (
		<Button
			className="home-intro-install"
			variant="ghost"
			size="sm"
			label={isCopied ? 'Copied' : KERNEL_INSTALL_CMD}
			onClick={() => {
				void copy(KERNEL_INSTALL_CMD);
			}}
		/>
	);
}

function NavItems({ itemRefs }: { itemRefs: RefObject<Record<string, HTMLElement | null>> }) {
	const setItemRef = (href: string) => (node: HTMLElement | null) => {
		itemRefs.current[href] = node;
	};
	return (
		<>
			<div className="home-intro-group">
				<div className="home-intro-group-items">
					{SITE_SECTIONS.map(({ href, label, icon }) => (
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
			<div className="home-intro-group">
				<div className="home-intro-group-items">
					{SITE_PACKAGES.map(({ href, label, icon }) => (
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
}: {
	scrollRoot: RefObject<HTMLDivElement | null>;
	next: ReactNode;
}) {
	const runRef = useRef<HTMLElement>(null);
	const wordmarkTrackRef = useRef<HTMLDivElement>(null);
	const wordmarkRef = useRef<HTMLHeadingElement>(null);
	const itemRefs = useRef<Record<string, HTMLElement | null>>({});
	const [flightReady, setFlightReady] = useState(false);
	useHomeIntroWordmarkFit(wordmarkTrackRef, wordmarkRef);
	const { reduced } = useHomeIntroScroll(scrollRoot, runRef, itemRefs, flightReady);

	useLayoutEffect(() => {
		setFlightReady(!reduced);
	}, [reduced]);

	const nav = <NavItems itemRefs={itemRefs} />;

	return (
		<section ref={runRef} className="home-contract" data-reduced={reduced ? '' : undefined}>
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
							<Heading level={2} className="home-intro-tagline">
								{HOME_TAGLINE}
							</Heading>
						</div>

						<div className="home-intro-spacer" aria-hidden />
					</div>
					<div className="home-intro-bottom">
						<div className="home-intro-install-row home-intro-chrome">
							<InstallCopy />
						</div>
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
		</section>
	);
}
