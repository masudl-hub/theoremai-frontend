import { discoveryResponse, docsMcpServerCard } from '../lib/.server/docs-mcp';

/** At the endpoint, as the server card spec places it, and at the well-known path scanners read. */
export function loader({ request }: { request: Request }) {
	return discoveryResponse(
		docsMcpServerCard(new URL(request.url).origin),
		'application/mcp-server-card+json',
	);
}
