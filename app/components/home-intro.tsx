import { Button } from '@astryxdesign/core/Button';
import { useClipboard } from '@astryxdesign/core/hooks';
import { Heading } from '@astryxdesign/core/Heading';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { type RefObject, useRef } from 'react';
import { HOME_TAGLINE, KERNEL_INSTALL_CMD, SITE_PACKAGES, SITE_SECTIONS } from '../lib/site-nav';
import { useHomeIntroWordmarkFit } from './home-intro-wordmark-fit';
import { NewTabLink } from './links';
import { useHomeIntroScroll, useHomeNavFlight } from './home-shell-pull';
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

export function HomeIntro({
	scrollRoot,
}: {
	scrollRoot: RefObject<HTMLDivElement | null>;
}) {
	const runRef = useRef<HTMLElement>(null);
	const wordmarkTrackRef = useRef<HTMLDivElement>(null);
	const wordmarkRef = useRef<HTMLHeadingElement>(null);
	const itemRefs = useRef<Record<string, HTMLElement | null>>({});
	useHomeIntroWordmarkFit(wordmarkTrackRef, wordmarkRef);
	const { flight, reduced } = useHomeIntroScroll(scrollRoot, runRef);
	useHomeNavFlight(flight, itemRefs);

	const setItemRef = (href: string) => (node: HTMLElement | null) => {
		itemRefs.current[href] = node;
	};

	return (
		<section
			ref={runRef}
			className="home-intro-run"
			aria-label="Theorem"
			data-reduced={reduced ? '' : undefined}
		>
			<div className="home-intro-pin">
				<div className="home-intro-card">
					<div className="home-intro-top home-intro-chrome">
						<div className="home-intro-groups">
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
						</div>
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
						<Heading
							ref={wordmarkRef}
							className="home-intro-wordmark"
							level={1}
							hasCapsize
						>
							theorem
						</Heading>
					</div>
				</div>
			</div>
			<div className="home-intro-scroll-room" aria-hidden />
		</section>
	);
}
