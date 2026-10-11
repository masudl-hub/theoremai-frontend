import type { TurnEvent } from '@theoremjs/agents';
import {
	createMemoryPageToolBroker,
	createMemorySessionStore,
	createTheoremSessionBoundary,
	type TheoremSessionBoundary,
} from '@theoremjs/react/server';

const sessionStore = createMemorySessionStore();
const pageToolBroker = createMemoryPageToolBroker();

export function studioSession(request: Request): Promise<TheoremSessionBoundary> {
	return createTheoremSessionBoundary({ request, sessionStore, pageToolBroker });
}

export async function* recordStudioSession<T extends { type: string }>(
	boundary: TheoremSessionBoundary,
	events: AsyncIterable<T>,
): AsyncGenerator<T> {
	for await (const event of events) {
		if (event.type === 'done' || event.type === 'provider_checkpoint') {
			const completion = event as T & Extract<TurnEvent, { type: 'done' | 'provider_checkpoint' }>;
			if (completion.providerState) await boundary.recordCheckpoint(completion.providerState);
		}
		yield event;
	}
}

export function sessionResponse(boundary: TheoremSessionBoundary, response: Response): Response {
	if (boundary.setCookie) response.headers.append('set-cookie', boundary.setCookie);
	return response;
}
