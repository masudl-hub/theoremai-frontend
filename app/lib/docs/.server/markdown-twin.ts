import { pageMarkdown } from '../machine';
import { getDocIndex } from './load-index';

/** The page at `url` as Markdown, for an agent that asked with `Accept: text/markdown`; none when the page has no twin. */
export function markdownTwin(url: URL): Response | undefined {
	const pathname = url.pathname.replace(/\.md$/, '');
	const markdown = pageMarkdown(getDocIndex(), pathname, url.origin);
	if (markdown === undefined) return undefined;
	return new Response(markdown, {
		headers: {
			'content-type': 'text/markdown; charset=utf-8',
			vary: 'Accept',
			'x-robots-tag': 'noindex',
			link: `<${pathname}>; rel="canonical"`,
		},
	});
}

/** `markdownTwin`, or a plain 404 for a route that only answers in Markdown. */
export function markdownTwinOrNotFound(url: URL): Response {
	return (
		markdownTwin(url) ??
		new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } })
	);
}
