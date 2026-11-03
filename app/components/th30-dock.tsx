import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { VStack } from '@astryxdesign/core/VStack';
import { IconMessage, IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import {
	type ComponentType,
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { Th30Light } from './th30-light';
import './th30.css';

export type Th30Api = {
	/** A call is on: connecting, live, or failed and still showing why. */
	isLive: boolean;
	/** Starts a call, or ends the one that's on. */
	toggle: () => void;
	/** Puts a question to th30: a call that opens with it, or a typed line into the one that's on. */
	ask: (question: string) => void;
	/** True once the call can be muted. */
	canMute: boolean;
	isMuted: boolean;
	mute: () => void;
	/** The messages panel is open. */
	messagesOpen: boolean;
	toggleMessages: () => void;
};

export type Th30Status = Pick<Th30Api, 'isLive' | 'canMute' | 'isMuted' | 'messagesOpen'>;
export type Th30Actions = Omit<Th30Api, keyof Th30Status>;

/** What the provider gives the call once it has loaded. */
export type Th30RuntimeProps = {
	connect: (actions: Th30Actions) => void;
	onStatus: (status: Th30Status) => void;
};

const NO_CALL: Th30Status = {
	isLive: false,
	canMute: false,
	isMuted: false,
	messagesOpen: false,
};

const Th30Context = createContext<Th30Api>({
	...NO_CALL,
	toggle: () => undefined,
	ask: () => undefined,
	mute: () => undefined,
	toggleMessages: () => undefined,
});

export function useTh30(): Th30Api {
	return useContext(Th30Context);
}

function Th30SearchTrigger({
	call,
	hover,
	question,
}: {
	call: Th30Api;
	hover: string;
	question?: string;
}) {
	return (
		<Tooltip content={hover} placement="below">
			<Button
				label={call.isLive ? 'End call' : 'Ask th30'}
				variant="ghost"
				size="lg"
				aria-pressed={call.isLive}
				onClick={() => {
					if (question?.trim() && !call.isLive) call.ask(question);
					else call.toggle();
				}}
			>
				<HStack align="center" gap={2}>
					<Th30Light className="th30-search-cloud" />
					<span>{call.isLive ? 'End call' : 'Ask th30'}</span>
				</HStack>
			</Button>
		</Tooltip>
	);
}

function Th30MuteButton({ call }: { call: Th30Api }) {
	if (!call.canMute) return null;
	return (
		<Tooltip content={call.isMuted ? 'Unmute' : 'Mute'} placement="end">
			<IconButton
				label={call.isMuted ? 'Unmute' : 'Mute'}
				icon={call.isMuted ? <IconMicrophoneOff /> : <IconMicrophone />}
				variant="ghost"
				size="sm"
				onClick={call.mute}
			/>
		</Tooltip>
	);
}
function Th30MessageButton({ call }: { call: Th30Api }) {
	if (!call.canMute && !call.messagesOpen) return null;
	return (
		<Tooltip content={call.messagesOpen ? 'Hide messages' : 'Show messages'} placement="end">
			<IconButton
				label={call.messagesOpen ? 'Hide messages' : 'Show messages'}
				icon={<IconMessage />}
				variant="ghost"
				size="sm"
				aria-expanded={call.messagesOpen}
				aria-controls="th30-messages"
				onClick={call.toggleMessages}
			/>
		</Tooltip>
	);
}

/** th30's light as a button: click to call, click again to end. */
export function Th30Trigger({
	placement,
	question,
}: {
	placement: 'rail' | 'search';
	/** What the visitor typed beside the button. A call that opens on the button opens with it. */
	question?: string;
}) {
	const th30 = useTh30();
	const label = th30.isLive ? 'End the call with th30' : 'Talk to th30';
	const hover = th30.isLive ? label : "Starts a live call with th30, theorem's agent";
	if (placement === 'search')
		return <Th30SearchTrigger call={th30} hover={hover} question={question} />;
	return (
		<VStack align="center" gap={1}>
			<Th30MuteButton call={th30} />
			<Th30MessageButton call={th30} />
			<Tooltip content={hover} placement="end">
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

/** How long the call may wait for the browser to go idle before it loads anyway. */
const RUNTIME_IDLE_TIMEOUT_MS = 2000;

/**
 * th30's buttons work from the first paint. The call behind them loads when the browser goes idle,
 * or on the first press, and a press that gets there first runs once it has.
 */
export function Th30Provider({ children }: { children: ReactNode }) {
	const [Runtime, setRuntime] = useState<ComponentType<Th30RuntimeProps>>();
	const [status, setStatus] = useState(NO_CALL);
	const actions = useRef<Th30Actions>(undefined);
	const pressed = useRef<(call: Th30Actions) => void>(undefined);
	const loading = useRef(false);

	const load = useCallback(() => {
		if (loading.current) return;
		loading.current = true;
		import('./th30-runtime').then(
			({ Th30Runtime }) => {
				setRuntime(() => Th30Runtime);
			},
			() => {
				loading.current = false;
			},
		);
	}, []);

	useEffect(() => {
		if (!('requestIdleCallback' in window)) {
			load();
			return;
		}
		const idle = window.requestIdleCallback(load, { timeout: RUNTIME_IDLE_TIMEOUT_MS });
		return () => {
			window.cancelIdleCallback(idle);
		};
	}, [load]);

	const connect = useCallback((next: Th30Actions) => {
		actions.current = next;
		pressed.current?.(next);
		pressed.current = undefined;
	}, []);

	const api = useMemo((): Th30Api => {
		const press = (act: (call: Th30Actions) => void) => {
			if (actions.current) {
				act(actions.current);
				return;
			}
			pressed.current = act;
			load();
		};
		return {
			...status,
			toggle: () => {
				press((call) => {
					call.toggle();
				});
			},
			ask: (question) => {
				press((call) => {
					call.ask(question);
				});
			},
			mute: () => {
				press((call) => {
					call.mute();
				});
			},
			toggleMessages: () => {
				press((call) => {
					call.toggleMessages();
				});
			},
		};
	}, [status, load]);

	return (
		<Th30Context.Provider value={api}>
			{children}
			{Runtime ? <Runtime connect={connect} onStatus={setStatus} /> : null}
		</Th30Context.Provider>
	);
}
