import { studioPageResult } from '../lib/.server/api';

export function action({ request }: { request: Request }) {
	return studioPageResult(request);
}
