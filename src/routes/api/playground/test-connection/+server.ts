import { json } from '@sveltejs/kit';
import { assertSafeUrl, buildHttpToolTarget, parseMcpRpcResponse } from 'theorum';
import type { HttpMethod } from 'theorum/schema';
import type { RequestHandler } from './$types';

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
			auth?: {
				slot?: string;
				type?: 'bearer' | 'api_key' | 'oauth2';
				headerName?: string;
				headerPrefix?: string;
			};
			testCredential?: string;
			allowPrivateNetworks?: boolean;
			allowedHosts?: string[];
	  }
	| {
			type: 'mcp';
			serverUrl: string;
			mcpToolName?: string;
			headers?: Record<string, string>;
			auth?: {
				slot?: string;
				type?: 'bearer' | 'api_key' | 'oauth2';
				headerName?: string;
				headerPrefix?: string;
			};
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

export const POST: RequestHandler = async ({ request }) => {
	const start = Date.now();
	try {
		const rawBody: unknown = await request.json();
		if (!rawBody || typeof rawBody !== 'object' || !('type' in rawBody)) {
			return json({ ok: false, error: 'Missing type in test connection request' }, { status: 400 });
		}
		const body = rawBody as TestConnectionRequest;

		const allowPrivateNetworks = Boolean(body.allowPrivateNetworks);
		const allowedHosts = body.allowedHosts ?? [];

		if (body.type === 'http') {
			if (!body.endpoint.trim()) {
				return json({ ok: false, error: 'Endpoint URL is required' }, { status: 400 });
			}

			// 1. Enforce SSRF guardrail checks
			try {
				assertSafeUrl(body.endpoint, {
					allowPrivateNetworks,
					allowedHosts,
				});
			} catch (guardErr) {
				const message = guardErr instanceof Error ? guardErr.message : String(guardErr);
				return json({
					ok: false,
					code: 'ssrf_blocked',
					error: message,
					elapsedMs: Date.now() - start,
				});
			}

			// Format headers
			const headers: Record<string, string> = {
				Accept: 'application/json, text/plain, */*',
				...(body.headers ?? {}),
			};

			if (body.auth?.type && body.testCredential) {
				const headerName = body.auth.headerName?.trim() || 'Authorization';
				const prefix = body.auth.headerPrefix !== undefined ? body.auth.headerPrefix : 'Bearer ';
				headers[headerName] = `${prefix}${body.testCredential}`;
			}

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
				const message = buildErr instanceof Error ? buildErr.message : String(buildErr);
				return json({
					ok: false,
					code: 'invalid_mapping',
					error: message,
					elapsedMs: Date.now() - start,
				});
			}

			try {
				assertSafeUrl(requestUrl, {
					allowPrivateNetworks,
					allowedHosts,
				});
			} catch (guardErr) {
				const message = guardErr instanceof Error ? guardErr.message : String(guardErr);
				return json({
					ok: false,
					code: 'ssrf_blocked',
					error: message,
					elapsedMs: Date.now() - start,
				});
			}

			// Make the test HTTP request with a 10s timeout
			const controller = new AbortController();
			const timeout = setTimeout(() => {
				controller.abort();
			}, 10000);

			try {
				const res = await fetch(requestUrl, {
					method,
					headers,
					body: method === 'GET' ? undefined : requestBody,
					signal: controller.signal,
				});
				clearTimeout(timeout);

				const elapsedMs = Date.now() - start;
				const status = res.status;
				const statusText = res.statusText;
				const contentType = res.headers.get('content-type') || '';
				const text = await res.text();

				let preview = text.slice(0, 300);
				if (contentType.includes('application/json')) {
					try {
						preview = JSON.stringify(JSON.parse(text), null, 2).slice(0, 300);
					} catch {
						// Not valid json
					}
				}

				return json({
					ok: res.ok,
					status,
					statusText,
					contentType,
					preview,
					elapsedMs,
				});
			} catch (fetchErr) {
				clearTimeout(timeout);
				const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
				return json({
					ok: false,
					code: 'network_error',
					error: message,
					elapsedMs: Date.now() - start,
				});
			}
		}

		if (!body.serverUrl.trim()) {
			return json({ ok: false, error: 'Server URL is required' }, { status: 400 });
		}

		// 1. Enforce SSRF guardrail checks
		try {
			assertSafeUrl(body.serverUrl, {
				allowPrivateNetworks,
				allowedHosts,
			});
		} catch (guardErr) {
			const message = guardErr instanceof Error ? guardErr.message : String(guardErr);
			return json({
				ok: false,
				code: 'ssrf_blocked',
				error: message,
				elapsedMs: Date.now() - start,
			});
		}

		// Format headers for MCP JSON-RPC
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Accept: 'application/json, text/event-stream',
			'MCP-Protocol-Version': '2026-07-28',
			...(body.headers ?? {}),
		};

		if (body.auth?.type && body.testCredential) {
			const headerName = body.auth.headerName?.trim() || 'Authorization';
			const prefix = body.auth.headerPrefix !== undefined ? body.auth.headerPrefix : 'Bearer ';
			headers[headerName] = `${prefix}${body.testCredential}`;
		}

		// Test tools/list on MCP server
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

		const controller = new AbortController();
		const timeout = setTimeout(() => {
			controller.abort();
		}, 10000);

		try {
			const res = await fetch(body.serverUrl, {
				method: 'POST',
				headers,
				body: JSON.stringify(rpcPayload),
				signal: controller.signal,
			});
			clearTimeout(timeout);

			const elapsedMs = Date.now() - start;
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

			let matchingToolFound = false;
			if (body.mcpToolName?.trim()) {
				matchingToolFound = toolNames.includes(body.mcpToolName.trim());
			}

			return json({
				ok: res.ok,
				status,
				protocolVersion: '2026-07-28',
				toolCount: tools.length,
				tools: toolNames,
				targetToolFound: body.mcpToolName ? matchingToolFound : undefined,
				preview: JSON.stringify(rpcData.result ?? rpcData, null, 2).slice(0, 300),
				elapsedMs,
			});
		} catch (fetchErr) {
			clearTimeout(timeout);
			const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
			return json({
				ok: false,
				code: 'network_error',
				error: message,
				elapsedMs: Date.now() - start,
			});
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ ok: false, error: message }, { status: 500 });
	}
};
