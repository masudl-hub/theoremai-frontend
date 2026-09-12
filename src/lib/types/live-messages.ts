export type LiveToolResponse = { id: string; name: string; output: unknown };

export type LiveRelayClientMessage =
	| { type: 'audio'; data: string }
	| { type: 'video'; data: string; mimeType?: string }
	| { type: 'text'; text: string }
	| {
			type: 'executeTool';
			name: string;
			callId: string;
			input?: unknown;
			resume?: { value?: unknown; granted?: boolean };
			credentials?: Record<string, unknown>;
	  }
	| { type: 'toolResponse'; id: string; name: string; output: unknown }
	| { type: 'toolResponses'; responses: LiveToolResponse[] };

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
			if (typeof record.name !== 'string' || typeof record.callId !== 'string') return null;
			const resumeRaw = record.resume;
			const credentialsRaw = record.credentials;
			return {
				type: 'executeTool',
				name: record.name,
				callId: record.callId,
				input: record.input,
				resume:
					resumeRaw && typeof resumeRaw === 'object' && !Array.isArray(resumeRaw)
						? resumeRaw
						: undefined,
				credentials:
					credentialsRaw && typeof credentialsRaw === 'object' && !Array.isArray(credentialsRaw)
						? Object.fromEntries(Object.entries(credentialsRaw))
						: undefined,
			};
		}
		case 'toolResponse':
			return typeof record.id === 'string' && typeof record.name === 'string'
				? {
						type: 'toolResponse',
						id: record.id,
						name: record.name,
						output: record.output,
					}
				: null;
		case 'toolResponses': {
			if (!Array.isArray(record.responses)) return null;
			const responses = record.responses.filter(
				(entry): entry is LiveToolResponse =>
					Boolean(entry) &&
					typeof entry === 'object' &&
					typeof (entry as LiveToolResponse).id === 'string' &&
					typeof (entry as LiveToolResponse).name === 'string',
			);
			return responses.length > 0 ? { type: 'toolResponses', responses } : null;
		}
		default:
			return null;
	}
}
