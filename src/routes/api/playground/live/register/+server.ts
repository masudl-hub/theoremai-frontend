import { json } from '@sveltejs/kit';
import { badRequestJson } from '$lib/server/ndjson-stream';
import { registerPlaygroundProfile } from '$lib/server/playground-register';
import type { RequestHandler } from './$types';

type RegisterBody = {
	profile: import('@theoremai/agents').ProfileDefinition;
	customTools?: import('$lib/playground/types').ToolRegistration[];
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as RegisterBody;
		if (body.profile.type !== 'live') {
			return json({ error: 'Profile is not type live' }, { status: 400 });
		}
		const profile = registerPlaygroundProfile(body.profile, body.customTools ?? []);
		return json({ profileId: profile.id });
	} catch (err) {
		return badRequestJson(err);
	}
};
