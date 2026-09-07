import type { ToolCredential, ToolPause } from 'theorum/kernel';
import {
	type PlaygroundLiveToolResult,
	parsePlaygroundLiveToolResult,
} from '$lib/interface/playground-tool-result';
import type { PlaygroundRunPayload } from '$lib/interface/run-payload';
import { continuePausedToolInvocation, type ToolPauseResolution } from '$lib/interface/tool-resume';

export type LiveToolPausePrompt = {
	toolName: string;
	input: Record<string, unknown>;
	pause: ToolPause;
};

export type LiveToolInvokeOptions = {
	resume?: { value?: unknown; granted?: boolean };
	sessionPermissions?: string[];
	credentials?: Record<string, ToolCredential>;
};

export async function runPlaygroundLiveTool(
	payload: PlaygroundRunPayload,
	name: string,
	args: Record<string, unknown>,
	options: LiveToolInvokeOptions = {},
): Promise<PlaygroundLiveToolResult> {
	const response = await fetch('/api/playground/live/tool', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			profile: payload.profile,
			customTools: payload.customTools,
			name,
			input: args,
			resume: options.resume,
			sessionPermissions: options.sessionPermissions,
			credentials: options.credentials,
		}),
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as { error?: string };
		throw new Error(body.error ?? `Live tool failed (${String(response.status)})`);
	}

	return parsePlaygroundLiveToolResult(await response.json());
}

export async function invokePlaygroundLiveTool(args: {
	payload: PlaygroundRunPayload;
	name: string;
	input: Record<string, unknown>;
	sessionPermissions: string[];
	onPause: (prompt: LiveToolPausePrompt) => Promise<ToolPauseResolution>;
}): Promise<{ output: Record<string, unknown>; sessionPermissions: string[] }> {
	let sessionPermissions = [...args.sessionPermissions];
	let credentials: Record<string, ToolCredential> | undefined;
	let resume: LiveToolInvokeOptions['resume'];

	for (;;) {
		const result = await runPlaygroundLiveTool(args.payload, args.name, args.input, {
			resume,
			sessionPermissions,
			credentials,
		});

		if (result.status === 'complete') {
			return { output: result.output, sessionPermissions };
		}

		const resolution = await args.onPause({
			toolName: args.name,
			input: args.input,
			pause: result.pause,
		});

		const next = continuePausedToolInvocation({
			toolName: args.name,
			pause: result.pause,
			sessionPermissions,
			resolution,
		});

		if (next.kind === 'denied') {
			return {
				output: { error: `User denied execution of '${args.name}'.` },
				sessionPermissions,
			};
		}

		if (next.kind === 'auth') {
			credentials = { ...credentials, ...next.credentials };
			resume = undefined;
			continue;
		}

		sessionPermissions = next.sessionPermissions;
		resume = next.resume;
	}
}
