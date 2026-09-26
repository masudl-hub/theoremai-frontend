import { getDocIndex } from '../lib/docs/.server/load-index';
import { llmsTxt } from '../lib/docs/machine';

export function loader() {
	return new Response(llmsTxt(getDocIndex()), {
		headers: { 'content-type': 'text/plain; charset=utf-8' },
	});
}
