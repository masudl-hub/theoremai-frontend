/**
 * Site API handlers: plain `Request` in, `Response` out. Route files only resolve the Cloudflare env
 * and delegate here. The studio's own routes are the package's handler (`studio-server.ts`).
 */
import type { SiteEnv } from '../../cloudflare';
import { HOME_EXCHANGE } from '../home-agent-chat';
import { studioServer } from './studio-server';
import { getKernelPackageVersion, getSubmoduleHead } from './theoremai';

/** GET /api/kernel — package version and kernel checkout head. */
export function kernelInfo(): Response {
	return Response.json({
		version: getKernelPackageVersion(),
		submoduleHead: getSubmoduleHead(),
	});
}

/** POST /api/home/start — the goals screen's opening exchange, as a conversation of this session's. */
export function homeStart(request: Request, env: SiteEnv): Promise<Response> {
	return studioServer(env).startConversation(request, HOME_EXCHANGE);
}
