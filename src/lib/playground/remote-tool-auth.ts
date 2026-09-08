import { parseList } from './playground-policy';
import type { HttpToolRegistration, ToolSpecData } from './types';

export type RemoteToolAuth = NonNullable<HttpToolRegistration['auth']>;

export function parseHeadersJson(raw: string): Record<string, string> | null {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
		const out: Record<string, string> = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value !== 'string') return null;
			out[key] = value;
		}
		return out;
	} catch {
		return null;
	}
}

export function buildRemoteToolAuth(data: ToolSpecData): RemoteToolAuth | undefined {
	if (!data.authType || data.authType === 'none') return undefined;
	return {
		slot: data.authSlot?.trim() || 'default',
		type: data.authType,
		headerName: data.authHeaderName?.trim() || undefined,
		headerPrefix: data.authHeaderPrefix !== undefined ? data.authHeaderPrefix : undefined,
		onUnauthenticated: data.authUnauthenticated ?? 'pause',
		scopes: data.authScopes ? parseList(data.authScopes) : undefined,
		clientId: data.authClientId?.trim() || undefined,
		redirectUri: data.authRedirectUri?.trim() || undefined,
	};
}

/** Auth payload for playground test-connection (no OAuth metadata). */
export function buildTestConnectionAuth(data: ToolSpecData):
	| {
			slot?: string;
			type?: 'bearer' | 'api_key' | 'oauth2';
			headerName?: string;
			headerPrefix?: string;
	  }
	| undefined {
	const auth = buildRemoteToolAuth(data);
	if (!auth) return undefined;
	return {
		slot: auth.slot,
		type: auth.type,
		headerName: auth.headerName,
		headerPrefix: auth.headerPrefix,
	};
}
