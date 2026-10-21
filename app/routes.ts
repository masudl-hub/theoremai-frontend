import { index, layout, type RouteConfig, route } from '@react-router/dev/routes';

export default [
	layout('routes/shell.tsx', [
		index('routes/home.tsx'),
		route('overview', 'routes/overview.tsx'),
		route('examples', 'routes/examples.tsx'),
		route('contribute', 'routes/contribute.tsx'),
		route('start', 'routes/start.tsx'),
		route('studio', 'routes/studio.tsx'),
		route('studio/run', 'routes/studio.run.tsx'),
		// The studio opened on a local project. A deployed site has no project to open.
		...(process.env.NODE_ENV === 'production'
			? []
			: [route('studio/project', 'routes/studio.project.tsx')]),
		route('docs', 'routes/docs.tsx'),
		route('docs/:slug', 'routes/docs.$slug.tsx'),
	]),
	route('docs/:slug.md', 'routes/docs.$slug[.]md.ts'),
	route('docs/index.json', 'routes/docs.index[.]json.ts'),
	route('llms.txt', 'routes/llms[.]txt.ts'),
	route('llms-full.txt', 'routes/llms-full[.]txt.ts'),
	route('robots.txt', 'routes/robots[.]txt.ts'),
	route('sitemap.xml', 'routes/sitemap[.]xml.ts'),
	// The docs as an MCP server, its card, and the catalog that lists it (`docs-mcp.ts`).
	route('mcp', 'routes/mcp.ts'),
	route('mcp/server-card', 'routes/mcp.server-card.ts', { id: 'mcp-server-card' }),
	route('.well-known/mcp/server-card.json', 'routes/mcp.server-card.ts', {
		id: 'well-known-mcp-server-card',
	}),
	route('.well-known/ai-catalog.json', 'routes/ai-catalog[.]json.ts'),
	route('api/kernel', 'routes/api.kernel.ts'),
	route('api/home/start', 'routes/api.home.start.ts'),
	// Every request the studio screen makes: the package's handler (`studio-server.ts`).
	route('api/studio/*', 'routes/api.studio.$.ts'),
] satisfies RouteConfig;
