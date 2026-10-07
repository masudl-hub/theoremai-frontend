import { getDocIndex } from '../lib/docs/.server/load-index';
import { llmsFullTxt } from '../lib/docs/machine';
import type { Route } from './+types/llms-full[.]txt';

export function loader({ request }: Route.LoaderArgs) {
	const origin = new URL(request.url).origin;
	return new Response(llmsFullTxt(getDocIndex(), origin), {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'no-cache, must-revalidate',
		},
	});
}
