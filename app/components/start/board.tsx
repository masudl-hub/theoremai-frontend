import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { TheoremMark } from '@theoremjs/studio/ui/theorem-mark.tsx';
import { useEffect, useRef, useState } from 'react';
import { SITE_SECTIONS } from '../../lib/site-nav';
import { AgentPromptButton } from '../agent-prompt-button';
import { InstallCopy } from '../install-copy';
import './start.css';

/** The mark draws itself the first time the screen is half in view, not while it is off screen. */
function useFirstSeen<T extends HTMLElement>() {
	const ref = useRef<T>(null);
	const [seen, setSeen] = useState(false);
	useEffect(() => {
		const node = ref.current;
		if (!node || seen) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) setSeen(true);
			},
			{ threshold: 0.5 },
		);
		observer.observe(node);
		return () => {
			observer.disconnect();
		};
	}, [seen]);
	return { ref, seen };
}

/** The landing page's last screen: the mark, the question the headline opened with, the install command, and three ways to begin. */
export function StartBoard() {
	const { ref, seen } = useFirstSeen<HTMLDivElement>();
	return (
		<div ref={ref} className="start-frame">
			<div className="start-content">
				<div className="start-mark">{seen ? <TheoremMark /> : null}</div>
				<Heading level={1} type="display-1" textWrap="balance" className="start-title">
					Ready to keep your promises?
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
		</div>
	);
}
