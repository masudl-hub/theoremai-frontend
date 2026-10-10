import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import {
	IconAdjustmentsHorizontal,
	IconCode,
	IconPlayerPlay,
	IconRotateClockwise,
} from '@tabler/icons-react';
import type { TheoremChatHandle } from '@theoremjs/react/ui';
import { StudioCode } from '@theoremjs/studio/ui/code/studio-code.tsx';
import { GuardrailTester } from '@theoremjs/studio/ui/guardrail-tester.tsx';
import { pageInputsOf } from '@theoremjs/studio/ui/lib/studio-page.ts';
import type { CodeIssue } from '@theoremjs/studio/ui/studio-host.ts';
import { StudioRunner } from '@theoremjs/studio/ui/studio-runner.tsx';
import {
	lazy,
	type RefObject,
	Suspense,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import { useNavigate } from 'react-router';
import { homeAgentDraft } from '../lib/home-agent';
import { HOME_CHAT } from '../lib/home-agent-chat';
import { HOME_AGENT_STUDIO, keepHomeAgent } from '../lib/home-agent-handoff';
import type { HomeAgentState, HomeAgentStore, HomeGood } from '../lib/home-agent-store';
import { changedLines, type Excerpt, excerptOf, type Lines } from '../lib/home-excerpt';
import type { GoalBeat, GoalId, GoalToken } from '../lib/home-goals';
import { setGoalMarked, setGoalReady } from './home-goals-beat';
import { GoalExcerpt } from './home-goals-excerpt';

function useHomeAgent(store: HomeAgentStore): HomeAgentState {
	return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** An issue's node as the file's spans name it: the agent's own ids, without the workspace's prefix. */
function codeIssues({ agent, compiled }: HomeAgentState): CodeIssue[] {
	if (compiled.ok) return [];
	const root = `agent:${agent.workspace.chatWith}`;
	return compiled.issues.map(({ nodeId, field, message }) => ({
		nodeId:
			nodeId === root
				? 'identity'
				: nodeId.startsWith(`${root}/`)
					? nodeId.slice(root.length + 1)
					: nodeId,
		field,
		message,
	}));
}

const CHANGED_MS = 1800;

/** Brings lines of the file into view in the studio's editor, and marks them for a moment. */
function markLines(lines: Lines): () => void {
	let clear: (() => void) | undefined;
	let isOver = false;
	setGoalMarked(lines);
	const unmark = setTimeout(() => {
		setGoalMarked(undefined);
	}, CHANGED_MS);
	// A goal that shows an excerpt has no editor, and the editor is not worth loading to find out.
	if (!document.querySelector('.home-goal-code .monaco-editor')) {
		return () => {
			clearTimeout(unmark);
			setGoalMarked(undefined);
		};
	}
	void import('@theoremjs/studio/ui/code/studio-monaco.ts').then(({ editor }) => {
		const open = editor.getEditors().at(0);
		if (isOver || !open) return;
		open.revealLinesInCenter(lines.from, lines.to);
		const marks = open.createDecorationsCollection([
			{
				range: {
					startLineNumber: lines.from,
					startColumn: 1,
					endLineNumber: lines.to,
					endColumn: 1,
				},
				options: { isWholeLine: true, className: 'home-goal-changed' },
			},
		]);
		const timer = setTimeout(() => {
			marks.clear();
		}, CHANGED_MS);
		clear = () => {
			clearTimeout(timer);
			marks.clear();
		};
	});
	return () => {
		isOver = true;
		clearTimeout(unmark);
		setGoalMarked(undefined);
		clear?.();
	};
}

/** A token's change is shown where it was written. */
function useShowChange({ good, fromToken }: HomeAgentState, isShown: boolean) {
	const source = good?.source;
	const seen = useRef(source);
	useEffect(() => {
		const before = seen.current;
		seen.current = source;
		if (!isShown || !fromToken || before === undefined || source === undefined) return;
		const lines = changedLines(before, source);
		return lines ? markLines(lines) : undefined;
	}, [source, fromToken, isShown]);
}

const OPEN_POLL_MS = 150;
const OPEN_TRIES = 80;

/** The file opens on the profile, which is under the providers and tools it names. */
function useOpenOnProfile(isShown: boolean) {
	const isDone = useRef(false);
	useEffect(() => {
		if (!isShown || isDone.current) return;
		let tries = 0;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let isOver = false;
		const look = async () => {
			const { editor } = await import('@theoremjs/studio/ui/code/studio-monaco.ts');
			if (isOver) return;
			const open = editor.getEditors().at(0);
			const line = open
				?.getModel()
				?.findMatches('defineProfile(', false, false, true, null, false)
				.at(0)?.range.startLineNumber;
			if (open && line) {
				isDone.current = true;
				open.revealLineNearTop(line);
				setGoalReady(true);
				return;
			}
			tries += 1;
			if (tries < OPEN_TRIES) timer = setTimeout(() => void look(), OPEN_POLL_MS);
		};
		void look();
		return () => {
			isOver = true;
			clearTimeout(timer);
		};
	}, [isShown]);
}

/**
 * The agent's file, in the studio's own editor. The page keeps the wheel until a click inside:
 * a cover sits on the editor, and the click that removes it is the one that gives the wheel away.
 */
/** Whether a click has given the wheel to the editor; it goes back to the page on a click outside. */
function useArmed(isShown: boolean, pane: RefObject<HTMLDivElement | null>) {
	const [isArmed, setIsArmed] = useState(false);
	useEffect(() => {
		if (!isShown) setIsArmed(false);
	}, [isShown]);

	useEffect(() => {
		if (!isArmed) return;
		const onPress = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Element) || pane.current?.contains(target)) return;
			// Monaco draws its suggestions and menus outside the pane.
			if (target.closest('.monaco-editor, .context-view')) return;
			setIsArmed(false);
		};
		document.addEventListener('pointerdown', onPress, true);
		return () => {
			document.removeEventListener('pointerdown', onPress, true);
		};
	}, [isArmed]);
	return { isArmed, setIsArmed };
}

type EditorView = 'code' | 'form';

/** Goals one and two begin on the file, and goal three on the form. */
const startView = (goal: GoalId): EditorView => (goal === 'boundaries' ? 'form' : 'code');

/** Under the editor: the way to the studio, and the way back to the start. */
function EditorFoot({ store, isFresh }: { store: HomeAgentStore; isFresh: boolean }) {
	const navigate = useNavigate();
	return (
		<div className="home-goal-editor-foot">
			<Button
				variant="secondary"
				size="md"
				label="Open Studio"
				icon={<IconPlayerPlay aria-hidden />}
				onClick={() => {
					keepHomeAgent(homeAgentDraft(store.get().agent));
					void navigate(HOME_AGENT_STUDIO);
				}}
			/>
			<IconButton
				label="Reset"
				variant="ghost"
				icon={<Icon icon={IconRotateClockwise} size="sm" />}
				isDisabled={isFresh}
				tooltip={
					isFresh
						? 'This agent is as it started'
						: 'Reset this agent and its conversation to how they started'
				}
				onClick={store.startOver}
			/>
		</div>
	);
}

const VIEW_TOGGLE = {
	form: { label: 'Code', icon: IconCode, tooltip: 'Edit as TypeScript', next: 'code' },
	code: {
		label: 'Editor',
		icon: IconAdjustmentsHorizontal,
		tooltip: 'Edit as a form',
		next: 'form',
	},
} as const;

/** The studio's own switch between the form and the file, floating over the editor's corner. */
function ViewToggle({ view, onView }: { view: EditorView; onView: (view: EditorView) => void }) {
	const toggle = VIEW_TOGGLE[view];
	return (
		<div className="home-goal-view-toggle">
			<IconButton
				label={toggle.label}
				variant="ghost"
				icon={<Icon icon={toggle.icon} size="sm" />}
				tooltip={toggle.tooltip}
				onClick={() => {
					onView(toggle.next);
				}}
			/>
		</div>
	);
}

const GoalForm = lazy(() => import('./home-goals-form'));

/** The agent's file: the part a goal is about, or the whole of it in the studio's editor. */
function GoalCode({
	excerpt,
	good,
	state,
	store,
	isShown,
}: {
	excerpt: Excerpt | undefined;
	good: HomeGood;
	state: HomeAgentState;
	store: HomeAgentStore;
	isShown: boolean;
}) {
	const issues = useMemo(() => codeIssues(state), [state]);
	return (
		<div className="home-goal-code" hidden={!isShown}>
			{excerpt ? (
				<GoalExcerpt excerpt={excerpt} />
			) : (
				<StudioCode
					text={good.source}
					hold={!state.compiled.ok}
					issues={issues}
					onApply={store.read}
				/>
			)}
		</div>
	);
}

export function GoalEditor({
	store,
	goal,
	isShown,
}: {
	store: HomeAgentStore;
	goal: GoalId;
	isShown: boolean;
}) {
	const state = useHomeAgent(store);
	const pane = useRef<HTMLDivElement>(null);
	const { isArmed, setIsArmed } = useArmed(isShown, pane);
	const [views, setViews] = useState<Partial<Record<GoalId, EditorView>>>({});
	const view = views[goal] ?? startView(goal);
	const { good } = state;
	const excerpt = useMemo(() => (good ? excerptOf(good.source, goal) : undefined), [good, goal]);
	useOpenOnProfile(isShown && !excerpt);
	useEffect(() => {
		if (isShown && excerpt) setGoalReady(true);
	}, [isShown, excerpt]);
	useShowChange(state, isShown && view === 'code');

	if (!good) return null;
	return (
		<>
			<div ref={pane} className="home-goal-editor-pane">
				<GoalCode
					excerpt={excerpt}
					good={good}
					state={state}
					store={store}
					isShown={view === 'code'}
				/>
				{view === 'form' ? (
					<Suspense fallback={null}>
						<GoalForm store={store} state={state} goal={goal} />
					</Suspense>
				) : null}
				<ViewToggle
					view={view}
					onView={(next) => {
						setViews((now) => ({ ...now, [goal]: next }));
					}}
				/>
				{isArmed || view !== 'code' || excerpt ? null : (
					<button
						type="button"
						className="home-goal-editor-cover"
						onClick={() => {
							setIsArmed(true);
						}}
					>
						<span className="home-goal-editor-hint">This is live. Edit it.</span>
					</button>
				)}
			</div>
			<EditorFoot store={store} isFresh={state.isFresh} />
		</>
	);
}

/** The picker the page draws for each choice the profile declares, and the values it sends. */
function useSlots(good: HomeGood | undefined) {
	const [picked, setPicked] = useState<Record<string, string>>({});
	const declared = useMemo(
		() => (good ? pageInputsOf(good.payload)?.slots : undefined) ?? {},
		[good],
	);
	const values = useMemo(
		() =>
			Object.fromEntries(
				Object.entries(declared).map(([name, allowed]) => [
					name,
					allowed.find((value) => value === picked[name]) ?? allowed.at(0) ?? '',
				]),
			),
		[declared, picked],
	);
	return { declared, values, setPicked };
}

/**
 * A choice the profile declares, drawn by the page that hosts the chat. It is the composer's own
 * model selector: a small ghost selector whose list opens above it.
 */
function GoalSlots({
	declared,
	values,
	onPick,
}: {
	declared: Readonly<Record<string, readonly string[]>>;
	values: Readonly<Record<string, string>>;
	onPick: (pick: (now: Record<string, string>) => Record<string, string>) => void;
}) {
	return (
		<div className="home-goal-slots">
			{Object.entries(declared).map(([name, allowed]) => (
				<Selector
					key={name}
					label={name}
					isLabelHidden
					size="sm"
					variant="ghost"
					startIcon={<IconAdjustmentsHorizontal size={14} />}
					placement="above"
					value={values[name] ?? ''}
					options={allowed.map((value) => ({ value, label: value }))}
					onChange={(value) => {
						onPick((now) => ({ ...now, [name]: value }));
					}}
				/>
			))}
		</div>
	);
}

/** What to try next, with the message itself when one message is the whole test. */
function GoalPrompt({
	prompt,
	result,
	onSend,
}: {
	prompt: string;
	/** What the answered test showed. It takes the prompt's place. */
	result: string | undefined;
	onSend: (() => void) | undefined;
}) {
	if (result) return <Text weight="medium">{result}</Text>;
	return (
		<>
			<Text weight="medium">{prompt}</Text>
			{onSend ? <Button variant="secondary" size="sm" label="Send it" onClick={onSend} /> : null}
		</>
	);
}

/** The line of the file a token's test turned on, as a 1-based number. */
function lineOf(source: string, text: string | undefined): number | undefined {
	const at = text ? source.split('\n').findIndex((line) => line.includes(text)) : -1;
	return at < 0 ? undefined : at + 1;
}

/**
 * The prompt's own message, sent as the visitor. Once the reply is in, the prompt gives way to
 * what the reply shows, and the line of the file that decided it is marked.
 */
function useTest(
	chat: RefObject<TheoremChatHandle | null>,
	picked: GoalToken | undefined,
	source: string | undefined,
	goal: GoalId | undefined,
) {
	const [done, setDone] = useState<GoalToken>();
	const shown = done === picked ? done : undefined;
	const line = shown && source ? lineOf(source, shown.line) : undefined;
	// The line is named by the numbers the visitor sees, which are the excerpt's when there is one.
	const excerpt = source && goal ? excerptOf(source, goal) : undefined;
	const number = excerpt && line ? excerpt.from.indexOf(line) + 1 : line;
	const result =
		shown?.result && number ? `${shown.result} Line ${String(number)}.` : shown?.result;
	useEffect(() => (line ? markLines({ from: line, to: line }) : undefined), [line]);
	const send = (token: GoalToken, ask: string) => () => {
		setDone(undefined);
		void chat.current?.send(ask).then((turn) => {
			if (turn && !turn.blocks.some(({ kind }) => kind === 'error')) setDone(token);
		});
	};
	return { result, send };
}

/** What the open beat puts on its still: the chat, the tester, or nothing. */
function useStill(beat: GoalBeat | undefined) {
	const isTester = beat?.goal === 'boundaries';
	// The numbers beat has no agent on its still.
	const isEmpty = !beat || (isTester && beat.controls.length === 0);
	const isTesting = isTester && !isEmpty;
	// Once it has been opened, the tester keeps what was sent while the visitor is elsewhere.
	const [hasTested, setHasTested] = useState(false);
	useEffect(() => {
		if (isTesting) setHasTested(true);
	}, [isTesting]);
	return { isTester, isEmpty, isTesting, hasTested };
}

/**
 * What sits on the open goal's still: the agent itself, as the studio runs it. The first two
 * goals talk to it. The third sends texts across its boundaries, which calls no model.
 */
export function GoalLive({
	store,
	beat,
	picked,
}: {
	store: HomeAgentStore;
	beat: GoalBeat | undefined;
	picked: GoalToken | undefined;
}) {
	const state = useHomeAgent(store);
	const chat = useRef<TheoremChatHandle | null>(null);
	const { good, runs } = state;
	const { declared, values, setPicked } = useSlots(good);
	const { isTester, isEmpty, isTesting, hasTested } = useStill(beat);
	const { result, send } = useTest(chat, picked, good?.source, beat?.goal);
	if (!good) return null;
	const ask = isTester ? undefined : picked?.ask;
	return (
		<>
			<div className="home-goal-prompt" aria-live="polite">
				{picked && !isEmpty ? (
					<Card variant="glass" padding={0} elevation="med" className="home-goal-prompt-card">
						<GoalPrompt
							prompt={picked.prompt}
							result={result}
							onSend={ask ? send(picked, ask) : undefined}
						/>
					</Card>
				) : null}
			</div>
			<Card
				variant="glass"
				padding={0}
				elevation="med"
				className="home-goal-live-pane"
				hidden={isEmpty}
			>
				<div
					className="home-goal-live-chat"
					data-slots={Object.keys(declared).length > 0 ? '' : undefined}
					hidden={isTester}
				>
					<StudioRunner
						key={runs}
						payload={good.payload}
						mode="demo"
						runtime={null}
						chatRef={chat}
						slots={values}
						initialChat={HOME_CHAT}
						onActivity={store.talked}
					/>
					<GoalSlots declared={declared} values={values} onPick={setPicked} />
				</div>
				{hasTested ? (
					<div className="home-goal-live-test" hidden={!isTesting}>
						<GuardrailTester payload={good.payload} isWide={false} />
					</div>
				) : null}
			</Card>
		</>
	);
}
