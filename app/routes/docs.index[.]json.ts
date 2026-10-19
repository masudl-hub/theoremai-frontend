import { getDocIndex } from '../lib/docs/.server/load-index';

/** Every chapter once: the browser builds `bySlug` from `articles`, so it is not sent twice. */
export function loader() {
	const { bySlug: _bySlug, ...index } = getDocIndex();
	return Response.json(index, {
		headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400' },
	});
}
