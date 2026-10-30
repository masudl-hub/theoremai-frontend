import { markdownTwinOrNotFound } from '../lib/docs/.server/markdown-twin';
import type { Route } from './+types/docs.$slug[.]md';

export function loader({ request }: Route.LoaderArgs) {
	return markdownTwinOrNotFound(new URL(request.url));
}
