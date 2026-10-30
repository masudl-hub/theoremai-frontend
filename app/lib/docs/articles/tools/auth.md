---
title: Auth & Credentials
updated: 2026-10-29
summary: Authenticating tools with OAuth, bearer tokens, and API keys without exposing secrets to models.
entry: src/kernel/auth/mod.ts
covers: src/kernel/auth, src/kernel/tools/signed-in-fetch.ts
cover: /imagery/th30_roads.png
coverAlt: Winding desert highway cutting across vast open plains
coverPosition: 50% 50%
---

Tools that read private user data or mutate external services must act on behalf of the signed-in user, not with ambient environment credentials or shared server keys.

Theorem decouples credential management from tool definitions:
* **Zero Model Exposure**: Credentials are never placed in prompt context, tool definitions, or browser bundles.
* **Automatic Echo Scrubbing**: If an external API reflects credentials in its response body or headers, Theorem strips the value and substitutes `[omitted - credential]` before emitting trace events or returning data to the model.
* **Origin-Locked Dispatch**: Credentials are delivered exclusively to the tool's verified origin and never forwarded across HTTP redirects.

## Declaring Tool Auth (`auth`)

Add an `auth` block to any tool definition (`function`, `http`, or `mcp`) to specify how it authenticates:

```ts
import { registerTool } from '@theoremjs/agents';
import { z } from 'zod';

export const listShipmentsTool = registerTool({
	type: 'http',
	name: 'list_user_shipments',
	description: 'List shipments for the authenticated user.',
	category: 'logistics',
	access: 'read-only',
	paths: ['*'],
	loadTier: 'T0',
	permission: 'auto',
	endpoint: 'https://api.tracker.example/shipments',
	method: 'GET',
	input: z.object({}),
	output: z.object({ shipments: z.array(z.string()) }),

	auth: {
		slot: 'tracker',
		type: 'oauth2',
		service: 'FreightTracker',
		scopes: ['shipments.read'],
		onUnauthenticated: 'gate',
	},
});
```

* **`slot`**: Logical identifier naming where this credential is saved. Multiple tools targeting the same service share a slot.
* **`type`**: Credential shape: `'bearer'`, `'api_key'`, or `'oauth2'`.
* **`service`**: Human-readable service name displayed on the sign-in prompt.
* **`scopes`**: OAuth scopes required for execution.
* **`preResolved`**: Optional endpoints (`authorizationEndpoint`, `tokenEndpoint`) for providers lacking RFC 8414 discovery metadata.

## Credential Placement

By default, bearer tokens and API keys are sent in the `Authorization` header:

```text
// Default header placement
auth: {
	slot: 'metrics',
	type: 'bearer', // Header: "Authorization: Bearer <token>"
	service: 'MetricsService',
}
```

### Custom Headers

For services expecting non-standard authorization headers (e.g., `X-API-Key`):

```text
auth: {
	slot: 'custom_gateway',
	type: 'api_key',
	service: 'Gateway',
	headerName: 'X-API-Key',
	headerPrefix: '', // Omit standard "Bearer " prefix
}
```

### URL Query Parameters

Some services require API keys in the URL query string rather than HTTP headers (e.g., `?key=...`). Set `queryParam`:

```text
auth: {
	slot: 'geocoding',
	type: 'api_key',
	service: 'MappingService',
	queryParam: 'key', // Appends ?key=<token> to request URL
}
```

When `queryParam` is set, Theorem sends the key exclusively in the query string and emits no authorization headers. `registerTool` rejects configurations that declare both `queryParam` and header settings.

## Unauthenticated Policies (`onUnauthenticated`)

The `onUnauthenticated` policy dictates what happens when a credential slot is empty or expired:

| Policy | Behavior | Typical Use Case |
| :--- | :--- | :--- |
| **`'gate'`** (Default) | Turn halts with `stop: { kind: 'gate' }` and `kind: 'auth'`. | Standard user sign-in flows. |
| **`'report_to_model'`** | Turn continues; model is informed that the user is not signed in. | Optional tools where the agent can adapt its plan. |
| **`'fail'`** | Call fails immediately with `not_authorized`. | Machine-to-machine keys held by server operators. |

## Supplying Credentials (`ToolCredentialSource`)

The host supplies credentials per turn or per session using a `ToolCredentialSource`. The kernel reads slots on demand when a tool runs:

```ts
import { runTurn } from '@theoremjs/agents';
import type { ToolCredential, ToolCredentialSource } from '@theoremjs/agents/kernel';

const userCredentials: ToolCredentialSource = {
	get: async (slot: string): Promise<ToolCredential | undefined> => {
		return await secureVault.load(currentUserId, slot);
	},
	set: async (slot: string, credential: ToolCredential): Promise<void> => {
		await secureVault.save(currentUserId, slot, credential);
	},
	clientSecret: async (_clientId: string): Promise<string | undefined> => {
		return process.env.OAUTH_CLIENT_SECRET;
	},
};

const _events = runTurn({
	profile: 'harbor.desk',
	input: { text: 'List my shipments.' },
	credentials: userCredentials,
});
```

For test environments and local development, initialize an in-memory store using `memoryCredentialSource({ slot: credential })`.

## Interactive Key & Token Sign-In

When an `api_key` or `bearer` tool halts on an auth gate, the frontend collects the secret from the user. The backend builds and stores the typed credential using `credentialForSignInGate()`:

```ts
import { invokeTool, type ToolGate } from '@theoremjs/agents';
import { credentialForSignInGate } from '@theoremjs/agents/kernel';

// `gate` is the `gate` of the held call's tool event (`phase: 'gate'`).
export async function answerSignIn(gate: ToolGate, secret: string) {
	if (gate.kind !== 'auth') return;

	// 1. Build typed credential from user input
	const { slot, credential } = credentialForSignInGate(gate.authChallenge, secret);
	await userCredentials.set(slot, credential);

	// 2. Resume the held call
	return invokeTool({
		profile: 'harbor.desk',
		name: gated.name,
		snapshot: gated.snapshot,
		resume: { granted: true, signIn: true },
		credentials: userCredentials,
		input: gated.arguments,
	});
}
```

Because typed secrets are validated server-side, client code cannot tamper with the credential kind or target slot.

## Scope Protection & Network Safety

Theorem enforces strict boundaries around tool authentication:

* **Scope Boundaries**: If a service answers `insufficient_scope` and asks for a scope that `registerTool.auth.scopes` does not list, the call fails with the code `out_of_scope`, with no new sign-in. The call's progress event carries `auth_scope_refused` with the scopes asked for and the scopes declared. When every scope asked for is declared, the user signs in again.
* **SSRF Prevention**: All authentication handshakes and tool requests are evaluated against network guardrails. Requests to private networks, loopback addresses, or cloud metadata endpoints (`169.254.169.254`) are refused unless explicitly permitted via `resolveHost`.
* **Redirect Protection**: Authenticated requests and OAuth code exchanges never follow redirects that leave the resource server's origin.

## OAuth PKCE Sign-In

For services requiring OAuth 2.0 with PKCE (e.g., GitHub, Slack, Google), Theorem provides stateless authorization helpers and automatic token refresh:

* See the dedicated guide: **[OAuth PKCE Flow](/docs/tools/oauth)** for complete implementation patterns, callback exchanges, and session-binding security.

## Authenticated Function Tools (`signedInFetch`)

For custom `function` tools that declare `auth`, Theorem provides `ctx.signedInFetch`. The handler never touches the raw secret:

```text
registerTool({
	type: 'function',
	name: 'sync_user_vault',
	// ... access, loadTier, input, output
	auth: { slot: 'user_vault', type: 'bearer', service: 'UserVault' },

	handler: async (input, ctx) => {
		// signedInFetch injects Authorization header exclusively to the service origin
		const response = await ctx.signedInFetch(`https://vault.example.com/${input.path}`, {
			method: 'POST',
		});
		return { synced: response.ok };
	},
});
```

## Related Guides

* **[OAuth PKCE Flow](/docs/tools/oauth)**: Managing PKCE flows, encrypted state, and automatic token refresh.
* **[Tools & Execution Pipeline](/docs/tools)**: Declaring function, HTTP, and MCP tools.
* **[Tool Permissions & Gates](/docs/tools/gates)**: Handling permission gates and `invokeTool()` resumption.
* **[Network Safety & Guardrails](/docs/guardrails/network)**: Restricting outbound destination domains and IP ranges.
