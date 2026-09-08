import { json } from '@sveltejs/kit';
import { assertSafeUrl, buildHttpToolTarget, parseMcpRpcResponse } from 'theorum';
import type { HttpMethod } from 'theorum/schema';
import type { RequestHandler } from './$types';

type AuthProbe = {
	slot?: string;
	type?: 'bearer' | 'api_key' | 'oauth2';
	headerName?: string;
	headerPrefix?: string;
};

type TestConnectionRequest =
	| {
			type: 'http';
			endpoint: string;
			method?: string;
			headers?: Record<string, string>;
			pathParams?: string[];
			queryParams?: string[];
			bodyParam?: string;
			sampleInput?: Record<string, unknown>;
			auth?: AuthProbe;
			testCredential?: string;
			allowPrivateNetworks?: boolean;
			allowedHosts?: string[];
	  }
	| {
			type: 'mcp';
			serverUrl: string;
			mcpToolName?: string;
			headers?: Record<string, string>;
			auth?: AuthProbe;
			testCredential?: string;
			allowPrivateNetworks?: boolean;
			allowedHosts?: string[];
	  };

interface McpRpcResponse {
	jsonrpc?: string;
	result?: {
		tools?: Array<{ name: string; description?: string }>;
		[key: string]: unknown;
	};
	error?: { code: number; message: string; data?: unknown };
}

type NetworkPolicy = {
	allowPrivateNetworks: boolean;
	allowedHosts: string[];
};

function elapsedSince(start: number): number {
	return Date.now() - start;
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

function applyAuthHeaders(
	headers: Record<string, string>,
	auth: AuthProbe | undefined,
	testCredential: string | undefined,
): void {
	if (!auth?.type || !testCredential) return;
	const headerName = auth.headerName?.trim() || 'Authorization';
	const prefix = auth.headerPrefix !== undefined ? auth.headerPrefix : 'Bearer ';
	headers[headerName] = `${prefix}${testCredential}`;
}

function ssrfBlockedResponse(start: number, err: unknown) {
	return json({
		ok: false,
		code: 'ssrf_blocked',
		error: errorMessage(err),
		elapsedMs: elapsedSince(start),
	});
}

function networkErrorResponse(start: number, err: unknown) {
	return json({
		ok: false,
		code: 'network_error',
		error: errorMessage(err),
		elapsedMs: elapsedSince(start),
	});
}

function assertUrlOrBlocked(url: string, policy: NetworkPolicy, start: number) {
	try {
		assertSafeUrl(url, policy);
		return null;
	} catch (guardErr) {
		return ssrfBlockedResponse(start, guardErr);
	}
}

async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	timeoutMs = 10000,
): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => {
		controller.abort();
	}, timeoutMs);
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timeout);
	}
}

function previewResponseBody(text: string, contentType: string): string {
	if (!contentType.includes('application/json')) return text.slice(0, 300);
	try {
		return JSON.stringify(JSON.parse(text), null, 2).slice(0, 300);
	} catch {
		return text.slice(0, 300);
	}
}

async function handleHttpProbe(
	body: Extract<TestConnectionRequest, { type: 'http' }>,
	policy: NetworkPolicy,
	start: number,
) {
	if (!body.endpoint.trim()) {
		return json({ ok: false, error: 'Endpoint URL is required' }, { status: 400 });
	}

	const blocked = assertUrlOrBlocked(body.endpoint, policy, start);
	if (blocked) return blocked;

	const headers: Record<string, string> = {
		Accept: 'application/json, text/plain, */*',
		...(body.headers ?? {}),
	};
	applyAuthHeaders(headers, body.auth, body.testCredential);

	const method = (body.method?.toUpperCase() || 'GET') as HttpMethod;
	const sampleInput = body.sampleInput ?? {};
	let requestUrl = body.endpoint;
	let requestBody: string | undefined;

	try {
		const target = buildHttpToolTarget(body.endpoint, method, sampleInput, {
			pathParams: body.pathParams,
			queryParams: body.queryParams,
			bodyParam: body.bodyParam,
		});
		requestUrl = target.url;
		requestBody = target.body;
	} catch (buildErr) {
		return json({
			ok: false,
			code: 'invalid_mapping',
			error: errorMessage(buildErr),
			elapsedMs: elapsedSince(start),
		});
	}

	const mappedBlocked = assertUrlOrBlocked(requestUrl, policy, start);
	if (mappedBlocked) return mappedBlocked;

	try {
		const res = await fetchWithTimeout(requestUrl, {
			method,
			headers,
			body: method === 'GET' ? undefined : requestBody,
		});
		const text = await res.text();
		const contentType = res.headers.get('content-type') || '';
		return json({
			ok: res.ok,
			status: res.status,
			statusText: res.statusText,
			contentType,
			preview: previewResponseBody(text, contentType),
			elapsedMs: elapsedSince(start),
		});
	} catch (fetchErr) {
		return networkErrorResponse(start, fetchErr);
	}
}

async function handleMcpProbe(
	body: Extract<TestConnectionRequest, { type: 'mcp' }>,
	policy: NetworkPolicy,
	start: number,
) {
	if (!body.serverUrl.trim()) {
		return json({ ok: false, error: 'Server URL is required' }, { status: 400 });
	}

	const blocked = assertUrlOrBlocked(body.serverUrl, policy, start);
	if (blocked) return blocked;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json, text/event-stream',
		'MCP-Protocol-Version': '2026-07-28',
		...(body.headers ?? {}),
	};
	applyAuthHeaders(headers, body.auth, body.testCredential);

	const rpcPayload = {
		jsonrpc: '2.0',
		id: 'test-ping-1',
		method: 'tools/list',
		params: {
			_meta: {
				'io.modelcontextprotocol/protocolVersion': '2026-07-28',
			},
		},
	};

	try {
		const res = await fetchWithTimeout(body.serverUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify(rpcPayload),
		});
		const elapsedMs = elapsedSince(start);
		const status = res.status;
		const text = await res.text();

		let rpcData: McpRpcResponse;
		try {
			rpcData = parseMcpRpcResponse(text);
		} catch {
			return json({
				ok: false,
				status,
				code: 'invalid_json',
				error: `MCP server returned non-JSON response: ${text.slice(0, 200)}`,
				elapsedMs,
			});
		}

		if (rpcData.error) {
			return json({
				ok: false,
				status,
				code: `mcp_error_${String(rpcData.error.code)}`,
				error: rpcData.error.message,
				elapsedMs,
			});
		}

		const tools = rpcData.result?.tools ?? [];
		const toolNames = tools.map((t) => t.name);
		const targetName = body.mcpToolName?.trim();
		return json({
			ok: res.ok,
			status,
			protocolVersion: '2026-07-28',
			toolCount: tools.length,
			tools: toolNames,
			targetToolFound: targetName ? toolNames.includes(targetName) : undefined,
			preview: JSON.stringify(rpcData.result ?? rpcData, null, 2).slice(0, 300),
			elapsedMs,
		});
	} catch (fetchErr) {
		return networkErrorResponse(start, fetchErr);
	}
}

export const POST: RequestHandler = async ({ request }) => {
	const start = Date.now();
	try {
		const rawBody: unknown = await request.json();
		if (!rawBody || typeof rawBody !== 'object' || !('type' in rawBody)) {
			return json({ ok: false, error: 'Missing type in test connection request' }, { status: 400 });
		}
		const body = rawBody as TestConnectionRequest;
		const policy: NetworkPolicy = {
			allowPrivateNetworks: Boolean(body.allowPrivateNetworks),
			allowedHosts: body.allowedHosts ?? [],
		};

		if (body.type === 'http') {
			return await handleHttpProbe(body, policy, start);
		}
		return await handleMcpProbe(body, policy, start);
	} catch (err) {
		return json({ ok: false, error: errorMessage(err) }, { status: 500 });
	}
};
