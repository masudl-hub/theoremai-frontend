import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Text } from '@astryxdesign/core/Text';
import { IconPlayerPlay, IconRotateClockwise } from '@tabler/icons-react';
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
import type { GoalBeat, GoalId, GoalToken } from '../lib/home-goals';
import { setGoalReady } from './home-goals-beat';

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

/** How many unchanged lines may sit inside one change: the brackets that close a new block. */
const CHANGE_GAP = 3;

/**
 * The lines of `after` that are not in `before`, as a 1-based range. A change can write in more
 * than one place, an import and the profile for one, and the last place is the profile's. A
 * removal is one line.
 */
function changedLines(before: string, after: string): Lines | undefined {
	if (before === after) return undefined;
	const was = before.split('\n');
	const now = after.split('\n');
	let top = 0;
	while (top < was.length && top < now.length && was[top] === now[top]) top += 1;
	let tail = 0;
	while (
		tail < was.length - top &&
		tail < now.length - top &&
		was[was.length - 1 - tail] === now[now.length - 1 - tail]
	)
		tail += 1;
	const end = now.length - tail;
	const old = new Set(was);
	const fresh: number[] = [];
	for (let line = top; line < end; line += 1) if (!old.has(now[line])) fresh.push(line);
	const last = fresh.at(-1);
	if (last === undefined) return { from: top + 1, to: Math.max(top + 1, end) };
	let first = last;
	for (const line of fresh.toReversed()) {
		if (first - line > CHANGE_GAP) break;
		first = line;
	}
	return { from: first + 1, to: (end - 1 - last <= CHANGE_GAP ? end - 1 : last) + 1 };
}

const CHANGED_MS = 1800;

type Lines = { from: number; to: number };

/** Brings lines of the file into view in the studio's editor, and marks them for a moment. */
function markLines(lines: Lines): () => void {
	let clear: (() => void) | undefined;
	let isOver = false;
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

/** Under the editor: the form or the file, the way to the studio, and the way back to the start. */
function EditorFoot({
	store,
	isFresh,
	view,
	onView,
}: {
	store: HomeAgentStore;
	isFresh: boolean;
	view: EditorView;
	onView: (view: EditorView) => void;
}) {
	const navigate = useNavigate();
	return (
		<div className="home-goal-editor-foot">
			<SegmentedControl
				label="View"
				size="sm"
				value={view}
				onChange={(next) => {
					onView(next === 'form' ? 'form' : 'code');
				}}
			>
				<SegmentedControlItem value="form" label="Form" />
				<SegmentedControlItem value="code" label="Code" />
			</SegmentedControl>
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

const GoalForm = lazy(() => import('./home-goals-form'));

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
	const issues = useMemo(() => codeIssues(state), [state]);
	useOpenOnProfile(isShown);
	useShowChange(state, isShown && view === 'code');

	const { good } = state;
	if (!good) return null;
	return (
		<>
			<div ref={pane} className="home-goal-editor-pane">
				<div hidden={view !== 'code'}>
					<StudioCode
						text={good.source}
						hold={!state.compiled.ok}
						issues={issues}
						onApply={store.read}
					/>
				</div>
				{view === 'form' ? (
					<Suspense fallback={null}>
						<GoalForm store={store} state={state} goal={goal} />
					</Suspense>
				) : null}
				{isArmed || view !== 'code' ? null : (
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
			<EditorFoot
				store={store}
				isFresh={state.isFresh}
				view={view}
				onView={(next) => {
					setViews((now) => ({ ...now, [goal]: next }));
				}}
			/>
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

/** A choice the profile declares, drawn by the page that hosts the chat. */
function GoalSlots({
	declared,
	values,
	onPick,
}: {
	declared: Readonly<Record<string, readonly string[]>>;
	values: Readonly<Record<string, string>>;
	onPick: (pick: (now: Record<string, string>) => Record<string, string>) => void;
}) {
	return Object.entries(declared).map(([name, allowed]) => (
		<SegmentedControl
			key={name}
			label={name}
			size="sm"
			layout="fill"
			value={values[name] ?? ''}
			onChange={(value) => {
				onPick((now) => ({ ...now, [name]: value }));
			}}
		>
			{allowed.map((value) => (
				<SegmentedControlItem key={value} value={value} label={value} />
			))}
		</SegmentedControl>
	));
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
) {
	const [done, setDone] = useState<GoalToken>();
	const shown = done === picked ? done : undefined;
	const line = shown && source ? lineOf(source, shown.line) : undefined;
	const result = shown?.result && line ? `${shown.result} Line ${String(line)}.` : shown?.result;
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
	const { result, send } = useTest(chat, picked, good?.source);
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
					<GoalSlots declared={declared} values={values} onPick={setPicked} />
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
