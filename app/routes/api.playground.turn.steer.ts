import { playgroundSteer } from '../lib/.server/api';
import type { Route } from './+types/api.playground.turn.steer';

export function action({ request }: Route.ActionArgs) {
	return playgroundSteer(request);
}
