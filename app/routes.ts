import { index, layout, type RouteConfig, route } from '@react-router/dev/routes';

export default [
	layout('routes/shell.tsx', [
		index('routes/home.tsx'),
		route('overview', 'routes/overview.tsx'),
		route('examples', 'routes/examples.tsx'),
		route('contribute', 'routes/contribute.tsx'),
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
	route('api/kernel', 'routes/api.kernel.ts'),
	route('api/studio/turn', 'routes/api.studio.turn.ts'),
	route('api/studio/turn/steer', 'routes/api.studio.turn.steer.ts'),
	route('api/studio/invoke', 'routes/api.studio.invoke.ts'),
	route('api/studio/call', 'routes/api.studio.call.ts'),
	route('api/studio/decide', 'routes/api.studio.decide.ts'),
	route('api/studio/probe', 'routes/api.studio.probe.ts'),
	route('api/studio/test-connection', 'routes/api.studio.test-connection.ts'),
	route('api/studio/test-key', 'routes/api.studio.test-key.ts'),
] satisfies RouteConfig;
