import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Theme } from '@astryxdesign/core/theme';
import { VStack } from '@astryxdesign/core/VStack';
import { IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import { defineAction } from '@theoremjs/agents/surface';
import { clientFailure, LiveSessionClient } from '@theoremjs/react/client';
import { InkWaveform, type InkWaveStatus } from '@theoremjs/react/ui';
import {
	createContext,
	type Dispatch,
	type ReactNode,
	type RefObject,
	type SetStateAction,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { type NavigateFunction, useLocation, useMatches, useNavigate } from 'react-router';
import { z } from 'zod';
import { theoremSiteTheme } from '../built/theorem-site';
import { highlightBlock, highlightWhenPresent } from '../lib/docs/th30-client';
import { resolveSitePath } from '../lib/site-path';
import { TH30_PROFILE_ID } from '../lib/th30-id';
import {
	type Th30Page,
	type Th30PageHandle,
	th30PageLine,
	useTh30PlaygroundState,
} from '../lib/th30-page';
import { onTh30Note, setTh30SurfaceOpener, th30Surfaces } from '../lib/th30-surfaces';
import { th30Voice } from '../lib/th30-voice';
import { Th30Light } from './th30-light';
import './th30.css';

export type Th30Api = {
	/** A call is on: connecting, live, or failed and still showing why. */
	isLive: boolean;
	/** Starts a call, or ends the one that's on. */
	toggle: () => void;
	/** True once the call can be muted. */
	canMute: boolean;
	isMuted: boolean;
	mute: () => void;
};

const Th30Context = createContext<Th30Api>({
	isLive: false,
	toggle: () => undefined,
	canMute: false,
	isMuted: false,
	mute: () => undefined,
});

export function useTh30(): Th30Api {
	return useContext(Th30Context);
}

/** th30's light as a button: click to call, click again to end. */
export function Th30Trigger({ placement }: { placement: 'rail' | 'search' }) {
	const th30 = useTh30();
	const label = th30.isLive ? 'End the call with th30' : 'Talk to th30';
	if (placement === 'search') {
		return (
			<Button
				label={th30.isLive ? 'End call' : 'Talk to th30'}
				variant="ghost"
				size="lg"
				aria-pressed={th30.isLive}
				onClick={th30.toggle}
			>
				<HStack align="center" gap={2}>
					<Th30Light className="th30-search-cloud" />
					<span>{th30.isLive ? 'End call' : 'Talk to th30'}</span>
				</HStack>
			</Button>
		);
	}
	return (
		<VStack align="center" gap={1}>
			{th30.canMute ? (
				<IconButton
					label={th30.isMuted ? 'Unmute' : 'Mute'}
					icon={th30.isMuted ? <IconMicrophoneOff /> : <IconMicrophone />}
					variant="ghost"
					size="sm"
					onClick={th30.mute}
				/>
			) : null}
			<Tooltip content={label} placement="end">
				<button
					type="button"
					className={`th30-trigger th30-trigger-${placement}`}
					aria-label={label}
					aria-pressed={th30.isLive}
					onClick={th30.toggle}
				>
					<Th30Light />
				</button>
			</Tooltip>
		</VStack>
	);
}

type Phase = 'idle' | 'connecting' | 'live' | 'failed';

const PAGE_LINE_DEBOUNCE_MS = 800;

/** Where each surface th30 can open lives. */
const SURFACE_PAGES: Record<string, string> = { playground: '/playground' };
const SITE_PAGES = { home: '/', docs: '/docs', playground: '/playground' } as const;

/** The page the visitor is on, from the deepest matched route that describes itself. */
function useTh30PageLine(): string | null {
	const matches = useMatches();
	const { pathname, hash } = useLocation();
	const playground = useTh30PlaygroundState();
	for (const match of [...matches].reverse()) {
		const describe = (match.handle as Th30PageHandle | undefined)?.th30Page;
		if (!describe) continue;
		const page = (describe as (data: unknown, hash: string) => Th30Page)(match.loaderData, hash);
		return th30PageLine(pathname, page, pathname === '/playground' ? playground : null);
	}
	return null;
}

/** th30 opens a surface's page when it asks for one that isn't mounted, and can always move the person. */
function useSiteSurface(navigate: NavigateFunction): void {
	const { pathname } = useLocation();
	const pathnameRef = useRef(pathname);
	pathnameRef.current = pathname;
	useEffect(() => {
		setTh30SurfaceOpener((surfaceId) => {
			const to = SURFACE_PAGES[surfaceId];
			if (to && window.location.pathname !== to) void navigate(to);
		});
		const unmount = th30Surfaces.mount({
			id: 'site',
			title: 'The Theorem site',
			revision: () => 1,
			summary: () => `on ${pathnameRef.current}`,
			nodes: () => [
				{
					id: '',
					title: 'The Theorem site',
					actions: {
						go: defineAction({
							description: 'Take the person to the home page, the docs, or the playground.',
							effect: 'run',
							input: z.object({ page: z.enum(['home', 'docs', 'playground']) }),
							run: ({ page }) => {
								void navigate(SITE_PAGES[page]);
								return { result: { went: page } };
							},
						}),
					},
				},
			],
		});
		return () => {
			setTh30SurfaceOpener(null);
			unmount();
		};
	}, [navigate]);
}

function textArg(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value : undefined;
}

/** thirty's page tools: open a path on this site, or focus and mark something already showing. */
async function applyPageTool(
	navigate: NavigateFunction,
	client: LiveSessionClient,
	callId: string,
	name: string,
	args: Record<string, unknown>,
): Promise<void> {
	if (name === 'highlight') {
		const target = textArg(args.target) ?? textArg(args.blockId) ?? '';
		const label = textArg(args.label);
		const found = target ? highlightBlock(target, label) : false;
		await client.executeToolOnRelay({
			callId,
			output: {
				success: found,
				highlighted: target,
				...(found ? {} : { error: 'Nothing on this page matches that.' }),
			},
		});
		return;
	}
	if (name === 'navigate') {
		const to = textArg(args.to);
		const resolved = to ? resolveSitePath(to) : undefined;
		if (resolved?.ok) {
			void navigate(resolved.href);
			if (resolved.hash) {
				const pathname = resolved.href.split('#')[0] ?? resolved.href;
				highlightWhenPresent(resolved.hash, pathname);
			}
		}
	}
	await client.executeToolOnRelay({ callId });
}

/** The kernel's line for a failure. The diagnostic stays in the console. */
function wordFailure(err: unknown): string {
	console.warn('[th30]', err);
	return clientFailure(err).error;
}

/** What the strip says while a call connects or after it failed. */
function stripStatus(phase: Phase, failure: string | null): string {
	if (phase === 'connecting') return 'Connecting to th30…';
	if (phase !== 'failed') return '';
	return failure ?? '';
}

/** The page line th30 hears, and the last one it was told. */
type PageRefs = {
	pageLine: string | null;
	pageLineRef: RefObject<string | null>;
	/** The last page line th30 was told, so an unchanged page says nothing; `undefined` until the call is greeted. */
	toldRef: RefObject<string | null | undefined>;
};

function usePageRefs(): PageRefs {
	const pageLine = useTh30PageLine();
	const pageLineRef = useRef(pageLine);
	pageLineRef.current = pageLine;
	const toldRef = useRef<string | null | undefined>(undefined);
	return { pageLine, pageLineRef, toldRef };
}

/** A call with th30: its phase, voice levels and mute, and how to start, end and mute it. */
type Th30Call = {
	phase: Phase;
	isMuted: boolean;
	/** Why the last call failed, in the profile's own wording. */
	failure: string | null;
	status: InkWaveStatus;
	levels: { input: number; output: number };
	clientRef: RefObject<LiveSessionClient | null>;
	toggle: () => void;
	stop: () => void;
	mute: () => void;
};

type CallOptions = ConstructorParameters<typeof LiveSessionClient>[0];

/** The state a call's events set. */
type CallSetters = {
	setStatus: (status: InkWaveStatus) => void;
	setPhase: (phase: Phase) => void;
	setFailure: (failure: string | null) => void;
	setLevels: Dispatch<SetStateAction<{ input: number; output: number }>>;
};

/** Answers a `look` or `act` from the page; an applied call whose answer is lost is noted. */
async function answerSurface(
	clientRef: RefObject<LiveSessionClient | null>,
	name: string,
	args: Record<string, unknown>,
	callId: string,
): Promise<void> {
	const output = await th30Surfaces.answer(name, args, callId);
	try {
		await clientRef.current?.executeToolOnRelay({ callId, output });
	} catch {
		th30Surfaces.settled(callId, 'undelivered');
	}
}

/**
 * The live client's callbacks: status and phase, failures, voice levels, tool calls and cancels.
 * Events from a client that is no longer current are ignored. `greet` runs on each `listening`.
 */
function callCallbacks(
	isCurrent: () => boolean,
	greet: () => void,
	set: CallSetters,
	onToolCall: CallOptions['onToolCall'],
): Pick<
	CallOptions,
	'onStatusChange' | 'onError' | 'onVolumeLevel' | 'onToolCall' | 'onTurnEvent'
> {
	return {
		onStatusChange: (next) => {
			if (!isCurrent()) return;
			set.setStatus(next);
			if (next === 'error') set.setPhase('failed');
			else if (next !== 'connecting' && next !== 'disconnected') set.setPhase('live');
			if (next === 'listening') greet();
		},
		onError: (err) => {
			if (!isCurrent()) return;
			set.setFailure(wordFailure(err));
			set.setPhase('failed');
		},
		onVolumeLevel: (level, isUser) => {
			if (isUser) th30Voice.user = level;
			else th30Voice.agent = level;
			set.setLevels((prev) => (isUser ? { ...prev, input: level } : { ...prev, output: level }));
		},
		// Th30's tools never gate. The relay runs the server ones; the page answers look and act.
		onToolCall,
		onTurnEvent: (event) => {
			if (event.type !== 'tool' || event.tool.phase !== 'cancel') return;
			th30Surfaces.settled(event.tool.callId, 'cancelled');
		},
	};
}

/** What starting a call needs from the hook that owns it. */
type CallContext = Pick<PageRefs, 'pageLineRef' | 'toldRef'> & {
	navigate: NavigateFunction;
	clientRef: RefObject<LiveSessionClient | null>;
	chimeRef: RefObject<ReturnType<typeof makeChime> | null>;
	set: CallSetters;
};

/** Opens a call unless one is on: chimes and greets once through, and records a failure. */
async function startCall({
	navigate,
	clientRef,
	chimeRef,
	pageLineRef,
	toldRef,
	set,
}: CallContext): Promise<void> {
	if (clientRef.current) return;
	const chime = makeChime();
	chimeRef.current = chime;
	let greeted = false;
	toldRef.current = undefined;
	// Through: chime, then nudge th30 to greet first, knowing the page, rather than wait.
	const greet = () => {
		if (greeted) return;
		greeted = true;
		chime.play();
		const line = pageLineRef.current;
		toldRef.current = line;
		const state = th30Surfaces.stateLine();
		client.sendText(['(call connected)', line, state].filter((part) => part).join(' '));
	};
	const client: LiveSessionClient = new LiveSessionClient({
		profile: TH30_PROFILE_ID,
		voiceIngress: true,
		...callCallbacks(
			() => clientRef.current === client,
			greet,
			set,
			async (name, args, meta) => {
				if (th30Surfaces.isSurfaceTool(name)) {
					await answerSurface(clientRef, name, args, meta.callId);
					return;
				}
				const current = clientRef.current;
				if (!current) return;
				await applyPageTool(navigate, current, meta.callId, name, args);
			},
		),
	});
	clientRef.current = client;
	set.setFailure(null);
	set.setPhase('connecting');
	try {
		await client.connect();
	} catch (err) {
		if (clientRef.current !== client) return;
		set.setFailure(wordFailure(err));
		set.setPhase('failed');
	}
}

function useTh30Call(navigate: NavigateFunction, { pageLineRef, toldRef }: PageRefs): Th30Call {
	const [phase, setPhase] = useState<Phase>('idle');
	const [isMuted, setMuted] = useState(false);
	const [failure, setFailure] = useState<string | null>(null);
	const [status, setStatus] = useState<InkWaveStatus>('disconnected');
	const [levels, setLevels] = useState({ input: 0, output: 0 });
	const clientRef = useRef<LiveSessionClient | null>(null);
	const chimeRef = useRef<ReturnType<typeof makeChime> | null>(null);

	const stop = useCallback(() => {
		clientRef.current?.disconnect();
		clientRef.current = null;
		chimeRef.current?.close();
		chimeRef.current = null;
		th30Voice.user = 0;
		th30Voice.agent = 0;
		setMuted(false);
		setStatus('disconnected');
		setLevels({ input: 0, output: 0 });
		setPhase('idle');
	}, []);

	const start = useCallback(
		() =>
			startCall({
				navigate,
				clientRef,
				chimeRef,
				pageLineRef,
				toldRef,
				set: { setStatus, setPhase, setFailure, setLevels },
			}),
		[navigate, pageLineRef, toldRef],
	);

	const toggle = useCallback(() => {
		if (clientRef.current) stop();
		else void start();
	}, [start, stop]);

	useEffect(() => stop, [stop]);

	const mute = () => {
		const client = clientRef.current;
		if (client) setMuted(client.toggleMute());
	};
	return { phase, isMuted, failure, status, levels, clientRef, toggle, stop, mute };
}

/** While a call is live, tells th30 what the page notes and where the person goes, each debounced. */
function useTh30Feed(
	phase: Phase,
	clientRef: RefObject<LiveSessionClient | null>,
	{ pageLine, toldRef }: PageRefs,
): void {
	useEffect(() => {
		if (phase !== 'live') return;
		let pending: string[] = [];
		let timer: number | undefined;
		const off = onTh30Note((line) => {
			pending.push(line);
			window.clearTimeout(timer);
			timer = window.setTimeout(() => {
				const lines = pending;
				pending = [];
				clientRef.current?.sendContext(`(state) ${lines.join('; ')}`);
			}, PAGE_LINE_DEBOUNCE_MS);
		});
		return () => {
			off();
			window.clearTimeout(timer);
		};
	}, [phase, clientRef]);

	useEffect(() => {
		if (phase !== 'live' || !pageLine || pageLine === toldRef.current) return;
		const timer = window.setTimeout(() => {
			const client = clientRef.current;
			if (!client || toldRef.current === undefined) return;
			toldRef.current = pageLine;
			client.sendContext(pageLine);
		}, PAGE_LINE_DEBOUNCE_MS);
		return () => {
			window.clearTimeout(timer);
		};
	}, [pageLine, phase, clientRef, toldRef]);
}

/** Marks the page while a call is on, and lets Escape end it. */
function useLiveCallKeys(isLive: boolean, stop: () => void): void {
	useEffect(() => {
		document.documentElement.classList.toggle('th30-live', isLive);
		if (!isLive) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !event.defaultPrevented) stop();
		};
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('keydown', onKey);
		};
	}, [isLive, stop]);
}

export function Th30Provider({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	useSiteSurface(navigate);
	const page = usePageRefs();
	const call = useTh30Call(navigate, page);
	useTh30Feed(call.phase, call.clientRef, page);
	const isLive = call.phase !== 'idle';
	useLiveCallKeys(isLive, call.stop);

	return (
		<Th30Context.Provider
			value={{
				isLive,
				toggle: call.toggle,
				canMute: call.phase === 'live',
				isMuted: call.isMuted,
				mute: call.mute,
			}}
		>
			{children}
			<Theme theme={theoremSiteTheme} mode="dark">
				<Th30Strip call={call} isLive={isLive} />
			</Theme>
		</Th30Context.Provider>
	);
}

/** The strip along the page while a call is on: th30's voice, and how the call is going. */
function Th30Strip({ call, isLive }: { call: Th30Call; isLive: boolean }) {
	const { phase, status, levels } = call;
	return (
		<div className="th30-strip" inert={!isLive} aria-hidden={!isLive}>
			{phase === 'live' ? (
				<div className="th30-wave" aria-hidden>
					<InkWaveform
						status={status}
						inputLevel={levels.input}
						outputLevel={levels.output}
						variant="strip"
					/>
				</div>
			) : null}
			<span className="th30-strip-status" role="status">
				{stripStatus(phase, call.failure)}
			</span>
		</div>
	);
}

/** Seconds for a custom property written as `12ms` or `0.22s`. */
function cssSeconds(name: string, fallback: number): number {
	const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	const value = Number.parseFloat(raw);
	if (!Number.isFinite(value)) return fallback;
	return raw.endsWith('ms') ? value / 1000 : value;
}

/** How long the strip's bars take to arrive, and how long the last one takes to appear. */
function waveEntrance(): { total: number; fade: number } {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return { total: 1, fade: 0.2 };
	const fade = cssSeconds('--th30-bar-in', 0.14);
	const stagger = cssSeconds('--th30-bar-stagger', 0.006);
	const bars = Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue('--th30-bars'),
	);
	const count = Number.isFinite(bars) ? bars : 120;
	return { total: (count - 1) * stagger + fade, fade };
}

/**
 * A calm two-note chime for "you're through". Its own context, made on the click that starts
 * the call, so the browser lets it sound. A low major third. It stays audible until the last
 * bar, then leaves with that bar.
 */
function makeChime(): { play: () => void; close: () => void } {
	const ctx = new AudioContext();
	const { total, fade } = waveEntrance();
	return {
		play: () => {
			const at = ctx.currentTime + 0.02;
			const end = at + total;
			const releaseAt = end - fade;
			[261.63, 329.63].forEach((hz, i) => {
				const start = at + i * 0.28;
				const attackEnd = start + 0.1;
				const tone = ctx.createOscillator();
				const gain = ctx.createGain();
				tone.type = 'sine';
				tone.frequency.value = hz;
				gain.gain.setValueAtTime(0, start);
				gain.gain.linearRampToValueAtTime(0.04, attackEnd);
				if (releaseAt > attackEnd + 0.02) {
					gain.gain.exponentialRampToValueAtTime(0.018, releaseAt);
				}
				gain.gain.linearRampToValueAtTime(0.001, end - 0.02);
				gain.gain.exponentialRampToValueAtTime(0.0001, end);
				tone.connect(gain).connect(ctx.destination);
				tone.start(start);
				tone.stop(end);
			});
		},
		close: () => {
			window.setTimeout(() => void ctx.close(), Math.ceil(total * 1000) + 400);
		},
	};
}
