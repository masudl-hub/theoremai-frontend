import { getDocIndex } from '../lib/docs/.server/load-index';
import { llmsTxt } from '../lib/docs/machine';
import type { Route } from './+types/llms[.]txt';

export function loader({ request }: Route.LoaderArgs) {
	const origin = new URL(request.url).origin;
	return new Response(llmsTxt(getDocIndex(), origin), {
		headers: { 'content-type': 'text/plain; charset=utf-8' },
	});
}
