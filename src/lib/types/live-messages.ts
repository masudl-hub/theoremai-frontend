import type { TurnEvent } from '@theorum/core';

export type LiveRelayClientMessage =
	| { type: 'audio'; data: string }
	| { type: 'video'; data: string; mimeType?: string }
	| { type: 'text'; text: string }
	| { type: 'toolResponse'; id: string; name: string; output: unknown };

export function parseLiveRelayClientMessage(raw: unknown): LiveRelayClientMessage | null {
	if (!raw || typeof raw !== 'object') return null;
	const record = raw as Record<string, unknown>;
	switch (record.type) {
		case 'audio':
			return typeof record.data === 'string' ? { type: 'audio', data: record.data } : null;
		case 'video':
			return typeof record.data === 'string'
				? {
						type: 'video',
						data: record.data,
						mimeType: typeof record.mimeType === 'string' ? record.mimeType : undefined,
					}
				: null;
		case 'text':
			return typeof record.text === 'string' ? { type: 'text', text: record.text } : null;
		case 'toolResponse':
			return typeof record.id === 'string' && typeof record.name === 'string'
				? {
						type: 'toolResponse',
						id: record.id,
						name: record.name,
						output: record.output,
					}
				: null;
		default:
			return null;
	}
}

export type LiveServerEnvelope =
	| { type: 'ready' }
	| { type: 'interrupted' }
	| { type: 'events'; events: TurnEvent[] }
	| { type: 'error'; error: string };

function isTurnEvent(value: unknown): value is TurnEvent {
	return Boolean(value && typeof value === 'object' && 'type' in value);
}

export function parseLiveServerEnvelope(raw: unknown): LiveServerEnvelope | null {
	if (!raw || typeof raw !== 'object') return null;
	const record = raw as Record<string, unknown>;
	switch (record.type) {
		case 'ready':
		case 'interrupted':
			return { type: record.type };
		case 'events':
			if (!Array.isArray(record.events)) return null;
			return {
				type: 'events',
				events: record.events.filter(isTurnEvent),
			};
		case 'error':
			return typeof record.error === 'string' ? { type: 'error', error: record.error } : null;
		default:
			return null;
	}
}
