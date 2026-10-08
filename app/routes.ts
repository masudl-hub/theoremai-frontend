import { index, layout, type RouteConfig, route } from '@react-router/dev/routes';

export default [
	layout('routes/shell.tsx', [
		index('routes/home.tsx'),
		route('overview', 'routes/overview.tsx'),
		route('examples', 'routes/examples.tsx'),
		route('contribute', 'routes/contribute.tsx'),
		route('playground', 'routes/playground.tsx'),
		route('playground/run', 'routes/playground.run.tsx'),
		// The playground opened on a local project. A deployed site has no project to open.
		...(process.env.NODE_ENV === 'production' ? [] : [route('studio', 'routes/studio.tsx')]),
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
	route('api/playground/turn', 'routes/api.playground.turn.ts'),
	route('api/playground/turn/steer', 'routes/api.playground.turn.steer.ts'),
	route('api/playground/invoke', 'routes/api.playground.invoke.ts'),
	route('api/playground/call', 'routes/api.playground.call.ts'),
	route('api/playground/decide', 'routes/api.playground.decide.ts'),
	route('api/playground/probe', 'routes/api.playground.probe.ts'),
	route('api/playground/test-connection', 'routes/api.playground.test-connection.ts'),
	route('api/playground/test-key', 'routes/api.playground.test-key.ts'),
] satisfies RouteConfig;
