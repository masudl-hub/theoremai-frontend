import type { ProfileDefinition } from '@theoremjs/agents';
import { toErrorEvent, withPublicLabels } from '@theoremjs/agents/guardrails';
import { caughtStatus, clientError, forClient } from '@theoremjs/agents/host';

const NDJSON_HEADERS = {
	'content-type': 'application/x-ndjson; charset=utf-8',
	'cache-control': 'no-store',
} as const;

/**
 * NDJSON response that streams a run's events. A failure the run didn't turn into an event itself
 * (one thrown before the kernel's turn starts, such as registering the profile or creating its
 * provider) ends the stream as the kernel's own error event, as a visitor may have it: its kind's
 * wording, from the profile's `labels` when it has one, and never the raw detail.
 */
export function ndjsonEventStream(
	source: AsyncIterable<unknown>,
	labels?: ProfileDefinition['labels'],
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
					encoder.encode(
						`${JSON.stringify(forClient(withPublicLabels(toErrorEvent(err), labels)))}\n`,
					),
				);
				controller.close();
			}
		},
	});
	return new Response(stream, { headers: NDJSON_HEADERS });
}

/**
 * The reply for a failure caught before a route had anything to stream: the status of its kind,
 * and the wording a visitor may read, from the profile's `labels` when the request carried one.
 */
export function errorJson(err: unknown, labels?: ProfileDefinition['labels']): Response {
	return Response.json(clientError(err, labels), {
		status: caughtStatus(err),
		headers: { 'cache-control': 'no-store' },
	});
}
