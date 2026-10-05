import { IconButton } from '@astryxdesign/core/IconButton';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Theme } from '@astryxdesign/core/theme';
import { IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import { defineAction } from '@theoremjs/agents/surface';
import { LiveSessionClient } from '@theoremjs/react/client';
import { InkWaveform, type InkWaveStatus } from '@theoremjs/react/ui';
import {
	createContext,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { type NavigateFunction, useLocation, useMatches, useNavigate } from 'react-router';
import { z } from 'zod';
import { theoremSiteTheme } from '../built/theorem-site';
import { docsPath, highlightBlock } from '../lib/docs/th30-client';
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
};

const Th30Context = createContext<Th30Api>({ isLive: false, toggle: () => undefined });

export function useTh30(): Th30Api {
	return useContext(Th30Context);
}

/** th30's light as a button: click to call, click again to end. */
export function Th30Trigger({
	theme,
	placement,
}: {
	theme: 'dark' | 'system';
	placement: 'rail' | 'search';
}) {
	const th30 = useTh30();
	const label = th30.isLive ? 'End the call with th30' : 'Talk to th30';
	return (
		<Tooltip content={label} placement={placement === 'rail' ? 'end' : 'below'}>
			<button
				type="button"
				className={`th30-trigger th30-trigger-${placement}`}
				aria-label={label}
				aria-pressed={th30.isLive}
				onClick={th30.toggle}
			>
				<Th30Light theme={theme} />
			</button>
		</Tooltip>
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

/** th30's docs tools, applied on the page: open an article (at a block), or point at a block. */
function applyDocsTool(
	navigate: NavigateFunction,
	name: string,
	args: Record<string, unknown>,
): void {
	const blockId = typeof args.blockId === 'string' ? args.blockId : undefined;
	if (name === 'highlight' && blockId) {
		highlightBlock(blockId, typeof args.label === 'string' ? args.label : undefined);
		return;
	}
	if (name !== 'navigate' || typeof args.slug !== 'string' || !args.slug) return;
	void navigate(docsPath(args.slug, blockId));
	if (blockId) {
		window.setTimeout(() => {
			highlightBlock(blockId);
		}, 400);
	}
}

/** What the strip says while a call connects or after it failed. */
function stripStatus(phase: Phase, failure: string | null): string {
	if (phase === 'connecting') return 'Connecting to th30…';
	if (phase !== 'failed') return '';
	return `th30 couldn’t connect${failure ? `: ${failure}` : '.'} Click the light to close, then try again.`;
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

function useTh30Call(navigate: NavigateFunction, { pageLineRef, toldRef }: PageRefs): Th30Call {
	const [phase, setPhase] = useState<Phase>('idle');
	const [isMuted, setMuted] = useState(false);
	const [failure, setFailure] = useState<string | null>(null);
	const [status, setStatus] = useState<InkWaveStatus>('disconnected');
	const [levels, setLevels] = useState({ input: 0, output: 0 });
	const clientRef = useRef<LiveSessionClient | null>(null);
	const chimeRef = useRef<ReturnType<typeof makeChime> | null>(null);

	/** Answers a `look` or `act` from the page; an applied call whose answer is lost is noted. */
	const answerSurface = useCallback(
		async (name: string, args: Record<string, unknown>, callId: string) => {
			const output = await th30Surfaces.answer(name, args, callId);
			try {
				await clientRef.current?.executeToolOnRelay({ callId, output });
			} catch {
				th30Surfaces.settled(callId, 'undelivered');
			}
		},
		[],
	);

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

	const start = useCallback(async () => {
		if (clientRef.current) return;
		const chime = makeChime();
		chimeRef.current = chime;
		let greeted = false;
		toldRef.current = undefined;
		const client = new LiveSessionClient({
			profile: TH30_PROFILE_ID,
			voiceIngress: true,
			onStatusChange: (next) => {
				if (clientRef.current !== client) return;
				setStatus(next);
				if (next === 'error') setPhase('failed');
				else if (next !== 'connecting' && next !== 'disconnected') setPhase('live');
				// Through: chime, then nudge th30 to greet first, knowing the page, rather than wait.
				if (next === 'listening' && !greeted) {
					greeted = true;
					chime.play();
					const line = pageLineRef.current;
					toldRef.current = line;
					const state = th30Surfaces.stateLine();
					client.sendText(['(call connected)', line, state].filter((part) => part).join(' '));
				}
			},
			onError: (err) => {
				if (clientRef.current !== client) return;
				console.warn('[th30]', err);
				setFailure(err.message);
				setPhase('failed');
			},
			onVolumeLevel: (level, isUser) => {
				if (isUser) th30Voice.user = level;
				else th30Voice.agent = level;
				setLevels((prev) => (isUser ? { ...prev, input: level } : { ...prev, output: level }));
			},
			// Th30's tools never gate. The relay runs the server ones; the page answers look and act.
			onToolCall: async (name, args, meta) => {
				if (th30Surfaces.isSurfaceTool(name)) {
					await answerSurface(name, args, meta.callId);
					return;
				}
				applyDocsTool(navigate, name, args);
				await clientRef.current?.executeToolOnRelay({ callId: meta.callId });
			},
			onTurnEvent: (event) => {
				if (event.type !== 'tool' || event.tool.phase !== 'cancel') return;
				th30Surfaces.settled(event.tool.callId, 'cancelled');
			},
		});
		clientRef.current = client;
		setFailure(null);
		setPhase('connecting');
		try {
			await client.connect();
		} catch (err) {
			if (clientRef.current !== client) return;
			console.warn('[th30]', err);
			setFailure(err instanceof Error ? err.message : null);
			setPhase('failed');
		}
	}, [navigate, answerSurface, pageLineRef, toldRef]);

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
		<Th30Context.Provider value={{ isLive, toggle: call.toggle }}>
			{children}
			<Theme theme={theoremSiteTheme} mode="dark">
				<Th30Strip call={call} isLive={isLive} />
			</Theme>
		</Th30Context.Provider>
	);
}

/** The strip along the page while a call is on: mute, th30's voice, and how the call is going. */
function Th30Strip({ call, isLive }: { call: Th30Call; isLive: boolean }) {
	const { phase, isMuted, status, levels } = call;
	return (
		<div className="th30-strip" inert={!isLive} aria-hidden={!isLive}>
			<IconButton
				label={isMuted ? 'Unmute' : 'Mute'}
				icon={isMuted ? <IconMicrophoneOff /> : <IconMicrophone />}
				variant="ghost"
				size="sm"
				isDisabled={phase !== 'live'}
				onClick={call.mute}
			/>
			<div className="th30-wave" aria-hidden>
				{phase === 'live' ? (
					<InkWaveform
						status={status}
						inputLevel={levels.input}
						outputLevel={levels.output}
						variant="strip"
					/>
				) : null}
			</div>
			<span className="th30-strip-status" role="status">
				{stripStatus(phase, call.failure)}
			</span>
		</div>
	);
}

/**
 * A soft two-note chime for "you're through". Its own context, made on the click that starts
 * the call, so the browser lets it sound.
 */
function makeChime(): { play: () => void; close: () => void } {
	const ctx = new AudioContext();
	return {
		play: () => {
			const at = ctx.currentTime + 0.02;
			[659.25, 987.77].forEach((hz, i) => {
				const start = at + i * 0.12;
				const tone = ctx.createOscillator();
				const gain = ctx.createGain();
				tone.type = 'sine';
				tone.frequency.value = hz;
				gain.gain.setValueAtTime(0, start);
				gain.gain.linearRampToValueAtTime(0.08, start + 0.015);
				gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
				tone.connect(gain).connect(ctx.destination);
				tone.start(start);
				tone.stop(start + 0.95);
			});
		},
		close: () => {
			window.setTimeout(() => void ctx.close(), 1200);
		},
	};
}
