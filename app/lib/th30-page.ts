import type { Th30StudioState } from './th30-studio-state';

export type Th30Page = {
	title: string;
	summary: string;
	/** What the visitor has scrolled to or selected on the page, if it says. */
	viewing?: string;
};

/** Route `handle` for a page whose state the DOM can't say. Other pages are read from their `PageSummary` scripts. */
export type Th30PageHandle = {
	th30Page?: (data: never, hash: string) => Th30Page;
};

/** The named part of the page a hash points at: its label, or its heading. */
function viewingFor(hash: string): string | undefined {
	const id = decodeURIComponent(hash.replace(/^#/, ''));
	const node = id ? document.getElementById(id) : null;
	if (!node) return undefined;
	const text =
		node.getAttribute('aria-label') ??
		(node.matches('h1,h2,h3,h4') ? node : node.querySelector('h1,h2,h3,h4'))?.textContent.trim();
	return text || undefined;
}

const PAGE_TYPES = new Set(['WebPage', 'CollectionPage', 'TechArticle']);

type JsonLdNode = { '@type'?: string; name?: string; description?: string };

/** What the page in front of the visitor says, from the structured data it rendered. */
export function readPageFromDom(hash: string): Th30Page | null {
	const parts: string[] = [];
	for (const script of document.querySelectorAll('script[data-page-summary]')) {
		let json: { '@graph'?: JsonLdNode[] } & JsonLdNode;
		try {
			json = JSON.parse(script.textContent) as typeof json;
		} catch {
			continue;
		}
		const nodes = json['@graph'] ?? [json];
		const page = nodes.find((node) => node['@type'] && PAGE_TYPES.has(node['@type']));
		if (page?.description) parts.push(page.description);
		for (const node of nodes) {
			if (node['@type'] === 'WebPageElement' && node.name && node.description) {
				parts.push(`${node.name}: ${node.description}`);
			}
		}
	}
	if (parts.length === 0) return null;
	return { title: document.title, summary: parts.join(' '), viewing: viewingFor(hash) };
}

/** The one line th30 reads to know the page: `(page) /path — Title: summary [state]`. */
export function th30PageLine(
	pathname: string,
	page: Th30Page,
	studio: Th30StudioState | null,
): string {
	const state: string[] = [];
	if (page.viewing) state.push(`viewing: ${page.viewing}`);
	if (studio) {
		state.push(
			`agent: ${studio.agent}`,
			`type: ${studio.type}`,
			studio.issues === 0
				? 'no issues'
				: `${String(studio.issues)} ${studio.issues === 1 ? 'issue' : 'issues'}`,
		);
		if (studio.section) state.push(`section: ${studio.section}`);
	}
	const tail = state.length ? ` [${state.join(', ')}]` : '';
	return `(page) ${pathname} — ${page.title}: ${page.summary}${tail}`;
}
