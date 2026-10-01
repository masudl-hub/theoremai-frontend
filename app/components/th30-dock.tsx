import { IconButton } from '@astryxdesign/core/IconButton';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Theme } from '@astryxdesign/core/theme';
import { IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import { LiveSessionClient } from '@theoremjs/react/client';
import { InkWaveform, type InkWaveStatus } from '@theoremjs/react/ui';
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { useLocation, useMatches, useNavigate } from 'react-router';
import { theoremSiteTheme } from '../built/theorem-site';
import { docsPath, highlightBlock } from '../lib/docs/th30-client';
import { TH30_PROFILE_ID } from '../lib/th30-id';
import {
	type Th30Page,
	type Th30PageHandle,
	th30PageLine,
	useTh30PlaygroundState,
} from '../lib/th30-page';
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

export function Th30Provider({ children }: { children: ReactNode }) {
	const [phase, setPhase] = useState<Phase>('idle');
	const [isMuted, setMuted] = useState(false);
	/** Why the last call failed, in the profile's own wording. */
	const [failure, setFailure] = useState<string | null>(null);
	const [status, setStatus] = useState<InkWaveStatus>('disconnected');
	const [levels, setLevels] = useState({ input: 0, output: 0 });
	const clientRef = useRef<LiveSessionClient | null>(null);
	const chimeRef = useRef<ReturnType<typeof makeChime> | null>(null);
	const navigate = useNavigate();
	const pageLine = useTh30PageLine();
	const pageLineRef = useRef(pageLine);
	pageLineRef.current = pageLine;
	/** The last page line th30 was told, so an unchanged page says nothing; `undefined` until the call is greeted. */
	const toldRef = useRef<string | null | undefined>(undefined);

	const applyTool = useCallback(
		(name: string, args: Record<string, unknown>) => {
			if (name === 'navigate') {
				const slug = typeof args.slug === 'string' ? args.slug : '';
				const blockId = typeof args.blockId === 'string' ? args.blockId : undefined;
				if (slug) {
					void navigate(docsPath(slug, blockId));
					if (blockId) {
						window.setTimeout(() => {
							highlightBlock(blockId);
						}, 400);
					}
				}
			}
			if (name === 'highlight') {
				const blockId = typeof args.blockId === 'string' ? args.blockId : '';
				const label = typeof args.label === 'string' ? args.label : undefined;
				if (blockId) highlightBlock(blockId, label);
			}
		},
		[navigate],
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
					client.sendText(line ? `(call connected) ${line}` : '(call connected)');
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
			// Th30's tools are read-only and never gate; the relay runs each call and the session answers the model.
			onToolCall: async (name, args, meta) => {
				applyTool(name, args);
				await clientRef.current?.executeToolOnRelay({ callId: meta.callId });
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
	}, [applyTool]);

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
	}, [pageLine, phase]);

	const isLive = phase !== 'idle';
	const toggle = useCallback(() => {
		if (clientRef.current) stop();
		else void start();
	}, [start, stop]);

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

	useEffect(() => stop, [stop]);

	return (
		<Th30Context.Provider value={{ isLive, toggle }}>
			{children}
			<Theme theme={theoremSiteTheme} mode="dark">
				<div className="th30-strip" inert={!isLive} aria-hidden={!isLive}>
					<IconButton
						label={isMuted ? 'Unmute' : 'Mute'}
						icon={isMuted ? <IconMicrophoneOff /> : <IconMicrophone />}
						variant="ghost"
						size="sm"
						isDisabled={phase !== 'live'}
						onClick={() => {
							const client = clientRef.current;
							if (client) setMuted(client.toggleMute());
						}}
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
						{phase === 'connecting'
							? 'Connecting to th30…'
							: phase === 'failed'
								? `th30 couldn’t connect${failure ? `: ${failure}` : '.'} Click the light to close, then try again.`
								: ''}
					</span>
				</div>
			</Theme>
		</Th30Context.Provider>
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
