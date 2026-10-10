import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { IconBrush, IconCircleDot, IconShieldCheck } from '@tabler/icons-react';
import {
	type CSSProperties,
	type RefObject,
	startTransition,
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import { Link } from 'react-router';
import type { HomeAgentStore } from '../lib/home-agent-store';
import { HEADLINE } from '../lib/home-content';
import { EDITED_BEATS, GOAL_BEATS, type GoalToken } from '../lib/home-goals';
import { ARGUMENT, GOALS } from '../lib/site-pitch';
import { GoalBlock, goalStackVars, goalTileVars, type PickedTokens } from './home-goals';
import { useGoalBeat } from './home-goals-beat';
import { HomeIntro } from './home-intro';
import { StillText, StillTitle } from './still-caption';
import './home-stage.css';

const GOAL_ICONS = {
	'source-of-truth': IconCircleDot,
	experiment: IconBrush,
	boundaries: IconShieldCheck,
} as const;

type Still = (typeof GOALS)[number];

/** A tile is also the way to its goal: the small ones are the map of the goals screen. */
function StillRow({ still, index }: { still: Still; index: number }) {
	const Icon = GOAL_ICONS[still.id];
	return (
		<figure className="home-stage-still" style={goalTileVars(index)}>
			<Link
				className="home-stage-still-media"
				to={{ hash: `#${still.id}` }}
				preventScrollReset
				aria-label={`Go to: ${still.title}`}
			>
				<img src={still.src} alt={still.alt} decoding="async" fetchPriority="low" />
				<span className="home-stage-still-icon" aria-hidden>
					<Icon size={40} stroke={1.5} />
				</span>
			</Link>
			<figcaption>
				<StillTitle>{still.title}</StillTitle>
				<StillText>{still.text}</StillText>
			</figcaption>
		</figure>
	);
}

const STACK_VARS = goalStackVars();

type Loaded = {
	GoalEditor: typeof import('./home-goals-live').GoalEditor;
	GoalLive: typeof import('./home-goals-live').GoalLive;
	tokenEdits: typeof import('../lib/home-agent').tokenEdits;
	tokenIsOn: typeof import('../lib/home-agent').tokenIsOn;
	store: HomeAgentStore;
};

/** How long the page is left alone before the agent's code is fetched. */
const LIVE_IDLE_MS = 1500;

const noStore = () => () => {};

/**
 * The agent, its editor and its runner are the studio's, and they are fetched after the page is
 * up, and they come in with the screen's own motion.
 */
function useLiveAgent() {
	const [loaded, setLoaded] = useState<Loaded>();
	const loading = useRef<Promise<Loaded>>(undefined);
	const load = useCallback(() => {
		loading.current ??= Promise.all([
			import('./home-goals-live'),
			import('../lib/home-agent-store'),
			import('../lib/home-agent'),
		]).then(([{ GoalEditor, GoalLive }, { createHomeAgentStore }, { tokenEdits, tokenIsOn }]) => {
			const next = { GoalEditor, GoalLive, tokenEdits, tokenIsOn, store: createHomeAgentStore() };
			// The editor and the chat are a large first render. A scroll or a click comes first.
			startTransition(() => {
				setLoaded(next);
			});
			return next;
		});
		return loading.current;
	}, []);
	useEffect(() => {
		const timer = setTimeout(() => void load(), LIVE_IDLE_MS);
		return () => {
			clearTimeout(timer);
		};
	}, [load]);
	const state = useSyncExternalStore(
		loaded?.store.subscribe ?? noStore,
		() => loaded?.store.get(),
		() => undefined,
	);
	return { loaded, state, load };
}

function StageCopy() {
	const [picked, setPicked] = useState<PickedTokens>({});
	const { loaded, state, load } = useLiveAgent();
	const beat = useGoalBeat();
	// Starting over takes the prompts with it.
	const runs = state?.runs;
	const ran = useRef(runs);
	useEffect(() => {
		if (ran.current !== undefined && ran.current !== runs) setPicked({});
		ran.current = runs;
	}, [runs]);
	const isOn = (number: number) => (token: GoalToken) =>
		loaded && state && loaded.tokenEdits(token.id)
			? loaded.tokenIsOn(state.agent, token.id)
			: picked[number] === token;
	const pick = (number: number) => (token: GoalToken) => {
		void load().then(({ tokenEdits, tokenIsOn, store }) => {
			const edits = tokenEdits(token.id);
			const wasOn = edits ? tokenIsOn(store.get().agent, token.id) : picked[number] === token;
			if (edits) store.toggle(token.id);
			setPicked((now) => ({ ...now, [number]: wasOn ? undefined : token }));
		});
	};
	return (
		<div className="home-hero-copy">
			<div className="home-stage-frame">
				<div className="home-stage-split">
					<div className="home-stage-leads">
						<div className="home-stage-lead home-goal-block" data-home-beat={0}>
							<Heading className="home-stage-headline" level={2}>
								{HEADLINE.map(({ text, claim }) => (
									<span key={text} className={`home-stage-line ${claim ? 'is-claim' : 'is-quiet'}`}>
										{text}
									</span>
								))}
							</Heading>
							<Text className="home-stage-statement">{ARGUMENT}</Text>
						</div>
						{GOAL_BEATS.map((goalBeat, index) => (
							<GoalBlock
								key={goalBeat.lede}
								beat={goalBeat}
								number={index + 1}
								isOn={isOn(index + 1)}
								onPick={pick(index + 1)}
							/>
						))}
						<div
							className="home-goal-editor"
							inert={beat < 1 || beat > EDITED_BEATS}
							style={EDITED_VARS}
						>
							{loaded ? (
								<loaded.GoalEditor
									store={loaded.store}
									goal={GOAL_BEATS[Math.max(beat, 1) - 1].goal}
									isShown={beat > 0 && beat <= EDITED_BEATS}
								/>
							) : null}
						</div>
					</div>
					<VStack className="home-stage-stills" gap={4} justify="center" style={STACK_VARS}>
						{GOALS.map((still, index) => (
							<StillRow key={still.title} still={still} index={index} />
						))}
						<div className="home-goal-live" inert={beat < 1}>
							{loaded ? (
								<loaded.GoalLive
									store={loaded.store}
									beat={GOAL_BEATS[beat - 1]}
									picked={picked[beat]}
								/>
							) : null}
						</div>
					</VStack>
				</div>
			</div>
		</div>
	);
}

const EDITED_VARS = { '--home-goal-edited': EDITED_BEATS } as CSSProperties;
const GOAL_STOPS = GOAL_BEATS.map(({ goal }) => goal);

/** Landing, then overview, then the beats of the three goals. Showcase is the next screen. */
export function HomeStage({ scrollRoot }: { scrollRoot: RefObject<HTMLDivElement | null> }) {
	return <HomeIntro scrollRoot={scrollRoot} next={<StageCopy />} stops={GOAL_STOPS} />;
}
