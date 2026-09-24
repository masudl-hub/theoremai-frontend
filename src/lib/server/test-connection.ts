/**
 * Test-connection probe for playground tool drafts — plain `Request` in, `Response` out.
 */
import {
	assertSafeUrl,
	buildHttpToolTarget,
	isUnsupportedMcpProtocolError,
	MCP_PROTOCOL_VERSIONS,
	parseMcpRpcResponse,
} from '@theoremai/agents';
import type { HttpMethod } from '@theoremai/agents/schema';
import { errorMessage } from './ndjson-stream';

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
	return Response.json({
		ok: false,
		code: 'ssrf_blocked',
		error: errorMessage(err),
		elapsedMs: elapsedSince(start),
	});
}

function networkErrorResponse(start: number, err: unknown) {
	return Response.json({
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
		return Response.json({ ok: false, error: 'Endpoint URL is required' }, { status: 400 });
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
		return Response.json({
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
		return Response.json({
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
		return Response.json({ ok: false, error: 'Server URL is required' }, { status: 400 });
	}

	const blocked = assertUrlOrBlocked(body.serverUrl, policy, start);
	if (blocked) return blocked;

	const baseHeaders: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json, text/event-stream',
		...(body.headers ?? {}),
	};
	applyAuthHeaders(baseHeaders, body.auth, body.testCredential);

	try {
		let lastStatus = 0;
		let lastProtocolError: McpRpcResponse['error'];

		for (const protocolVersion of MCP_PROTOCOL_VERSIONS) {
			const headers = {
				...baseHeaders,
				'MCP-Protocol-Version': protocolVersion,
			};
			const rpcPayload = {
				jsonrpc: '2.0',
				id: 'test-ping-1',
				method: 'tools/list',
				params: {
					_meta: {
						'io.modelcontextprotocol/protocolVersion': protocolVersion,
					},
				},
			};

			const res = await fetchWithTimeout(body.serverUrl, {
				method: 'POST',
				headers,
				body: JSON.stringify(rpcPayload),
			});
			lastStatus = res.status;
			const text = await res.text();

			let rpcData: McpRpcResponse;
			try {
				rpcData = parseMcpRpcResponse(text);
			} catch {
				if (
					!res.ok &&
					text.toLowerCase().includes('unsupported protocol version') &&
					protocolVersion !== MCP_PROTOCOL_VERSIONS.at(-1)
				) {
					lastProtocolError = { code: -32600, message: text.slice(0, 300) };
					continue;
				}
				return Response.json({
					ok: false,
					status: lastStatus,
					code: 'invalid_json',
					error: `MCP server returned non-JSON response: ${text.slice(0, 200)}`,
					elapsedMs: elapsedSince(start),
				});
			}

			if (rpcData.error && isUnsupportedMcpProtocolError(rpcData.error)) {
				lastProtocolError = rpcData.error;
				continue;
			}

			if (rpcData.error) {
				return Response.json({
					ok: false,
					status: lastStatus,
					code: `mcp_error_${String(rpcData.error.code)}`,
					error: rpcData.error.message,
					elapsedMs: elapsedSince(start),
				});
			}

			const tools = rpcData.result?.tools ?? [];
			const toolNames = tools.map((t) => t.name);
			const targetName = body.mcpToolName?.trim();
			return Response.json({
				ok: res.ok,
				status: lastStatus,
				protocolVersion,
				toolCount: tools.length,
				tools: toolNames,
				targetToolFound: targetName ? toolNames.includes(targetName) : undefined,
				preview: JSON.stringify(rpcData.result ?? rpcData, null, 2).slice(0, 300),
				elapsedMs: elapsedSince(start),
			});
		}

		return Response.json({
			ok: false,
			status: lastStatus || 400,
			code: lastProtocolError
				? `mcp_error_${String(lastProtocolError.code)}`
				: 'mcp_protocol_error',
			error: lastProtocolError?.message ?? 'MCP protocol negotiation failed',
			elapsedMs: elapsedSince(start),
		});
	} catch (fetchErr) {
		return networkErrorResponse(start, fetchErr);
	}
}

/** POST /api/playground/test-connection — probe a draft HTTP or MCP tool endpoint. */
export async function testConnection(request: Request): Promise<Response> {
	const start = Date.now();
	try {
		const rawBody: unknown = await request.json();
		if (!rawBody || typeof rawBody !== 'object' || !('type' in rawBody)) {
			return Response.json(
				{ ok: false, error: 'Missing type in test connection request' },
				{ status: 400 },
			);
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
		return Response.json({ ok: false, error: errorMessage(err) }, { status: 500 });
	}
}
