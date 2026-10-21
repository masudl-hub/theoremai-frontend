/**
 * Site API handlers: plain `Request` in, `Response` out. Route files only resolve the Cloudflare env
 * and delegate here. The studio's own routes are the package's handler (`studio-server.ts`).
 */
import type { SiteEnv } from '../../cloudflare';
import { HOME_EXCHANGE, INTERFACE_EXCHANGE } from '../home-agent-chat';
import { studioServer } from './studio-server';
import { getKernelPackageVersion, getSubmoduleHead } from './theoremai';

/** GET /api/kernel — package version and kernel checkout head. */
export function kernelInfo(): Response {
	return Response.json({
		version: getKernelPackageVersion(),
		submoduleHead: getSubmoduleHead(),
	});
}

/**
 * POST /api/home/start — a landing chat's opening exchange, as a conversation of this session's:
 * the goals screen's, or with `?exchange=interface` the packages screen's.
 */
export function homeStart(request: Request, env: SiteEnv): Promise<Response> {
	const isInterface = new URL(request.url).searchParams.get('exchange') === 'interface';
	return studioServer(env).startConversation(
		request,
		isInterface ? INTERFACE_EXCHANGE : HOME_EXCHANGE,
	);
}
