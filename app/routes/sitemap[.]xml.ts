import { getDocIndex } from '../lib/docs/.server/load-index';
import { sitemapXml } from '../lib/docs/machine';
import type { Route } from './+types/sitemap[.]xml';

export function loader({ request }: Route.LoaderArgs) {
	const origin = new URL(request.url).origin;
	return new Response(sitemapXml(getDocIndex(), origin), {
		headers: { 'content-type': 'application/xml; charset=utf-8' },
	});
}
