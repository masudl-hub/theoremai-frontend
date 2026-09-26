import { index, layout, type RouteConfig, route } from '@react-router/dev/routes';

export default [
	layout('routes/shell.tsx', [
		index('routes/home.tsx'),
		route('playground', 'routes/playground.tsx'),
		route('docs', 'routes/docs.tsx'),
		route('docs/:slug', 'routes/docs.$slug.tsx'),
	]),
	route('docs/:slug.md', 'routes/docs.$slug[.]md.ts'),
	route('docs/index.json', 'routes/docs.index[.]json.ts'),
	route('llms.txt', 'routes/llms[.]txt.ts'),
	route('sitemap.xml', 'routes/sitemap[.]xml.ts'),
	route('playground/run', 'routes/playground.run.tsx'),
	route('api/kernel', 'routes/api.kernel.ts'),
	route('api/playground/turn', 'routes/api.playground.turn.ts'),
	route('api/playground/turn/steer', 'routes/api.playground.turn.steer.ts'),
	route('api/playground/invoke', 'routes/api.playground.invoke.ts'),
	route('api/playground/test-connection', 'routes/api.playground.test-connection.ts'),
] satisfies RouteConfig;
