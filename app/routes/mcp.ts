import { docsMcpHandler } from '../lib/.server/docs-mcp';
import type { Route } from './+types/mcp';

function serve({ request }: Route.ActionArgs | Route.LoaderArgs) {
	return docsMcpHandler()(request);
}

export const action = serve;
/** GET gets the handler's own answer: 405, since the server streams nothing. */
export const loader = serve;
