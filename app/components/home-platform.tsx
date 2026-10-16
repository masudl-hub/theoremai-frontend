import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Text } from '@astryxdesign/core/Text';
import { type CSSProperties, type RefObject, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { PLATFORM_TABS } from '../lib/home-platform';
import { GoalStats } from './home-goals-stats';
import { useScrollStops } from './home-scroll-stops';
import './home-platform.css';

/** The stills cross as the scroll pull moves between stops, so each is at its own stop's index. */
function pullPlatform(run: HTMLElement, pull: number) {
	run.style.setProperty('--home-platform-pull', String(pull));
}

function clearPlatform(run: HTMLElement) {
	run.style.removeProperty('--home-platform-pull');
}

/**
 * The screen after the goals. The page is fixed: scroll moves from one tab to the next, and the
 * tab bar, the text, the preview and the still behind it change with the tab.
 */
export function HomePlatform({ scrollRoot }: { scrollRoot: RefObject<HTMLDivElement | null> }) {
	const runRef = useRef<HTMLElement>(null);
	const navigate = useNavigate();
	const [index, setIndex] = useState(0);
	const onRest = useCallback((next: number) => {
		setIndex(next);
	}, []);
	useScrollStops({
		scrollRoot,
		runRef,
		stop: 'home-platform-stop',
		lead: false,
		onPull: pullPlatform,
		onRest,
		onClear: clearPlatform,
	});

	const tab = PLATFORM_TABS[index];
	const choose = (id: string) => {
		const next = PLATFORM_TABS.findIndex((each) => each.id === id);
		if (next < 0) return;
		setIndex(next);
		void navigate({ hash: `#${id}` }, { preventScrollReset: true });
	};

	return (
		<section
			ref={runRef}
			className="home-platform"
			aria-label="Platform"
			style={{ '--home-platform-stops': PLATFORM_TABS.length } as CSSProperties}
		>
			<div className="home-platform-frame">
				<div className="home-platform-card">
					<TabList className="home-platform-tabs" value={tab.id} onChange={choose}>
						{PLATFORM_TABS.map((each) => (
							<Tab key={each.id} value={each.id} label={each.label} />
						))}
					</TabList>
					<Text className="home-platform-text" justify="center">
						Lorem ipsum dolor sit amet consectetur adipiscing elit illum voluptatum veniam aut
						libero in est dignissimos nihil dolore animi similique nisi qui voluptas odio expedita
						sunt non reprehenderit eu.
					</Text>
					<div className="home-platform-stage">
						{PLATFORM_TABS.map((each, i) => (
							<img
								key={each.id}
								className="home-platform-still"
								src={each.src}
								alt=""
								decoding="async"
								fetchPriority="low"
								data-active={i === index ? '' : undefined}
								style={{ '--home-platform-index': i } as CSSProperties}
							/>
						))}
						<div className="home-platform-preview">
							{tab.readouts ? (
								<div className="home-platform-readouts">
									<GoalStats />
								</div>
							) : null}
						</div>
					</div>
				</div>
			</div>
			{PLATFORM_TABS.map((each) => (
				<div key={each.id} className="home-platform-stop" data-home-stop={each.id} aria-hidden />
			))}
		</section>
	);
}
