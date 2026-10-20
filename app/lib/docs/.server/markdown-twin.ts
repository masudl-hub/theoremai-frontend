import { pageMarkdown } from '../machine';
import { getDocIndex } from './load-index';

/** The page at `url` as Markdown, for an agent that asked with `Accept: text/markdown`; none when the page has no twin. */
export function markdownTwin(url: URL): Response | undefined {
	const markdown = pageMarkdown(getDocIndex(), url.pathname, url.origin);
	if (markdown === undefined) return undefined;
	return new Response(markdown, {
		headers: { 'content-type': 'text/markdown; charset=utf-8', vary: 'Accept' },
	});
}
