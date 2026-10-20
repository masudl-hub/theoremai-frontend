/**
 * The site's actions for an AI agent in the visitor's browser (WebMCP): search the docs, read a
 * page as Markdown, open a page. Where the browser has no model context, nothing is registered.
 */

type SiteTool = {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	execute: (input: Record<string, unknown>) => Promise<unknown>;
};

type ModelContext = {
	registerTool: (tool: SiteTool, options?: { signal?: AbortSignal }) => unknown;
};

function modelContext(): ModelContext | undefined {
	const scope = [document, navigator] as unknown as { modelContext?: ModelContext }[];
	return scope.find((host) => typeof host.modelContext?.registerTool === 'function')?.modelContext;
}

/** The page at `path` as Markdown, the same text the site serves to `Accept: text/markdown`. */
async function pageText(path: string): Promise<string> {
	const response = await fetch(path, { headers: { accept: 'text/markdown' } });
	const type = response.headers.get('content-type') ?? '';
	if (!response.ok || !type.startsWith('text/markdown')) {
		throw new Error(`${path} has no Markdown: try /, /studio, /docs or /docs/<chapter>`);
	}
	return response.text();
}

function sitePath(value: unknown): string {
	if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
		throw new Error('path must be a path on this site, starting with /');
	}
	return value;
}

/** Registers the site's tools until `signal` aborts. `open` moves the page without a reload. */
export function registerSiteTools(open: (path: string) => void, signal: AbortSignal): void {
	const context = modelContext();
	if (!context) return;
	const tools: SiteTool[] = [
		{
			name: 'search_docs',
			description:
				'Search the Theorem docs by keywords. Returns the best matching chapters, sections and glossary entries, each with a link.',
			inputSchema: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description: 'What to look for, e.g. "guardrails on tool calls".',
					},
					limit: {
						type: 'integer',
						minimum: 1,
						maximum: 20,
						description: 'How many results. Default 5.',
					},
				},
				required: ['query'],
			},
			async execute({ query, limit }) {
				const [{ clientDocIndex }, { searchDocs }] = await Promise.all([
					import('./docs/client-index'),
					import('./docs/query'),
				]);
				const count = typeof limit === 'number' ? Math.min(Math.max(Math.trunc(limit), 1), 20) : 5;
				return searchDocs(await clientDocIndex(), typeof query === 'string' ? query : '', count);
			},
		},
		{
			name: 'read_page',
			description:
				'Read a page of this site as Markdown: "/" (what Theorem is), "/studio", "/docs" (every chapter, linked) or "/docs/<chapter>".',
			inputSchema: {
				type: 'object',
				properties: {
					path: { type: 'string', description: 'The page path, e.g. "/docs/guardrails".' },
				},
				required: ['path'],
			},
			execute: ({ path }) => pageText(sitePath(path)),
		},
		{
			name: 'open_page',
			description:
				'Show the visitor a page of this site, e.g. "/docs/tools#http-tools" or "/studio".',
			inputSchema: {
				type: 'object',
				properties: {
					path: { type: 'string', description: 'The page path, with an optional #section.' },
				},
				required: ['path'],
			},
			execute({ path }) {
				const to = sitePath(path);
				open(to);
				return Promise.resolve(`Opened ${to}`);
			},
		},
	];
	for (const tool of tools) context.registerTool(tool, { signal });
}
