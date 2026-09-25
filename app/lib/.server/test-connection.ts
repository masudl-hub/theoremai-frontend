/**
 * Test-connection probe for playground tool drafts — plain `Request` in, `Response` out.
 */
import {
	buildHttpToolTarget,
	fetchGuarded,
	isUnsupportedMcpProtocolError,
	MCP_PROTOCOL_VERSIONS,
	parseMcpRpcResponse,
	TheoremError,
} from '@theoremai/agents';
import type { HttpMethod } from '@theoremai/agents/schema';
import { errorMessage } from './ndjson-stream';
import { resolveHost } from './resolve-host';

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
	// The kernel's defaults: an API key goes in bare, a bearer or OAuth token after `Bearer `.
	const prefix = auth.headerPrefix ?? (auth.type === 'api_key' ? '' : 'Bearer ');
	headers[headerName] = `${prefix}${testCredential}`;
}

function isRedirect(res: Response): boolean {
	return res.status >= 300 && res.status < 400;
}

function redirectResponse(res: Response, start: number) {
	const location = res.headers.get('location');
	return Response.json({
		ok: false,
		status: res.status,
		code: 'redirect',
		error: location ? `Redirects to ${location}, which the test doesn't follow.` : 'Redirects.',
		elapsedMs: elapsedSince(start),
	});
}

/** A probe that never got an answer: refused by the network guard, or failed on the way. */
function fetchErrorResponse(start: number, err: unknown) {
	const blocked = err instanceof TheoremError && err.kind === 'blocked';
	return Response.json({
		ok: false,
		code: blocked ? 'ssrf_blocked' : 'network_error',
		error: errorMessage(err),
		elapsedMs: elapsedSince(start),
	});
}

/** How long a probe waits for the whole response, body included. */
const TIMEOUT_MS = 10_000;

/** How much of a response body a probe reads; enough for a large MCP tool list. */
const MAX_BODY_BYTES = 1_000_000;

/** Reads the body as text, stopping at `MAX_BODY_BYTES`. */
async function readCapped(res: Response): Promise<string> {
	if (!res.body) return '';
	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let text = '';
	let bytes = 0;
	try {
		while (bytes < MAX_BODY_BYTES) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			text += decoder.decode(value, { stream: true });
		}
	} finally {
		await reader.cancel();
	}
	return text + decoder.decode();
}

/**
 * Fetches `url` through the kernel's network guard and reads its body within `TIMEOUT_MS`.
 * Redirects are never followed: the credential and headers are for `url`'s origin alone. A
 * redirect comes back as the response.
 */
async function fetchWithTimeout(
	url: string,
	init: { method: string; headers: Record<string, string>; body?: string },
	policy: NetworkPolicy,
): Promise<{ res: Response; text: string }> {
	const controller = new AbortController();
	const timeout = setTimeout(() => {
		controller.abort();
	}, TIMEOUT_MS);
	try {
		const res = await fetchGuarded(
			url,
			{ ...init, signal: controller.signal },
			{ policy, followRedirects: false, resolveHost },
		);
		return { res, text: await readCapped(res) };
	} catch (err) {
		if (controller.signal.aborted) {
			throw new Error(`No complete response within ${String(TIMEOUT_MS / 1000)} s.`);
		}
		throw err;
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
	if (typeof body.endpoint !== 'string' || !body.endpoint.trim()) {
		return Response.json({ ok: false, error: 'Endpoint URL is required' }, { status: 400 });
	}

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

	try {
		const { res, text } = await fetchWithTimeout(
			requestUrl,
			{ method, headers, ...(method === 'GET' ? {} : { body: requestBody }) },
			policy,
		);
		if (isRedirect(res)) return redirectResponse(res, start);
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
		return fetchErrorResponse(start, fetchErr);
	}
}

async function handleMcpProbe(
	body: Extract<TestConnectionRequest, { type: 'mcp' }>,
	policy: NetworkPolicy,
	start: number,
) {
	if (typeof body.serverUrl !== 'string' || !body.serverUrl.trim()) {
		return Response.json({ ok: false, error: 'Server URL is required' }, { status: 400 });
	}

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

			const { res, text } = await fetchWithTimeout(
				body.serverUrl,
				{ method: 'POST', headers, body: JSON.stringify(rpcPayload) },
				policy,
			);
			if (isRedirect(res)) return redirectResponse(res, start);
			lastStatus = res.status;

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

			if (rpcData.jsonrpc !== '2.0' || !Array.isArray(rpcData.result?.tools)) {
				return Response.json({
					ok: false,
					status: lastStatus,
					code: 'not_mcp',
					error: "Answered, but not as an MCP server: tools/list didn't return a tool list.",
					elapsedMs: elapsedSince(start),
				});
			}
			const tools = rpcData.result.tools;
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
		return fetchErrorResponse(start, fetchErr);
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
		const { type } = rawBody;
		if (type !== 'http' && type !== 'mcp') {
			return Response.json({ ok: false, error: 'Type must be http or mcp' }, { status: 400 });
		}
		const body = rawBody as TestConnectionRequest;
		const policy: NetworkPolicy = {
			allowPrivateNetworks: Boolean(body.allowPrivateNetworks),
			allowedHosts: body.allowedHosts ?? [],
		};

		if (body.type === 'http') return await handleHttpProbe(body, policy, start);
		return await handleMcpProbe(body, policy, start);
	} catch (err) {
		return Response.json({ ok: false, error: errorMessage(err) }, { status: 500 });
	}
}
