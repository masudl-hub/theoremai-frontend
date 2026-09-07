import type { TurnBlob, TurnEvent } from 'theorum';
import {
	appendAssistantEventsToHistory,
	appendUserDraftToHistory,
	applyTurnEventsToSession,
	type ComposerProfileInterface,
	type InterfaceTurnSession,
	pausedToolFromEvents,
	type TranscriptBlock,
	type UserTurnHistoryMedia,
} from 'theorum/interface';
import type { PlaygroundRunPayload } from './run-payload';
import {
	buildTurnRequestBody,
	foldAssistantTurn,
	streamPlaygroundTurn,
	turnInputFromSession,
} from './turn-client';

type TurnMedia = UserTurnHistoryMedia;

function commitCompletedTurn(
	session: InterfaceTurnSession,
	events: TurnEvent[],
	media: TurnMedia,
): InterfaceTurnSession {
	let history = session.history;
	if (session.pendingUserDraft) {
		history = appendUserDraftToHistory(history, session.pendingUserDraft, media);
	}
	history = appendAssistantEventsToHistory(history, events);

	return {
		...applyTurnEventsToSession(session, events),
		history,
		pausedTool: null,
		assistantEvents: [],
		pendingUserDraft: null,
		toolSnapshot: undefined,
		promotedToolIds: [],
	};
}

function commitContinuationTurn(
	session: InterfaceTurnSession,
	seedLength: number,
	events: TurnEvent[],
): InterfaceTurnSession {
	const continuationEvents = events.slice(seedLength);
	return {
		...applyTurnEventsToSession(session, events),
		history: appendAssistantEventsToHistory(session.history, continuationEvents),
		pausedTool: null,
		assistantEvents: [],
		pendingUserDraft: null,
		toolSnapshot: undefined,
		promotedToolIds: [],
	};
}

function pauseTurn(
	session: InterfaceTurnSession,
	events: TurnEvent[],
	media: TurnMedia,
): InterfaceTurnSession {
	let history = session.history;
	if (session.pendingUserDraft) {
		history = appendUserDraftToHistory(history, session.pendingUserDraft, media);
	}

	return {
		...applyTurnEventsToSession(session, events),
		history,
		pausedTool: pausedToolFromEvents(events),
		assistantEvents: [...events],
		pendingUserDraft: null,
	};
}

function pauseContinuationTurn(
	session: InterfaceTurnSession,
	seedLength: number,
	events: TurnEvent[],
): InterfaceTurnSession {
	const continuationEvents = events.slice(seedLength);
	return {
		...applyTurnEventsToSession(session, events),
		history: appendAssistantEventsToHistory(session.history, continuationEvents),
		pausedTool: pausedToolFromEvents(events),
		assistantEvents: [...events],
		pendingUserDraft: null,
	};
}

export function toTurnMedia(encodedAttachments?: TurnBlob[], encodedVoice?: TurnBlob[]): TurnMedia {
	return {
		...(encodedAttachments?.length ? { attachments: encodedAttachments } : {}),
		...(encodedVoice?.length ? { voice: encodedVoice } : {}),
	};
}

async function streamFoldedEvents(
	stream: (onEvent: (event: TurnEvent) => void) => Promise<void>,
	onStream: (blocks: TranscriptBlock[]) => void,
	iface: ComposerProfileInterface,
	seedEvents: TurnEvent[],
): Promise<TurnEvent[]> {
	const events = [...seedEvents];
	await stream((event) => {
		events.push(event);
		onStream(foldAssistantTurn(iface, events));
	});
	return events;
}

export async function continueAfterTool(args: {
	iface: ComposerProfileInterface;
	payload: PlaygroundRunPayload;
	session: InterfaceTurnSession;
	onStream: (blocks: TranscriptBlock[]) => void;
	seedEvents: TurnEvent[];
}): Promise<
	| { ok: true; session: InterfaceTurnSession; assistantBlocks: TranscriptBlock[] }
	| { ok: false; error: string }
> {
	const seedLength = args.seedEvents.length;
	try {
		const events = await streamFoldedEvents(
			(onEvent) =>
				streamPlaygroundTurn(
					buildTurnRequestBody(args.payload, args.session, turnInputFromSession(args.session)),
					onEvent,
				),
			args.onStream,
			args.iface,
			args.seedEvents,
		);

		if (pausedToolFromEvents(events)) {
			return {
				ok: true,
				session: pauseContinuationTurn(args.session, seedLength, events),
				assistantBlocks: foldAssistantTurn(args.iface, events),
			};
		}

		return {
			ok: true,
			session: commitContinuationTurn(args.session, seedLength, events),
			assistantBlocks: foldAssistantTurn(args.iface, events),
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { ok: false, error: message };
	}
}

export async function finalizeTurnStream(args: {
	session: InterfaceTurnSession;
	events: TurnEvent[];
	media: TurnMedia;
}): Promise<InterfaceTurnSession> {
	if (pausedToolFromEvents(args.events)) {
		return pauseTurn(args.session, args.events, args.media);
	}
	return commitCompletedTurn(args.session, args.events, args.media);
}

export async function streamFoldedTurn(args: {
	iface: ComposerProfileInterface;
	onStream: (blocks: TranscriptBlock[]) => void;
	seedEvents: TurnEvent[];
	stream: (onEvent: (event: TurnEvent) => void) => Promise<void>;
}): Promise<TurnEvent[]> {
	return streamFoldedEvents(args.stream, args.onStream, args.iface, args.seedEvents);
}
