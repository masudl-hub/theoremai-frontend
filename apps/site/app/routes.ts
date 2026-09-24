import { type RouteConfig, route } from '@react-router/dev/routes';

export default [
	route('api/kernel', 'routes/api.kernel.ts'),
	route('api/playground/turn', 'routes/api.playground.turn.ts'),
	route('api/playground/turn/steer', 'routes/api.playground.turn.steer.ts'),
	route('api/playground/invoke', 'routes/api.playground.invoke.ts'),
	route('api/playground/live/register', 'routes/api.playground.live.register.ts'),
	route('api/playground/test-connection', 'routes/api.playground.test-connection.ts'),
] satisfies RouteConfig;
