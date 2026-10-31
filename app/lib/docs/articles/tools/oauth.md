---
title: OAuth PKCE Flow
updated: 2026-10-29
summary: OAuth 2.0 PKCE authorization flow with stateless encrypted state, session binding, and token refresh.
entry: src/kernel/auth/oauth.ts
covers: src/kernel/auth/oauth.ts, src/kernel/auth/crypto.ts
cover: /imagery/th30_saltflats.png
coverAlt: Vast white crystalline salt flats reflecting the clear sky
coverPosition: 50% 50%
---

Theorem includes native helpers for OAuth 2.0 with Proof Key for Code Exchange (PKCE, RFC 7636). Host applications can manage user authorizations without third-party OAuth libraries or session database tables.

The OAuth lifecycle operates through three stages: initiating the flow during a turn, exchanging the authorization code on a callback route, and resuming the held tool call.

```mermaid
flowchart TD
		Gate["1. Tool Triggers Auth Gate<br/>(kind: 'auth')"] --> Start["createOAuthPkceFlow({ ... })"]
		Start --> Redirect["2. Redirect User to Provider"]
		Redirect --> Callback["3. Provider Returns Code to Callback URL"]
		Callback --> Exchange["exchangeOAuthPkce({ code, state })"]
		Exchange --> Persist["Save Credential via credentials.set()"]
		Resume["4. invokeTool({ snapshot, resume: { granted: true, signIn: true } })"]
		Persist --> Resume
```

## 1. Initiate PKCE Flow

When a turn halts on an auth gate (`kind: 'auth'`), initiate the authorization request using `createOAuthPkceFlow()`:

```ts
import type { ToolGate } from '@theoremjs/agents';
import { createOAuthPkceFlow } from '@theoremjs/agents/kernel';

// `gate` is the `gate` of the held call's tool event (`phase: 'gate'`).
export async function startSignIn(gate: ToolGate) {
	if (gate.kind !== 'auth') return;
	const flow = await createOAuthPkceFlow({
		resourceServerUrl: 'https://api.tracker.example',
		clientId: 'https://app.example/oauth/client.json',
		redirectUri: 'https://app.example/oauth/callback',
		scopes: gate.authChallenge.requiredScopes,
		signingSecret: process.env.OAUTH_STATE_SECRET ?? '',
		sessionBinding: userSessionId,
	});

	// Redirect browser to authorization provider
	redirect(flow.authorizationUrl);
}
```

### Security Parameters

* **`signingSecret`**: A secret key of 32 bytes or more maintained on your server. Theorem encrypts the PKCE code verifier and state parameters into the OAuth `state` string. This allows your callback route to verify and complete the exchange without storing pending flow state in a database.
* **`sessionBinding`**: A unique identifier tied to the user's active browser session. Theorem verifies that the callback originates from the identical session that started the authorization, preventing session-fixation attacks.
* **`resourceServerUrl`**: The target service origin (RFC 8707). Theorem binds the issued token to this resource server so it cannot be forwarded to unintended hosts.

## 2. Exchange Authorization Code

On your callback endpoint, exchange the authorization code for tokens using `exchangeOAuthPkce()` and persist the credential:

```ts
import { exchangeOAuthPkce } from '@theoremjs/agents/kernel';

const { credential } = await exchangeOAuthPkce({
	code: callbackParams.get('code') ?? '',
	state: callbackParams.get('state') ?? '',
	iss: callbackParams.get('iss') ?? undefined,
	redirectUri: 'https://app.example/oauth/callback',
	signingSecret: process.env.OAUTH_STATE_SECRET ?? '',
	sessionBinding: userSessionId,
	clientSecret: process.env.OAUTH_CLIENT_SECRET, // Optional for confidential clients
});

// Save credential into your application's credential store
await userCredentials.set('tracker', credential);
```

The code exchange refuses a callback that is not safe:
1. **Session Match**: Refuses a callback whose session binding does not match the one that started the flow.
2. **Redirect Match**: Refuses a `redirectUri` that is not the one that started the flow.
3. **Issuer Verification**: Requires the RFC 9207 `iss` value when the server sends it, and refuses one that does not match.
4. **Sealed Token Endpoint**: Sends the code only to the token endpoint sealed in `state`, never to one the caller gives.
5. **Scope Enforcement**: Refuses a token that grants scopes that were not requested.
6. **No Redirects**: Does not follow a redirect during a token request.

## 3. Resume the Held Tool Call

With the credential persisted in your `ToolCredentialSource`, resume the gated tool call using `invokeTool()`:

```ts
import { invokeTool } from '@theoremjs/agents';

const _resumeEvents = invokeTool({
	profile: 'research.scout',
	name: gated.name,
	snapshot: gated.snapshot,
	resume: {
		granted: true,
		signIn: true,
	},
	credentials: userCredentials,
	input: gated.arguments,
});
```

* Setting `signIn: true` notifies the model that authentication succeeded before returning the tool result.
* If sign-in was cancelled or declined, pass `granted: false` with `signIn: true` and `cause: 'declined'`.

## Automatic Token Refresh

OAuth access tokens expire. When a tool with an OAuth credential executes, Theorem checks the token's expiration:

* If the access token is within 30 seconds of its expiry and a `refreshToken` is present, Theorem automatically exchanges the refresh token before executing the tool call.
* The kernel saves the newly issued tokens to your `credentials` source via `credentials.set()` before dispatching the request.
* Multiple concurrent calls sharing the same credential slot consolidate into a single token refresh request.

## Related Guides

* **[Auth & Credentials](/docs/tools/auth)**: Credential isolation, tool `auth` configuration, and `ToolCredentialSource`.
* **[Tool Permissions & Gates](/docs/tools/gates)**: Gate lifecycle and `invokeTool()` resumption mechanics.
* **[Tools & Execution Pipeline](/docs/tools)**: Registering function, HTTP, and MCP tools.
