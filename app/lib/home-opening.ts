import type { ConversationView } from '@theoremjs/react';
import type { StudioRunPayload } from '@theoremjs/studio';
import { useEffect, useRef, useState } from 'react';

type Opening = { conversation: string; view: ConversationView };

/** Which written exchange a landing chat opens on: the goals screen's, or the interface tile's. */
export type OpeningExchange = 'goals' | 'interface';

/** Stores the opening exchange on `draft`: its ref and view, or null when it could not be stored. */
async function startOpening(
	draft: StudioRunPayload,
	exchange: OpeningExchange,
	signal: AbortSignal,
): Promise<Opening | null> {
	const { profile, customTools, structured, dependencies } = draft;
	try {
		const response = await fetch(
			exchange === 'goals' ? '/api/home/start' : `/api/home/start?exchange=${exchange}`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ profile, customTools, structured, dependencies }),
				signal,
			},
		);
		if (!response.ok) return null;
		const body: Partial<Opening> = await response.json();
		return typeof body.conversation === 'string' && body.view
			? { conversation: body.conversation, view: body.view }
			: null;
	} catch {
		return null;
	}
}

/**
 * The conversation a landing chat opens on: its written exchange, stored by the server for this
 * visit and read by the agent's guardrails, with the view the chat draws at once. Started again
 * each time `runs` changes. Undefined while it is stored; null when it could not be, and the chat
 * opens empty.
 */
export function useOpening(
	payload: StudioRunPayload | undefined,
	runs: number,
	exchange: OpeningExchange = 'goals',
) {
	const [opening, setOpening] = useState<{ runs: number; started: Opening | null }>();
	const latest = useRef(payload);
	latest.current = payload;
	const hasPayload = payload !== undefined;
	useEffect(() => {
		const draft = latest.current;
		if (!hasPayload || !draft) return;
		if (draft.profile.type !== 'text') {
			setOpening({ runs, started: null });
			return;
		}
		const controller = new AbortController();
		void startOpening(draft, exchange, controller.signal).then((started) => {
			if (!controller.signal.aborted) setOpening({ runs, started });
		});
		return () => {
			controller.abort();
		};
	}, [hasPayload, runs, exchange]);
	return opening?.runs === runs ? opening : undefined;
}
