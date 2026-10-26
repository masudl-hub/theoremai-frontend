/**
 * Site API handlers: plain `Request` in, `Response` out. Route files only resolve the Cloudflare env
 * and delegate here. The studio's own routes are the package's handler (`studio-server.ts`).
 */
import { cookbookOpening } from '@theoremjs/studio';
import type { SiteEnv } from '../../cloudflare';
import { INTERFACE_EXCHANGE } from '../home-agent-chat';
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
 * the goals screen's research cookbook recording, or with `?exchange=interface` the packages
 * screen's written exchange.
 */
export function homeStart(request: Request, env: SiteEnv): Promise<Response> {
	const isInterface = new URL(request.url).searchParams.get('exchange') === 'interface';
	const blocks = isInterface ? INTERFACE_EXCHANGE : cookbookOpening('research');
	if (!blocks) {
		return Promise.resolve(
			Response.json({ error: 'The research cookbook has no recorded exchange.' }, { status: 500 }),
		);
	}
	return studioServer(env).startConversation(request, blocks);
}
