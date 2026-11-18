---
title: Auth & Credentials
updated: 2026-11-18
summary: Authenticating tools with OAuth, bearer tokens, and API keys without exposing secrets to models.
entry: src/kernel/auth/mod.ts
covers: src/kernel/auth, src/kernel/tools/signed-in-fetch.ts, src/kernel/tools/probe.ts
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

### Picking the Sign-In From the Call

A `function` tool can act on one of several accounts that its input names. Give `auth` a function of the call's checked input. It returns the sign-in for that call, or `undefined` when the call needs none:

```ts
import { registerTool } from '@theoremjs/agents';
import { z } from 'zod';

registerTool({
	type: 'function',
	name: 'read_inbox',
	description: "Read the newest messages in the person's work or home mail.",
	category: 'mail',
	access: 'read-only',
	permission: 'auto',
	loadTier: 'T0',
	paths: ['*'],
	input: z.object({ account: z.enum(['work', 'home']) }),
	output: z.object({ messages: z.array(z.record(z.string(), z.unknown())) }),
	auth: ({ account }) => ({
		slot: `mail_${account}`,
		type: 'oauth2',
		service: account === 'work' ? 'Work mail' : 'Home mail',
	}),
	handler: async (_input, ctx) => {
		const response = await ctx.signedInFetch?.('https://mail.example/v1/inbox');
		return { messages: (await response?.json()) ?? [] };
	},
});
```

* The kernel picks once per call, before the permission check, and checks the pick as it checks a registered `auth`. The call's gate, its resume and its `sign_in` notes all read that one pick.
* If the function throws or its pick fails the checks, the call fails with `handler_error` before the handler runs. The turn goes on.
* Input that the schema refuses picks nothing; the call fails on its input.
* A host that rebuilds a held call's sign-in gate from the registered tool calls `toolAuthForCall(tool, input)` for the same pick. The studio does this.
* An agent tool counts a tool with a function `auth` as one that can stop on a gate. See [Agent Tools](/docs/tools/agent).

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
	delete: async (slot: string): Promise<void> => {
		await secureVault.remove(currentUserId, slot);
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

* **`get`**: The slot's credential, or `undefined` when the person has not signed in.
* **`set`**: A refreshed OAuth token, or a key typed at a sign-in gate. The call goes on only once it resolves, so persist it here.
* **`delete`**: Forgets the slot, as when the person disconnects the service. After it resolves, `get` answers `undefined`, and the next call that needs the slot gates. The kernel never calls it; you do. For an OAuth sign-in, call `revokeOAuthToken` first (see [OAuth PKCE Flow](/docs/tools/oauth)).
* **`clientSecret`**: Optional. A confidential OAuth client's secret, read when the kernel refreshes a token.

For test environments and local development, initialize an in-memory store using `memoryCredentialSource({ slot: credential })`.

## Keeping Keys Out of the Run (`sealedCredentialHost`)

Use a sealed credential source when the code a turn runs must never hold a key. The run asks the sealed side to get a slot ready, and sends each request on the call's own origin through it. The key stays on the sealed side.

1. Where the keys are kept, out of reach of the run's code (for example, in its own Worker), build that side with `sealedCredentialHost({ source, slots })`. `source` is your `ToolCredentialSource`. `slots` names every slot it sends for, each with the `resource` its key may go to: an https URL, matched by origin and by its path or a path below it.
2. Give the run a source with `sealed: true` whose `prepare` and `send` forward to that side, and pass it as `credentials`.

```ts frame=statements
import type { SealedCredentialSource } from '@theoremjs/agents/kernel';
import { sealedCredentialHost } from '@theoremjs/agents/kernel';

// Where the keys are kept:
const keys = sealedCredentialHost({
	source: userCredentials,
	slots: { github: { resource: 'https://api.githubcopilot.com/mcp' } },
});

// In the run, forward each call to that side, for example over your Worker's messages:
const sealed: SealedCredentialSource = {
	sealed: true,
	prepare: (slot) => keys.prepare(slot),
	send: (slot, url, request) => keys.send(slot, url, request),
};

const _events = runTurn({
	profile: 'research.scout',
	// ...
	credentials: sealed,
});
```

* **`prepare`** gets the slot ready: an OAuth token near its expiry is refreshed and stored on the sealed side. It answers `absent`, `ready` or `unusable`, never the key.
* **`send`** sends one request with the key, follows no redirect, and replaces the key wherever the service echoed it. A request outside the slot's `resource`, or outside the resource an OAuth token was issued for, is refused before the key is read. So is a slot that `slots` does not name. The `network` option sets the network guardrail each request is checked against.
* Gates, scope refusals and echo scrubbing work as with a source the run reads. A key typed at a sign-in gate is refused: the person enters it where the keys are kept.
* When the sealed side throws, only that call fails. It is reported as a `hook_failed` event with `hook: 'credentials'`.

`credentials` on a turn, a tool call and a tool's context takes either kind of source. Check it with `isSealedSource` before you call `get` or `set`. In the web handler, a sealed application `credentials` stands alone: the session's own store is not used beside it.

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

## Checking a Key Before You Keep It (`probeTool`)

Check a pasted key with the service before you save it, so the person learns at once that it is wrong, not when the model first calls the tool. `probeTool` sends one request the way the tool's own call sends it: the key goes where `auth` puts it, through the network guardrail, and a redirect that leaves the first origin drops it. An MCP server is asked for its tool list, and gets a session when it asks for one. Nothing is stored.

```ts frame=statements
import type { ToolGate } from '@theoremjs/agents';
import { credentialForSignInGate, probeTool } from '@theoremjs/agents/kernel';

async function answerSignIn(gate: ToolGate, secret: string) {
	if (gate.kind !== 'auth') return;

	const probe = await probeTool({
		target: { type: 'mcp', serverUrl: 'https://api.githubcopilot.com/mcp' },
		auth: { type: 'bearer' },
		credential: secret,
		timeoutMs: 10_000,
	});
	if (probe.verdict !== 'accepted') return probe.verdict;

	const { slot, credential } = credentialForSignInGate(gate.authChallenge, secret);
	await userCredentials.set(slot, credential);
	// ...
}
```

The result's `verdict` is one of four:

| `verdict` | Meaning |
| :--- | :--- |
| `accepted` | The service answered 2xx. For an MCP server, it sent its tool list, and `mcp` names the tools. |
| `refused` | The service answered 401 or 403 to the key. |
| `inconclusive` | The service answered, but said nothing about the key: a 402 or a 500, a body past `maxResponseBytes`, or an MCP server that erred. `reason` says which. |
| `unanswered` | No answer came back: the guardrail refused the address, the request failed, or `timeoutMs` ran out. `reason` says which. |

Only `accepted` means the key works. An answer's body comes back with the key replaced, but it is still the service's own text, so do not show it to the person. Without `timeoutMs` or `maxResponseBytes`, the request waits and reads as long as the tool's own call would. The studio's **Test connection** runs on the same call.

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
