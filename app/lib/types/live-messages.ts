import { GATE_DECISIONS, type GateDecision } from '@theoremai/agents';

function isGateDecision(value: unknown): value is GateDecision {
	return GATE_DECISIONS.some((decision) => decision === value);
}

export type LiveRelayClientMessage =
	| { type: 'audio'; data: string }
	| { type: 'video'; data: string; mimeType?: string }
	| { type: 'text'; text: string }
	/** Run a call the model made, by its id; the live session holds its name, input and gate. */
	| {
			type: 'executeTool';
			callId: string;
			decision?: GateDecision;
			input?: unknown;
			secret?: string;
	  };

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
		case 'executeTool': {
			const { callId, decision, input, secret } = record;
			if (typeof callId !== 'string') return null;
			if (decision !== undefined && !isGateDecision(decision)) return null;
			if (secret !== undefined && typeof secret !== 'string') return null;
			return {
				type: 'executeTool',
				callId,
				...(decision !== undefined ? { decision } : {}),
				...(input !== undefined ? { input } : {}),
				...(secret !== undefined ? { secret } : {}),
			};
		}
		default:
			return null;
	}
}
