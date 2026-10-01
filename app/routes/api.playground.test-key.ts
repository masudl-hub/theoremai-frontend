import { testKey } from '../lib/.server/test-key';
import type { Route } from './+types/api.playground.test-key';

export function action({ request }: Route.ActionArgs) {
	return testKey(request);
}
