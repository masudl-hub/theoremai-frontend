import { json } from '@sveltejs/kit';
import type { TurnHistoryMessage } from 'theorum';
import { enqueuePlaygroundSteer, openPlaygroundSteerInbox } from '$lib/server/playground-steer';
import type { RequestHandler } from './$types';

type SteerBody = {
	turnId?: string;
	inject?: TurnHistoryMessage[];
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as SteerBody;
		const turnId = body.turnId?.trim();
		if (!turnId) {
			return json({ error: 'turnId is required' }, { status: 400 });
		}
		if (!Array.isArray(body.inject) || body.inject.length === 0) {
			return json({ error: 'inject must be a non-empty array' }, { status: 400 });
		}
		await openPlaygroundSteerInbox(turnId);
		await enqueuePlaygroundSteer(turnId, body.inject);
		return json({ ok: true });
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
	}
};
