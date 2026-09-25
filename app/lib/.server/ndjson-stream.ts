import type { ProfileDefinition } from '@theoremai/agents';
import { toErrorEvent, withPublicWording } from '@theoremai/agents/guardrails';

const NDJSON_HEADERS = {
	'content-type': 'application/x-ndjson; charset=utf-8',
	'cache-control': 'no-store',
} as const;

export function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

/**
 * NDJSON response that streams a run's events. A failure the run didn't turn into an event itself
 * (one thrown before the kernel's turn starts, such as registering the profile or creating its
 * provider) ends the stream as the kernel's own error event: the user reads its kind's wording,
 * from the profile's `lexicon` when it has one, and the raw detail stays in `errorInternal`.
 */
export function ndjsonEventStream(
	source: AsyncIterable<unknown>,
	lexicon?: ProfileDefinition['lexicon'],
): Response {
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			try {
				for await (const event of source) {
					controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
				}
				controller.close();
			} catch (err) {
				controller.enqueue(
					encoder.encode(`${JSON.stringify(withPublicWording(toErrorEvent(err), lexicon))}\n`),
				);
				controller.close();
			}
		},
	});
	return new Response(stream, { headers: NDJSON_HEADERS });
}

export function badRequestJson(err: unknown): Response {
	return Response.json({ error: errorMessage(err) }, { status: 400 });
}
