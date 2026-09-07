import type { TurnEvent, UserTurnDraft } from 'theorum';
import {
	foldTurnEvents,
	type ProfileInterface,
	prepareUserTurn,
	streamThoughtsEnabled,
	type TranscriptBlock,
} from 'theorum/interface';
import type { PlaygroundRunPayload } from './run-payload';

export type TurnRequestBody = {
	profile: PlaygroundRunPayload['profile'];
	customTools: PlaygroundRunPayload['customTools'];
	structured?: PlaygroundRunPayload['structured'];
	input: {
		text?: string;
		attachments?: Array<{ name: string; mimeType: string; data: string }>;
		voice?: Array<{ name: string; mimeType: string; data: string }>;
	};
};

export function projectUserTurn(
	iface: ProfileInterface,
	draft: UserTurnDraft,
): { ok: true; blocks: TranscriptBlock[]; draft: UserTurnDraft } | { ok: false; issues: string[] } {
	const prepared = prepareUserTurn(iface.inputs, draft, iface.guardrails);
	if (!prepared.ok) {
		return { ok: false, issues: prepared.issues.map((issue) => issue.message) };
	}
	return { ok: true, blocks: prepared.blocks, draft: prepared.draft };
}

export function foldAssistantTurn(
	iface: ProfileInterface,
	events: readonly TurnEvent[],
): TranscriptBlock[] {
	return foldTurnEvents(events, {
		showThoughts: streamThoughtsEnabled(iface.outputs),
	}).filter((block) => block.kind !== 'turn-done');
}

function parseStreamEvent(line: string): TurnEvent {
	const event = JSON.parse(line) as TurnEvent | { type: 'error'; error: string };
	if (event.type === 'error') {
		throw new Error(event.error);
	}
	return event;
}

export async function streamPlaygroundTurn(
	body: TurnRequestBody,
	onEvent: (event: TurnEvent) => void,
): Promise<void> {
	const response = await fetch('/api/playground/turn', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		const payload = (await response.json()) as { error?: string };
		throw new Error(payload.error ?? `Turn failed (${String(response.status)})`);
	}
	if (!response.body) {
		throw new Error('Turn stream missing body');
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';
		for (const line of lines) {
			if (!line.trim()) continue;
			onEvent(parseStreamEvent(line));
		}
	}

	const tail = buffer.trim();
	if (tail) {
		onEvent(parseStreamEvent(tail));
	}
}
