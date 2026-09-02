/**
 * Server-only THEORUM imports. Keep kernel usage out of client components.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveTheorumRoot } from './theorum-root';

export {
	bindCanary,
	type CanaryGateSession,
	type CreateProviderOptions,
	createCanaryGateSession,
	createCanaryStreamGate,
	createLiveOutboundGateSession,
	createProvider,
	defineProfile,
	filterCanaryGatedEvents,
	finalizeLiveOutboundTurn,
	getProfile,
	type LiveOutboundGateSession,
	mintCanary,
	type ProfileDefinition,
	type ProviderCompleteRequest,
	PUBLIC_CANARY,
	pickModel,
	prepareLiveInboundText,
	processLiveOutboundBatch,
	registerProfile,
	registerStructured,
	runTurn,
	standardEgressEnforce,
	type TurnEvent,
	type WireFunctionTool,
} from '@theorum/core';

export { abortLiveOutboundTurn } from '@theorum/guardrails';

export {
	buildGeminiLiveRealtimeInput,
	buildGeminiLiveRealtimeText,
	buildGeminiLiveSetupMessage,
	buildGeminiLiveToolResponse,
	buildGeminiLiveWebSocketUrl,
	foldGeminiLiveServerMessage,
	parseGeminiLiveMessage,
} from '@theorum/providers/google/live';

const envHead = import.meta.env.KERNEL_SUBMODULE_HEAD as string | boolean | undefined;
const kernelSubmoduleHead = typeof envHead === 'string' && envHead.length > 0 ? envHead : null;

export function getSubmoduleHead(): string | null {
	return kernelSubmoduleHead;
}

export function getKernelPackageVersion(): string {
	const denoJson = JSON.parse(
		readFileSync(path.join(resolveTheorumRoot(), 'deno.json'), 'utf8'),
	) as { version: string };
	return denoJson.version;
}

/** Short display label for the hero, e.g. `@0.1.14`. */
export function getKernelVersionLabel(): string {
	return `@${getKernelPackageVersion()}`;
}
