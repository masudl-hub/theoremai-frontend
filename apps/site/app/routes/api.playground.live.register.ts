import { playgroundLiveRegister } from '$lib/server/api';
import type { Route } from './+types/api.playground.live.register';

export function action({ request }: Route.ActionArgs) {
	return playgroundLiveRegister(request);
}
