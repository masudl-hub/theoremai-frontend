import { getDocIndex } from '../lib/docs/.server/load-index';

export function loader() {
	return Response.json(getDocIndex());
}
