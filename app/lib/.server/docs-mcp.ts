/**
 * The docs as an MCP server: `/mcp` serves a host profile with two tools, read and a keyword
 * search over the same index the pages render. The server card says where it is and what it is.
 */
import { defineProfile, registerTool } from '@theoremjs/agents';
import { createTheoremMcpHandler } from '@theoremjs/react/server';
import { z } from 'zod';
import { th30ReadTool, th30SearchDocsServerTool } from './th30';
import { getKernelPackageVersion } from './theoremai';

const DOCS_MCP_ID = 'theorem-docs';
const DOCS_MCP_NAME = 'com.masudlewis.theorem/docs';
const DOCS_MCP_REPOSITORY = 'https://github.com/masudl-hub/theoremai';

/** Th30's read, under a name of its own beside th30's. */
const readDocsTool = {
	...th30ReadTool,
	name: 'read_docs',
	description:
		'Read a chapter of the Theorem docs as line-numbered Markdown: a slug, slug#blockId for one section, or full_page for every chapter.',
};

/** The server's keyword search: a client has no page to rank by meaning. */
const searchDocsTool = {
	...th30SearchDocsServerTool,
	name: 'search_docs',
	description:
		'Search the Theorem docs by words: chapter titles, sections, fields and code examples. Places that match every word come first. Each hit carries the slug and blockId to pass to read_docs.',
	input: z.object({
		query: z
			.string()
			.describe('Words to find, or a field or section name; typos and partial words still match'),
		limit: z.number().int().positive().max(10).optional(),
	}),
};

const DOCS_MCP_INSTRUCTIONS =
	'The Theorem docs. Search them with search_docs, then read the hit with read_docs before you answer, and cite the source each result carries.';

let handler: ((request: Request) => Promise<Response>) | undefined;

/** The `/mcp` handler, built once per isolate. */
export function docsMcpHandler(): (request: Request) => Promise<Response> {
	if (handler) return handler;
	registerTool(readDocsTool);
	registerTool(searchDocsTool);
	handler = createTheoremMcpHandler({
		profile: defineProfile({
			type: 'host',
			id: DOCS_MCP_ID,
			tools: { allow: [searchDocsTool.name, readDocsTool.name] },
		}),
		name: DOCS_MCP_NAME,
		version: getKernelPackageVersion(),
		instructions: DOCS_MCP_INSTRUCTIONS,
	});
	return handler;
}

/** The server card (SEP-2127): who the server is and where it answers. */
export function docsMcpServerCard(origin: string) {
	return {
		$schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
		name: DOCS_MCP_NAME,
		title: 'Theorem docs',
		version: getKernelPackageVersion(),
		description: 'Search and read the Theorem docs: chapters, sections, fields and code examples.',
		websiteUrl: `${origin}/docs`,
		repository: { url: DOCS_MCP_REPOSITORY, source: 'github' },
		remotes: [{ type: 'streamable-http', url: `${origin}/mcp` }],
	};
}

/** The AI catalog: the site's one entry, the docs server's card. */
export function aiCatalog(origin: string) {
	return {
		specVersion: '1.0',
		entries: [
			{
				identifier: `urn:air:${DOCS_MCP_NAME}`,
				type: 'application/mcp-server-card+json',
				url: `${origin}/mcp/server-card`,
			},
		],
	};
}

/** A card or catalog any page may fetch. */
export function discoveryResponse(body: unknown, contentType: string): Response {
	return new Response(JSON.stringify(body), {
		headers: {
			'content-type': contentType,
			'access-control-allow-origin': '*',
			'cache-control': 'public, max-age=3600',
		},
	});
}
