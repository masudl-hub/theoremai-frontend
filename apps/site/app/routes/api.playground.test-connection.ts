import { testConnection } from '$lib/server/test-connection';
import type { Route } from './+types/api.playground.test-connection';

export function action({ request }: Route.ActionArgs) {
	return testConnection(request);
}
