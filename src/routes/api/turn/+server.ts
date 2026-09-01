import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import {
	createProvider,
	defineProfile,
	getProfile,
	runTurn,
	type TurnEvent
} from '$lib/server/theorum';
import type { TurnRequestPayload, TurnResponsePayload } from '$lib/types/playground';

const PLAYGROUND_PROFILE_ID = 'playground.echo';

defineProfile({
	id: PLAYGROUND_PROFILE_ID,
	identity: {
		handle: 'playground',
		system: 'You are a concise assistant for THEORUM kernel playground smoke tests.'
	},
	model: {
		protocol: 'openAi',
		provider: 'openrouter',
		allow: ['sonar'],
		config: {
			sonar: {
				apiId: 'perplexity/sonar',
				thinking: { on: 'low', off: 'low' },
				thinkingLevels: ['low', 'medium', 'high'],
				summaries: { on: 'none', off: 'none' },
				maxOutputTokens: 512,
				temperature: 0.2,
				keyBuiltins: []
			}
		},
		select: { fast: 'sonar' }
	},
	tools: { allow: [] },
	inputs: { text: true },
	outputs: {},
	guardrails: {}
});

function collectTurn(events: TurnEvent[]) {
	let text = '';
	let stop: TurnEvent['stop'];
	const trace: TurnEvent[] = [];

	for (const event of events) {
		trace.push(event);
		if (event.type === 'text' && event.text) {
			text += event.text;
		}
		if (event.type === 'done') {
			stop = event.stop;
		}
		if (event.type === 'error') {
			throw new Error(event.error ?? 'Turn failed.');
		}
	}

	return { text, stop, trace };
}

export const POST: RequestHandler = async ({ request }) => {
	const openRouterApiKey = env.OPENROUTER_API_KEY;
	if (!openRouterApiKey) {
		const body: TurnResponsePayload = {
			ok: false,
			error: 'OPENROUTER_API_KEY is not set. Copy .env.example to .env and add a key.'
		};
		return json(body, { status: 503 });
	}

	let payload: TurnRequestPayload;
	try {
		payload = (await request.json()) as TurnRequestPayload;
	} catch {
		return json({ ok: false, error: 'Invalid JSON body.' } satisfies TurnResponsePayload, {
			status: 400
		});
	}

	const text = payload.text?.trim();
	if (!text) {
		return json({ ok: false, error: 'text is required.' } satisfies TurnResponsePayload, {
			status: 400
		});
	}

	try {
		const profile = getProfile(PLAYGROUND_PROFILE_ID);
		const provider = createProvider(profile, {
			openAiGateway: {
				apiKey: openRouterApiKey,
				siteUrl: 'https://theorum.dev',
				siteName: 'Theorum Playground'
			}
		});

		const events: TurnEvent[] = [];
		for await (const event of runTurn(
			{
				profile: PLAYGROUND_PROFILE_ID,
				select: 'fast',
				input: { text }
			},
			provider
		)) {
			events.push(event);
		}

		const result = collectTurn(events);
		const response: TurnResponsePayload = {
			ok: true,
			stop: result.stop ?? null,
			text: result.text,
			trace: result.trace
		};
		return json(response);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Turn failed.';
		return json({ ok: false, error: message } satisfies TurnResponsePayload, { status: 500 });
	}
};
