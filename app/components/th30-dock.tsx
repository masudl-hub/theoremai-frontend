import { IconButton } from '@astryxdesign/core/IconButton';
import { Theme } from '@astryxdesign/core/theme';
import { IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import { LiveSessionClient } from '@theoremjs/react/client';
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { useNavigate } from 'react-router';
import { theoremSiteTheme } from '../built/theorem-site';
import { docsPath, highlightBlock } from '../lib/docs/th30-client';
import { TH30_PROFILE_ID } from '../lib/th30-id';
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

/** Tall and narrow in the rail; a wide band beside the search. */
const RAIL_SPREAD = [1.5, 0.75] as const;
const SEARCH_SPREAD = [0.42, 1] as const;

/** th30's light as a button: click to call, click again to end. */
export function Th30Trigger({
	theme,
	placement,
}: {
	theme: 'dark' | 'system';
	placement: 'rail' | 'search';
}) {
	const th30 = useTh30();
	return (
		<button
			type="button"
			className={`th30-trigger th30-trigger-${placement}`}
			aria-label={th30.isLive ? 'End the call with th30' : 'Talk to th30'}
			aria-pressed={th30.isLive}
			onClick={th30.toggle}
		>
			<Th30Light theme={theme} spread={placement === 'rail' ? RAIL_SPREAD : SEARCH_SPREAD} />
		</button>
	);
}

type Phase = 'idle' | 'connecting' | 'live' | 'failed';

export function Th30Provider({ children }: { children: ReactNode }) {
	const [phase, setPhase] = useState<Phase>('idle');
	const [isMuted, setMuted] = useState(false);
	const clientRef = useRef<LiveSessionClient | null>(null);
	const navigate = useNavigate();

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
		th30Voice.user = 0;
		th30Voice.agent = 0;
		setMuted(false);
		setPhase('idle');
	}, []);

	const start = useCallback(async () => {
		if (clientRef.current) return;
		const client = new LiveSessionClient({
			profile: TH30_PROFILE_ID,
			voiceIngress: true,
			onStatusChange: (next) => {
				if (clientRef.current !== client) return;
				if (next === 'error') setPhase('failed');
				else if (next !== 'connecting' && next !== 'disconnected') setPhase('live');
			},
			onError: () => {
				if (clientRef.current === client) setPhase('failed');
			},
			onVolumeLevel: (level, isUser) => {
				if (isUser) th30Voice.user = level;
				else th30Voice.agent = level;
			},
			// Th30's tools are read-only and never gate; the relay runs each call and the session answers the model.
			onToolCall: async (name, args, meta) => {
				applyTool(name, args);
				await clientRef.current?.executeToolOnRelay({ callId: meta.callId });
			},
		});
		clientRef.current = client;
		setPhase('connecting');
		try {
			await client.connect();
		} catch {
			if (clientRef.current === client) setPhase('failed');
		}
	}, [applyTool]);

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
					<Waveform isRunning={isLive} />
					<span className="th30-strip-status" role="status">
						{phase === 'connecting'
							? 'Connecting to th30…'
							: phase === 'failed'
								? 'th30 couldn’t connect. Click the light to close, then try again.'
								: ''}
					</span>
				</div>
			</Theme>
		</Th30Context.Provider>
	);
}

/** One bar per sample, newest on the right. */
const SAMPLE_MS = 60;
const PITCH = 8;
const BAR = 3;

/**
 * The call's history, scrolling left: your voice in one tint, th30's in another. It draws only
 * while a call is on.
 */
function Waveform({ isRunning }: { isRunning: boolean }) {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		const ctx = canvas?.getContext('2d');
		if (!canvas || !ctx || !isRunning) return;
		const style = getComputedStyle(canvas);
		const userTint = style.getPropertyValue('--th30-user').trim() || '#fff';
		const agentTint = style.getPropertyValue('--th30-agent').trim() || '#2fd3a0';
		const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const samples: { level: number; agent: boolean }[] = [];
		let peakUser = 0;
		let peakAgent = 0;
		let sampledAt = performance.now();
		let frame = 0;

		const size = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.round(canvas.clientWidth * dpr);
			canvas.height = Math.round(canvas.clientHeight * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		size();
		const resize = new ResizeObserver(size);
		resize.observe(canvas);

		const tick = (now: number) => {
			frame = requestAnimationFrame(tick);
			peakUser = Math.max(peakUser, th30Voice.user);
			peakAgent = Math.max(peakAgent, th30Voice.agent);
			while (now - sampledAt >= SAMPLE_MS) {
				sampledAt += SAMPLE_MS;
				samples.push({ level: Math.max(peakUser, peakAgent), agent: peakAgent > peakUser });
				peakUser = 0;
				peakAgent = 0;
			}
			const width = canvas.clientWidth;
			const height = canvas.clientHeight;
			const count = Math.ceil(width / PITCH) + 1;
			if (samples.length > count) samples.splice(0, samples.length - count);
			const shift = still ? 0 : ((now - sampledAt) / SAMPLE_MS) * PITCH;
			ctx.clearRect(0, 0, width, height);
			for (let i = 0; i < samples.length; i++) {
				const sample = samples[samples.length - 1 - i];
				const x = width - BAR - i * PITCH - shift;
				const h = Math.max(BAR, Math.min(1, sample.level * 1.6) * height);
				ctx.fillStyle = sample.agent ? agentTint : userTint;
				ctx.beginPath();
				ctx.roundRect(x, height - h, BAR, h, BAR / 2);
				ctx.fill();
			}
		};
		frame = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(frame);
			resize.disconnect();
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		};
	}, [isRunning]);

	return <canvas ref={ref} className="th30-wave" aria-hidden />;
}
