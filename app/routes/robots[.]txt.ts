import { robotsTxt } from '../lib/docs/machine';
import type { Route } from './+types/robots[.]txt';

export function loader({ request }: Route.LoaderArgs) {
	return new Response(robotsTxt(new URL(request.url).origin), {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'no-cache, must-revalidate',
		},
	});
}
