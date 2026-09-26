import { getDocIndex } from '../lib/docs/.server/load-index';
import { articleMarkdown } from '../lib/docs/machine';
import type { Route } from './+types/docs.$slug[.]md';

export function loader({ params }: Route.LoaderArgs) {
	const markdown = articleMarkdown(getDocIndex(), params.slug);
	if (!markdown) {
		return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
	}
	return new Response(markdown, {
		headers: {
			'content-type': 'text/markdown; charset=utf-8',
			'x-robots-tag': 'noindex',
			link: `</docs/${params.slug}>; rel="canonical"`,
		},
	});
}
