import { json } from '@sveltejs/kit';

const NDJSON_HEADERS = {
	'content-type': 'application/x-ndjson; charset=utf-8',
	'cache-control': 'no-store',
} as const;

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

/** NDJSON response that streams async events, emitting `{ type: 'error' }` on failure. */
export function ndjsonEventStream(source: AsyncIterable<unknown>): Response {
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
					encoder.encode(`${JSON.stringify({ type: 'error', error: errorMessage(err) })}\n`),
				);
				controller.close();
			}
		},
	});
	return new Response(stream, { headers: NDJSON_HEADERS });
}

export function badRequestJson(err: unknown): Response {
	return json({ error: errorMessage(err) }, { status: 400 });
}
