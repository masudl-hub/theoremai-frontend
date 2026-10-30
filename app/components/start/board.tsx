import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { IconArrowUpRight, IconBug, IconCode, IconLock, IconMessages } from '@tabler/icons-react';
import type { ComponentType } from 'react';
import { CONTRIBUTE_INTRO, COPYRIGHT, WAYS } from '../../lib/home-content';
import { SITE_PACKAGES, SITE_SECTIONS } from '../../lib/site-nav';
import { AgentPromptButton } from '../agent-prompt-button';
import { InstallCopy } from '../install-copy';
import { NewTabLink } from '../links';
import './start.css';

type Way = (typeof WAYS)[number];

const WAY_ICONS: Record<Way['id'], ComponentType<{ size?: number; stroke?: number }>> = {
	issue: IconBug,
	code: IconCode,
	discussions: IconMessages,
	security: IconLock,
};

/** One way to contribute: a row that is a link, its icon, its title and its line. */
function WayRow({ way }: { way: Way }) {
	const Icon = WAY_ICONS[way.id];
	return (
		<li>
			<NewTabLink className="start-way" href={way.href}>
				<span className="start-way-icon" aria-hidden>
					<Icon size={20} stroke={1.5} />
				</span>
				<span className="start-way-words">
					<Heading level={3} className="start-way-title">
						{way.title}
					</Heading>
					<Text color="secondary" type="supporting">
						{way.note}
					</Text>
				</span>
				<IconArrowUpRight className="start-way-arrow" size={18} stroke={1.5} aria-hidden />
			</NewTabLink>
		</li>
	);
}

/** The foot of the site: who holds the copyright, and where the package lives. */
function StartFooter() {
	return (
		<footer className="start-footer">
			<Text type="supporting" color="secondary">
				{COPYRIGHT}
			</Text>
			<nav className="start-footer-links" aria-label="Elsewhere">
				{SITE_PACKAGES.map(({ label, href }) => (
					<Link key={href} as={NewTabLink} href={href} type="supporting" color="secondary">
						{label}
					</Link>
				))}
			</nav>
		</footer>
	);
}

/**
 * The landing page's last screen, in two columns. The first sends the reader off to build, with the
 * install command and three ways to begin; the second lists the ways to contribute.
 */
export function StartBoard() {
	return (
		<div className="start-frame">
			<div className="start-columns">
				<div className="start-begin">
					<Heading level={1} type="display-1" textWrap="balance" className="start-title">
						Build something cool.
					</Heading>
					<InstallCopy size="lg" />
					<div className="start-actions">
						{SITE_SECTIONS.map(({ label, href, icon: Icon }) => (
							<Button
								key={href}
								variant="secondary"
								size="lg"
								href={href}
								label={label}
								icon={<Icon aria-hidden />}
							/>
						))}
						<AgentPromptButton size="lg" />
					</div>
				</div>
				<section className="start-contribute" aria-labelledby="start-contribute-title">
					<div className="start-contribute-intro">
						<Heading level={2} id="start-contribute-title">
							Contribute to the theory
						</Heading>
						<Text color="secondary">{CONTRIBUTE_INTRO}</Text>
					</div>
					<ul className="start-ways">
						{WAYS.map((way) => (
							<WayRow key={way.id} way={way} />
						))}
					</ul>
				</section>
			</div>
			<StartFooter />
		</div>
	);
}
