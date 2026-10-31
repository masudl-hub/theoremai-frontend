---
title: Auth & Credentials
updated: 2026-10-30
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
* **Origin-Locked Dispatch**: Credentials go only to the origin of the request, and a redirect that leaves that origin drops them.

## Declaring Tool Auth (`auth`)

Add an `auth` block to any tool definition (`function`, `http`, or `mcp`) to specify how it authenticates.

The cookbook's research tools read public sources and sign in to nothing. To have the scout search a person's private repositories, you add a tool of your own. `list_my_repos` is that example, and the cookbook does not ship it. It calls `search_repositories` on GitHub's MCP server, `https://api.githubcopilot.com/mcp`:

```ts frame=tool:mcp
name: 'list_my_repos',
// ...
auth: {
	slot: 'github',
	type: 'oauth2',
	service: 'GitHub',
	scopes: ['repo'],
	onUnauthenticated: 'gate',
},
// ...
```

You supply the rest: a GitHub OAuth App, the sign-in routes from [OAuth PKCE Flow](/docs/tools/oauth), a `ToolCredentialSource`, and the tool's name in the scout's `tools.allow`.

* **`slot`**: Logical identifier naming where this credential is saved. Multiple tools targeting the same service share a slot.
* **`type`**: Credential shape: `'bearer'`, `'api_key'`, or `'oauth2'`.
* **`service`**: Human-readable service name displayed on the sign-in prompt.
* **`scopes`**: OAuth scopes required for execution.
* **`preResolved`**: Optional. Its `issuer` and `resource` are named on the auth gate. To skip discovery for a service with no metadata, pass the endpoints to `createOAuthPkceFlow` (see [OAuth PKCE Flow](/docs/tools/oauth)).

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
	headerPrefix: '', // Send the key with nothing before it
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

```ts frame=statements
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
	profile: 'research.scout',
	// ...
	credentials: userCredentials,
});
```

For test environments and local development, initialize an in-memory store using `memoryCredentialSource({ slot: credential })`.

## Interactive Key & Token Sign-In

When an `api_key` or `bearer` tool halts on an auth gate, the frontend collects the secret from the user. The backend builds and stores the typed credential using `credentialForSignInGate()`:

```ts frame=statements
import type { ToolGate } from '@theoremjs/agents';
import { credentialForSignInGate } from '@theoremjs/agents/kernel';

// `gate` is the `gate` of the held call's tool event (`phase: 'gate'`).
async function answerSignIn(gate: ToolGate, secret: string) {
	if (gate.kind !== 'auth') return;

	const { slot, credential } = credentialForSignInGate(gate.authChallenge, secret);
	await userCredentials.set(slot, credential);
	// ...
}
```

Because typed secrets are validated server-side, client code cannot tamper with the credential kind or target slot.

## Scope Protection & Network Safety

Theorem enforces strict boundaries around tool authentication:

* **Scope Boundaries**: If a service answers `insufficient_scope` and asks for a scope that `registerTool.auth.scopes` does not list, the call fails with the code `out_of_scope`, with no new sign-in. The call's progress event carries `auth_scope_refused` with the scopes asked for and the scopes declared. When every scope asked for is declared, the user signs in again.
* **SSRF Prevention**: All authentication handshakes and tool requests are evaluated against network guardrails. Requests to private networks, loopback addresses, or cloud metadata endpoints (`169.254.169.254`) are refused unless `guardrails.network` allows them with `allowPrivateNetworks` or `allowedHosts`.
* **Redirect Protection**: An authenticated request drops its credential when a redirect leaves the origin. OAuth discovery and token requests follow no redirect.

## OAuth PKCE Sign-In

For services requiring OAuth 2.0 with PKCE, such as GitHub, Theorem provides stateless authorization helpers and automatic token refresh:

* See the dedicated guide: **[OAuth PKCE Flow](/docs/tools/oauth)** for complete implementation patterns, callback exchanges, and session-binding security.

## Authenticated Function Tools (`signedInFetch`)

For custom `function` tools that declare `auth`, Theorem provides `ctx.signedInFetch`. The handler never touches the raw secret. The cookbook's `export_report` has no `auth`. This version saves to a service of yours that takes a token you issue:

```text
name: 'export_report',
// ...
auth: { slot: 'reports', type: 'bearer', service: 'Reports' },

handler: async (input, ctx) => {
	// signedInFetch adds the Authorization header, for this URL's origin only
	const response = await ctx.signedInFetch?.('https://app.example/reports', {
		method: 'POST',
		body: JSON.stringify(input),
	});
	return { saved: response?.ok ?? false };
},
// ...
```

## Related Guides

* **[OAuth PKCE Flow](/docs/tools/oauth)**: Managing PKCE flows, encrypted state, and automatic token refresh.
* **[Tools & Execution Pipeline](/docs/tools)**: Declaring function, HTTP, and MCP tools.
* **[Tool Permissions & Gates](/docs/tools/gates)**: Handling permission gates and `invokeTool()` resumption.
* **[Network Safety & Guardrails](/docs/guardrails/network)**: Restricting outbound destination domains and IP ranges.
