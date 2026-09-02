import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { compilePlayground } from '$lib/playground/compile';
import { runCompiledAgentTurn } from '$lib/server/host';
import type { TurnRequestPayload, TurnResponsePayload } from '$lib/types/playground';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	let payload: TurnRequestPayload;
	try {
		payload = (await request.json()) as TurnRequestPayload;
	} catch {
		return json({ ok: false, error: 'Invalid JSON body.' } satisfies TurnResponsePayload, {
			status: 400,
		});
	}

	const text = payload.text.trim();
	if (!text) {
		return json({ ok: false, error: 'text is required.' } satisfies TurnResponsePayload, {
			status: 400,
		});
	}

	if (!Array.isArray(payload.nodes) || payload.nodes.length === 0) {
		return json({ ok: false, error: 'nodes is required.' } satisfies TurnResponsePayload, {
			status: 400,
		});
	}

	const compiled = compilePlayground(payload.nodes);
	if (!compiled.ok) {
		return json(
			{
				ok: false,
				error: compiled.message,
			} satisfies TurnResponsePayload,
			{ status: 422 },
		);
	}

	const result = await runCompiledAgentTurn(compiled, { text, select: payload.select }, env, {
		url: url.origin,
		name: 'Theorum Playground',
	});

	if (!result.ok) {
		return json({ ok: false, error: result.error } satisfies TurnResponsePayload, {
			status: result.status ?? 500,
		});
	}

	const response: TurnResponsePayload = {
		ok: true,
		stop: result.stop,
		text: result.text,
		trace: result.trace,
		agentId: result.agentId,
	};
	return json(response);
};
