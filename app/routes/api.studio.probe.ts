import { cloudflareContext } from '../cloudflare';
import { d1ProbeLog, studioProbe } from '../lib/.server/guardrail-probe';
import { getKernelPackageVersion } from '../lib/.server/theoremai';
import type { Route } from './+types/api.studio.probe';

export function action({ request, context }: Route.ActionArgs) {
	const { env, ctx } = context.get(cloudflareContext);
	const log = env.PROBE_LOG && d1ProbeLog(env.PROBE_LOG, getKernelPackageVersion());
	return studioProbe(request, log, (work) => {
		ctx.waitUntil(work);
	});
}
