---
title: Registering tools
updated: 2026-10-05
summary: Register a tool with registerTool and allow it by name. See why a call fails, the order of every call, and how OAuth signs the user in.
entry: src/kernel/tools/mod.ts
covers: src/kernel/tools, src/kernel/auth
cover: /imagery/th30_malachite.png
coverAlt: Malachite pools in rings
coverPosition: 0% 16%
---

Give your agent an ability in two steps. Register the tool once with `registerTool`. Then list its name in the profile’s `tools.allow`. The model can then call it.

A builtin tool runs at the model provider. Declare it in `builtInTools` on the model binding, not in `tools.allow` ([Binding models](/docs/models)).

## Register

```ts frame=statements
registerTool({
	type: 'function',
	name: 'lookup',
	description: 'Look up an account by id.',
	category: 'account',
	access: 'read-only',
	paths: ['*'],
	loadTier: 'T0',
	permission: 'auto',
	input: z.object({ id: z.string() }),
	output: z.object({ name: z.string() }),
	handler: ({ id }) => ({ name: id }),
})
```

## Register a tool

`name` is the tool’s id. The model calls the tool by it, and `tools.allow` lists it. `description` tells the model what the tool does.

Theorem sends the Zod `input` schema to the model as the tool’s arguments. It checks every call against `input` and every result against `output`.

`handler` runs when the model calls the tool and when your code calls `invokeTool`.

`paths: ['*']` offers the tool on every request path. Any other list offers the tool only when the request’s `path` is in the list.

`registerTool` replaces a tool that has the same name. Set `type` to `http`, `mcp` or `agent` for a tool that calls a URL, an MCP server or another agent.

## Allow the tool

Add the tool’s name to `tools.allow` on each profile that may use it.

```ts frame=profile:text
type: 'text',
tools: { allow: ['lookup'] },
```

```note
Text, image, live and host profiles require `tools`. For no tools, write `{ allow: [] }` ([Choosing a modality](/docs/modalities)). The model never sees a name in `allow` that has no registered tool. `registerProfile` refuses a registered builtin in `allow`.
```

## Read a failed call

A failed call reaches the host as a tool event with `phase: 'error'`. `failure.code` holds the code, and the model reads `failure.message`. The turn goes on. The model can try again or answer without the tool. Theorem checks in the order of the table below, and stops at the first failure.

## Fix a failed call

Code | Cause | Fix
--- | --- | ---
`unknown_tool` | No registered tool has this name | Register the tool, or correct the name
`not_allowed` | The tool is not in the profile’s `tools.allow` | Add the name to `tools.allow`
`not_gated` | The request’s `path` is not in the tool’s `paths` | Add the path, or use `paths: ['*']`
`not_loaded` | The tool’s `loadTier` has not loaded it yet | Call the loader tool first, or use tier `T0`
`tainted_turn` | The turn read a remote result, and `guardrails.taint.afterRemoteRead` refuses this tool’s `access` | Change the profile’s taint setting, or the tool’s `access`
`arguments_blocked` | `guardrails.detect` blocks a match in the arguments | Change the action at `tool_arguments_<kind>`, or keep that data from the model
`output_blocked` | `guardrails.detect` blocks a match in the tool’s output | Change the action at `tool_output_<kind>`, or return less from the tool
`invalid_input` | The arguments do not match `input` | Fix the schema, or the description that the model reads
`invalid_output` | The result does not match `output` | Fix the handler, or the `output` schema
`handler_error` | The handler threw an error | Fix the handler. The model reads the error text
`provider_native` | The call names a tool that the model provider runs itself, so Theorem cannot run it | Do not call it with `invokeTool`
`denied` | The user declined the approval or the sign-in | Nothing to fix. The call did not run
`expired` | The sign-in lapsed before the call ran | Ask the user to sign in again
`cancelled` | The user left the approval or sign-in without an answer | Ask again

## Ask before a tool runs

Set `permission` to `session_consent` or `always_confirm` to pause the call until the host approves it. `auto` runs without asking. The host answers the approval ([Building the interface](/docs/interface)).

`invokeTool` runs a tool with the same checks and no model call. After a turn reads a remote tool’s result, `guardrails.taint.afterRemoteRead` refuses calls by each tool’s `access` ([Setting guardrails](/docs/guardrails)).

## The order of every call

Every call passes the same steps in the same order. This holds for a call that the model makes and for a call that your code makes through `invokeTool`.

1. Allowed? Theorem checks the allow list, the paths and the load tier. A failure is a denial.
2. Inspect the arguments: the credential report and the taint gate. A tainted turn is a denial.
3. Parse the arguments with the Zod `input` schema.
4. Permission: `session_consent` or `always_confirm`. A call that needs a yes becomes a gate.
5. Credential ready? Theorem refreshes a token that is about to expire. A call that needs a sign-in becomes a gate.
6. `preTool` runs. It can deny.
7. Stage `pre_tool` runs. It can deny, ask for confirmation (a gate), or change the input. Theorem then parses the new input again.
8. The tool runs: handler, HTTP, MCP or builtin.
9. If this call was the loader, Theorem promotes its tools to tier T2.
10. Theorem guards the result: fence, redaction, provenance and advisory.
11. Stage `post_tool` runs. It can deny, change the result or inject text.

Each call ends with one terminal tool event. A **gate** ends the turn with `stop.kind` set to `gate`. A **denial** is a failed call: the model sees the failure and the turn continues.

## When a call waits for a person

A call waits for a person in three ways. Each way has its own path.

**Gate** (permission, confirmation or sign-in). The client sees a `tool` event with `phase: 'gate'` and a `gate` payload, then a `done` event with `stop.kind: 'gate'`. Your interface collects the answer. Then it calls `invokeTool({ resume: { granted }, snapshot: done.tools })`. The tool body runs once.

**Denial** (`preTool`, `pre_tool`, `post_tool` or the taint gate). The client sees a failed `tool` event with a reason code. You do nothing. The model sees the failure and goes on.

**Question** (`ask_user`). The client sees a finished `ask_user` result that carries the question. The user’s answer is the next user turn.

## Sign the user in to a tool

Use OAuth when an HTTP or MCP tool must act as the signed-in user. Give the tool `auth` of `type: "oauth2"`. You need no OAuth library. When the tool needs a token that the user has not granted, the call becomes an auth gate. The helpers in `@theoremjs/agents/kernel` do the rest.

**PKCE** (Proof Key for Code Exchange) ties the authorization code to the client that asked for it.

## The three parts of one sign-in

```ts
import { invokeTool, runTurn } from '@theoremjs/agents';
import { createOAuthPkceFlow, exchangeOAuthPkce } from '@theoremjs/agents/kernel';

// 1. During the turn: a tool needs sign-in.
for await (const event of runTurn(request, provider)) {
	if (event.type === 'tool' && event.tool.phase === 'gate' && event.tool.gate.kind === 'auth') {
		const flow = await createOAuthPkceFlow({
			resourceServerUrl: 'https://api.tracker.example',
			clientId: 'https://app.example/oauth/client.json',
			redirectUri: 'https://app.example/oauth/callback',
			scopes: event.tool.gate.authChallenge.requiredScopes,
			signingSecret: secrets.oauthStateSecret,
			sessionBinding: session.id,
		});
		redirect(flow.authorizationUrl);
	}
	send(event);
}

// 2. On your callback route: exchange the code and save the credential.
const { credential } = await exchangeOAuthPkce({
	code: params.get('code') ?? '',
	state: params.get('state') ?? '',
	iss: params.get('iss') ?? undefined,
	redirectUri: 'https://app.example/oauth/callback',
	signingSecret: secrets.oauthStateSecret,
	sessionBinding: session.id,
});
await vaultCredentials(user.id).set('tracker', credential);

// 3. Resume the gated call. `gated` holds the `name` and `arguments` of the call, and `done.tools` as `snapshot`.
for await (const event of invokeTool({
	profile: 'support.agent',
	name: gated.name,
	input: gated.arguments,
	snapshot: gated.snapshot,
	resume: { granted: true },
	credentials: vaultCredentials(user.id),
})) {
	send(event);
}
```

## Where credentials live

Credentials travel in `TurnRequest.credentials`, a `ToolCredentialSource`. The kernel reads one slot at a time, and only when a tool that signs in runs. A turn therefore opens no credential that it does not use. `memoryCredentialSource(record)` wraps a plain record.

The kernel never stores credentials, and they never belong in the browser. `createTheoremHandler` keeps them in a server-side credential store ([Building the interface](/docs/interface)).

If a tool sets `onUnauthenticated: "report_to_model"`, the model hears that it is not signed in, and the call does not gate. Use this for tools that the agent can manage without.

A `function` tool can sign in too. Give it the same `auth`. Its handler then gets `ctx.signedInFetch(url, init)`, which sends the credential to the origin of that URL only. The handler never sees the token. If the service refuses the credential, the call throws `CredentialRefusedError` (from `@theoremjs/agents/kernel`), and the kernel starts a new sign-in. A handler that catches its own errors must rethrow this one.

## What the flow protects against

**Session binding.** Pass the same `sessionBinding` to both calls. It is a value tied to the user’s browser session that an attacker cannot know or set, such as your session id. Theorem refuses a callback from any other session. An attacker therefore cannot save the token of their own account into someone else’s session (login CSRF, RFC 6749 section 10.12).

**Mix-up protection.** The `iss` value on the callback must match the discovered issuer (RFC 9207). It is required when the server says that it sends one. The redirect URI must match. Theorem exchanges the code only at the token endpoint that is sealed into `state`.

**Resource indicators.** Every token is bound to the resource that the flow was for (RFC 8707). A tool never sends a token to a URL outside that resource. If a credential names no resource, Theorem does not use it. The call gates for sign-in instead.

**Strict inputs.** `redirectUri` must be HTTPS, or HTTP on a loopback host, or a reverse-domain app scheme, and it must have no fragment (RFC 8252). Each scope must be one RFC 6749 scope token. `stateTtlMs` must be a positive number.

**State.** The PKCE challenge uses S256 (RFC 7636), and the verifier never leaves your server. The verifier and the flow details (issuer, token endpoint, redirect URI, resource) are encrypted into `state` with AES-256-GCM and a time to live. You need no session table. Every `state` has its own key, from a fresh HKDF salt. `signingSecret` must be at least 32 bytes with 256 bits of entropy. Use 32 random bytes, base64-encoded.

**Discovery.** Theorem reads the protected-resource metadata (RFC 9728), then the authorization-server metadata (RFC 8414). The metadata must name exactly the resource and the issuer that Theorem asked for. Every endpoint must use HTTPS, and the server must advertise S256. Discovery and token requests go through the network guard and never follow redirects. `clientId` can be an HTTPS URL (a Client ID Metadata Document), so you do not register a client with every server.

## Providers and token refresh

**Confidential clients.** Some providers need a client secret. Google needs one for web clients. Pass it as `clientSecret` to `exchangeOAuthPkce` and `refreshOAuthToken`. They send it in the token request body, never on the credential. When the kernel refreshes a token, it asks your source for the secret with `clientSecret(clientId)`. You can rotate the secret without rewriting stored credentials.

**Provider parameters.** `authorizationParams` adds a provider’s own parameters to the authorization URL. For example, Google issues a refresh token only with `access_type: "offline"`. Theorem refuses a parameter that the flow sets itself, such as `state` or `redirect_uri`.

**Refresh.** Theorem refreshes a token that is within 30 seconds of expiry before the call. The new credential goes to your source with `set(slot, credential)`, and the call waits for it. A rotated refresh token is therefore saved before it is used. The turn emits `auth_token_refreshed` with the slot name. The token never rides the event stream. Calls that find the same expired token share one refresh, so a rotating refresh token is never presented twice.

**Refused refresh.** A refused refresh emits `auth_token_refresh_failed`. The text from the server rides only in `errorInternal`. `forClient` strips it, and it never reaches the model.

**Echoed credentials.** Some responses repeat the token or key that they were sent with, such as an echo endpoint or a debug error page. Theorem replaces that value with `[omitted - credential]` before the model, the trace or the client sees it.
