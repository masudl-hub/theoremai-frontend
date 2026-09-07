import type { PlaygroundRunPayload } from '$lib/interface/run-payload';

export async function registerPlaygroundLiveProfile(
	payload: PlaygroundRunPayload,
): Promise<string> {
	const response = await fetch('/api/playground/live/register', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			profile: payload.profile,
			customTools: payload.customTools,
		}),
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as { error?: string };
		throw new Error(body.error ?? `Live register failed (${String(response.status)})`);
	}

	const data = (await response.json()) as { profileId: string };
	return data.profileId;
}
