import { json } from '@sveltejs/kit';
import type { TurnHistoryMessage } from '@theoremai/agents';
import { enqueuePlaygroundSteer, openPlaygroundSteerInbox } from '$lib/server/playground-steer';
import type { RequestHandler } from './$types';

type SteerBody = {
	/** Text turn id. */
	turnId?: string;
	/** Live session id (same inbox as turnId). */
	sessionId?: string;
	inject?: TurnHistoryMessage[];
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as SteerBody;
		const inboxId = body.sessionId?.trim() || body.turnId?.trim();
		if (!inboxId) {
			return json({ error: 'turnId or sessionId is required' }, { status: 400 });
		}
		if (!Array.isArray(body.inject) || body.inject.length === 0) {
			return json({ error: 'inject must be a non-empty array' }, { status: 400 });
		}
		await openPlaygroundSteerInbox(inboxId);
		await enqueuePlaygroundSteer(inboxId, body.inject);
		return json({ ok: true });
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
	}
};
