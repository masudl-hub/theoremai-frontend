---
title: Registering tools
updated: 2026-10-05
summary: Give an agent a tool that runs your code, calls a URL, an MCP server or another agent. Ask a person first, sign the user in, and fix a failed call.
entry: src/kernel/tools/mod.ts
covers: src/kernel/tools, src/kernel/auth
cover: /imagery/th30_malachite.png
coverAlt: Malachite pools in rings
coverPosition: 0% 16%
suggest: 5
---

A **tool** is code that the model can ask Theorem to run. Register the tool once. Then name it in each profile that can use it.

## The idea

A model cannot run code. It can only ask. In most applications, the code that answers is a loop that you write, and each tool gets its own checks. One tool checks its arguments. A second tool forgets.

In Theorem, every call takes the same road. The tool can be your own function, a URL, an MCP server or another agent. Theorem does the same checks before the tool runs and after it.

```figure
{
	"kind": "sequence",
	"still": { "src": "/imagery/th30_malachite.png", "position": "30% 40%" },
	"caption": "Every tool call takes this road.",
	"steps": [
		{
			"label": "The model asks for a tool",
			"text": "It names the tool and writes the arguments. It cannot run the tool."
		},
		{
			"label": "Theorem checks the call",
			"text": "The first check that fails ends the call.",
			"parts": [
				{ "label": "Allowed", "text": "The profile names the tool in tools.allow." },
				{ "label": "Arguments", "text": "The arguments match the input schema of the tool." },
				{ "label": "Sensitive data", "chapter": "guardrails", "text": "The detectors read the arguments, because a call can carry data out." },
				{ "label": "A person", "text": "A tool can need a yes or a sign-in from the user. The turn waits for it." }
			]
		},
		{
			"label": "The tool runs",
			"text": "Only this step changes with the type of tool.",
			"parts": [
				{ "label": "function", "text": "Your own code." },
				{ "label": "http", "text": "A URL." },
				{ "label": "mcp", "text": "A tool on an MCP server." },
				{ "label": "agent", "text": "Another agent." }
			]
		},
		{
			"label": "Theorem checks the result",
			"text": "The model reads the result, so the result is input too.",
			"parts": [
				{ "label": "Shape", "text": "The result matches the output schema of the tool." },
				{ "label": "Sensitive data and injection", "chapter": "guardrails", "text": "The detectors read the result before the model does." }
			]
		},
		{
			"label": "The model reads the result",
			"text": "If a check failed, the model reads the reason, and the turn goes on."
		}
	]
}
```

Your code can make the same call without a model. `invokeTool` runs one tool through a profile, with the same checks.

## Give the Harbor desk its tools

The Harbor desk answers shippers. The model does not know why a shipment is on hold, what the weather is at a port, or what the news says. Each step gives the desk one type of tool. Use only the types that your agent needs.

### 1. Run your own code

Harbor keeps each hold in its own database. A `function` tool runs your code to read it.

```ts
import { registerTool } from '@theoremjs/agents';
import { z } from 'zod';

registerTool({
	type: 'function',
	name: 'harbor_holdStatus',
	description: 'Look up why a Harbor shipment is on hold.',
	category: 'ops',
	access: 'read-only',
	paths: ['*'],
	loadTier: 'T0',
	permission: 'auto',
	input: z.object({ shipmentId: z.string() }),
	output: z.object({ status: z.string(), reason: z.string() }),
	handler: () => ({ status: 'hold', reason: 'Customs needs the commercial invoice PDF.' }),
});
```

The model reads three of these fields:

- `name` is how the model calls the tool. `registerTool` replaces a tool that has the same name.
- `description` tells the model what the tool does and when to call it.
- `input` is a Zod schema. Theorem sends it to the model as the arguments of the tool.

Theorem reads the others:

- `output` is the shape of the result. Theorem refuses a result that does not match.
- `access` says what the tool can change: `read-only`, `read-write` or `destructive`. Step 6 and [Setting guardrails](/docs/guardrails) use it.
- `paths` limits the tool to some requests. `['*']` offers the tool on every request. Any other list offers it only when the `path` of the request is in the list.
- `loadTier` says when the model first sees the tool (step 7).
- `permission` says if a person must approve the call (step 6).
- `category` is a label for your own grouping. Theorem does not read it.

The handler receives the arguments and a context. `ctx.host` is the `host` value of the request, which is the place for your database client or your user.

### 2. Call a URL

The weather at a port comes from a public API. An `http` tool calls a URL, so you write no handler.

```ts
import { registerTool } from '@theoremjs/agents';
import { z } from 'zod';

registerTool({
	type: 'http',
	name: 'get_weather',
	description: 'Read the weather now at a pair of coordinates.',
	category: 'ops',
	access: 'read-only',
	paths: ['*'],
	loadTier: 'T0',
	permission: 'auto',
	endpoint: 'https://api.open-meteo.com/v1/forecast?current_weather=true',
	method: 'GET',
	mapping: { queryParams: ['latitude', 'longitude'] },
	input: z.object({ latitude: z.number(), longitude: z.number() }),
	output: z.object({
		current_weather: z.object({ temperature: z.number(), windspeed: z.number() }),
	}),
});
```

`mapping` says where each argument goes:

- `queryParams` names the arguments that go on the URL as a query.
- `pathParams` names the arguments that fill a `{name}` placeholder in `endpoint`.
- With any method except `GET`, the other arguments go in a JSON body. `bodyParam` names one argument to send as the whole body.

Theorem checks the URL against `guardrails.network` before each request ([Setting guardrails](/docs/guardrails)). It reads no more than 4 MiB of a response.

### 3. Call an MCP server

News about a port comes from a search service. The service has an **MCP** server: a server that offers tools to agents through the Model Context Protocol. An `mcp` tool calls one tool on that server.

```ts
import { registerTool } from '@theoremjs/agents';
import { z } from 'zod';

registerTool({
	type: 'mcp',
	name: 'search_web',
	description: 'Search the web for news about a port.',
	category: 'ops',
	access: 'read-only',
	paths: ['*'],
	loadTier: 'T0',
	permission: 'auto',
	serverUrl: 'https://mcp.exa.ai/mcp',
	mcpToolName: 'web_search_exa',
	input: z.object({ query: z.string() }),
	output: z.string(),
});
```

`name` is your name for the tool. `mcpToolName` is the name that the server uses. The model sees only your name, your description and your schema.

### 4. Call another agent

Customs rules are long, and they belong to a different agent with its own instruction. An `agent` tool runs one turn of that agent and returns its reply.

```ts
import { registerTool } from '@theoremjs/agents';

registerTool({
	type: 'agent',
	name: 'harbor_customs',
	description: 'Ask the Harbor customs agent which documents a shipment needs.',
	category: 'ops',
	access: 'read-only',
	paths: ['*'],
	loadTier: 'T0',
	permission: 'auto',
	profile: 'harbor.customs',
});
```

The tool takes `{ text }` from the model and returns the reply of the other agent. Three rules apply to that agent:

- It is a `text`, `image` or `speech` profile that takes text.
- You register it before you register the tool.
- None of its own tools can stop for a person. Each one has `permission: 'auto'`, and none stops for a sign-in.

`maxCallsPerTurn` limits the calls to this tool in one turn of the desk. To send more than the text of the model to the other agent, set `onAgentCall` on the request.

### 5. Allow the tools

A registered tool belongs to no agent. The profile of the desk names each tool that the desk can use.

```ts frame=profile:text
tools: { allow: ['harbor_holdStatus', 'get_weather', 'search_web', 'harbor_customs'] },
```

```note
A `text`, `image`, `live` or `host` profile must set `tools`. For no tools, write `{ allow: [] }`. The model never sees a name in `allow` that has no registered tool.
```

A **built-in tool** runs at the model provider, such as its web search. Declare it in `builtInTools` on the model, not in `tools.allow` ([Binding models](/docs/models)).

### 6. Ask a person first

A shipper asks the desk to release a hold. That changes a real shipment, so a person must say yes first. Set `permission` on the tool.

```ts
import { registerTool } from '@theoremjs/agents';
import { z } from 'zod';

registerTool({
	type: 'function',
	name: 'harbor_releaseHold',
	description: 'Release the hold on a Harbor shipment.',
	category: 'ops',
	access: 'read-write',
	paths: ['*'],
	loadTier: 'T0',
	permission: 'always_confirm',
	labels: { request: 'release the hold on {shipmentId}' },
	input: z.object({ shipmentId: z.string() }),
	output: z.object({ released: z.boolean() }),
	handler: () => ({ released: true }),
});
```

- `auto` runs the tool without a question.
- `session_consent` asks one time. The approval lasts while your host sends the name of the tool in `sessionPermissions`.
- `always_confirm` asks before every call.

A call that must ask is a **gate**. The turn ends with `stop.kind` set to `gate`, and the tool does not run. Your interface shows the request and collects the answer. `labels.request` is the line that the person reads. `{shipmentId}` takes its value from the arguments.

After the answer, your server runs the call again with the answer ([Running a turn](/docs/runner), step 5). The chat component does all of this for you ([Building the interface](/docs/interface)).

Your own code can make the same decision for each call. A tool can set `preTool`, and a request can set `onStage`. Each one can refuse the call, change the arguments or ask for a yes.

### 7. Load a tool only when the turn needs it

The desk gets ten more tools for claims and refunds. Most turns use none of them, and each tool that the model sees costs tokens. Set `loadTier` to `T2` on those tools.

- `T0` loads the tool at the start of every turn.
- `T2` loads the tool on demand.

A profile has two ways to load a `T2` tool:

```ts frame=profile:text
tools: {
	allow: ['harbor_holdStatus', 'harbor_loadTools', 'harbor_refund'],
	t1Policy: ({ path }) => (path === 'claims' ? ['harbor_refund'] : []),
	t2Loader: 'harbor_loadTools',
},
```

- `t1Policy` is your function. It runs at the start of each turn and returns the `T2` tools to load now.
- `t2Loader` names a `function` tool that the model can call in the middle of a turn. The tool returns `{ loaded: [...] }` with the names to load.

A `live` or `host` profile loads every allowed tool at the start.

## Sign the user in to a tool

Harbor keeps shipments in a tracker, and each shipper has an account there. The tool must act as the shipper who asks, not as Harbor. Give the tool `auth`.

```ts
import { registerTool } from '@theoremjs/agents';
import { z } from 'zod';

registerTool({
	type: 'http',
	name: 'tracker_shipments',
	description: 'List the shipments of the signed-in shipper.',
	category: 'ops',
	access: 'read-only',
	paths: ['*'],
	loadTier: 'T0',
	permission: 'auto',
	endpoint: 'https://api.tracker.example/shipments',
	method: 'GET',
	auth: { slot: 'tracker', type: 'oauth2', service: 'Tracker', scopes: ['shipments.read'] },
	input: z.object({}),
	output: z.object({ shipments: z.array(z.string()) }),
});
```

- `slot` names where the credential of this user is kept. A request supplies the credentials in `credentials`, an object that reads and writes one slot at a time.
- `type` is `bearer`, `api_key` or `oauth2`.
- `service` is the name that the user knows the service by. The sign-in request shows it.

When the slot is empty, the call is a gate, as in step 6. The user signs in, and the call runs. If the agent can manage without the tool, set `onUnauthenticated: 'report_to_model'`. The model then reads that the user is not signed in, and the turn goes on.

Theorem never stores a credential, and a credential never belongs in the browser. `createTheoremHandler` keeps credentials in a store on your server ([Building the interface](/docs/interface)).

### The three parts of an OAuth sign-in

For `oauth2`, you need no OAuth library. The helpers come from `@theoremjs/agents/kernel`.

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
	profile: 'harbor.desk',
	name: gated.name,
	input: gated.arguments,
	snapshot: gated.snapshot,
	resume: { granted: true },
	credentials: vaultCredentials(user.id),
})) {
	send(event);
}
```

Two values are yours to supply:

- `signingSecret` is a secret of 32 bytes or more that stays on your server. Theorem encrypts the details of the sign-in with it, so you keep no session table.
- `sessionBinding` is a value tied to the browser session of the user, such as your session id. Pass the same value to both calls.

Some providers need more:

- A provider that needs a client secret takes `clientSecret` in `exchangeOAuthPkce`. Theorem sends it to the token endpoint and never puts it on the credential.
- `authorizationParams` adds the provider's own parameters to the sign-in URL.

### What the sign-in protects

Each rule below stops one known attack. You set nothing to get them.

- **The wrong session.** Theorem refuses a callback from any session except the one that started the sign-in. An attacker cannot save their own account into the session of a shipper.
- **The wrong server.** The callback must name the server that Theorem expected. Theorem sends the code only to the token endpoint that was fixed when the sign-in started.
- **The wrong destination.** Each token belongs to one service. A tool never sends the token to a URL outside that service.
- **More access than you asked for.** Theorem refuses a token that grants a scope that the sign-in did not ask for.
- **A redirect.** The requests of a sign-in never follow a redirect.
- **An echo.** Some services repeat the credential in a response. Theorem replaces it with `[omitted - credential]` before the model, the trace or the client sees it.

### When a token gets old

An OAuth token expires. Theorem refreshes a token that is within 30 seconds of its expiry, before the call. It saves the new credential to your `credentials` object first, then runs the call. Calls that find the same old token share one refresh.

If the service refuses the credential, the call is a gate again, and the user signs in again.

### Sign in from your own code

A `function` tool can take the same `auth`. Its handler then receives `ctx.signedInFetch(url, request)`. This function sends the credential to that URL only, so the handler never sees the token.

If the service refuses the credential, `signedInFetch` throws `CredentialRefusedError`, from `@theoremjs/agents/kernel`. A handler that catches its own errors must throw this one again. Theorem then starts a new sign-in.

## Read a failed call

A failed call does not end the turn. The model reads the reason, and it can try again or answer without the tool.

Your code sees the same failure as a `tool` event with `phase: 'error'`. `failure.code` holds the code, and `failure.message` holds the text that the model reads.

## Fix a failed call

Theorem sets these codes for every type of tool.

Code | Cause | Fix
--- | --- | ---
`unknown_tool` | No registered tool has this name | Register the tool, or correct the name
`not_allowed` | The tool is not in `tools.allow` of the profile | Add the name to `tools.allow`
`not_gated` | The `path` of the request is not in the `paths` of the tool | Add the path, or use `paths: ['*']`
`not_loaded` | The tool has `loadTier: 'T2'`, and nothing has loaded it in this turn | Load it with `t1Policy` or `t2Loader`, or use `T0`
`provider_native` | The tool is a built-in tool, so the model provider runs it | Do not call it with `invokeTool`
`denied` | The user said no to the approval or the sign-in | Nothing. The tool did not run
`cancelled` | The user left the approval or the sign-in without an answer | Ask again
`expired` | The sign-in link expired before the user finished | Ask the user to sign in again
`arguments_blocked` | `guardrails.detect` blocks a match in the arguments | Change the action at `tool_arguments_<kind>`, or keep that data from the model
`tainted_turn` | The turn read a remote result, and `guardrails.taint.afterRemoteRead` refuses the `access` of this tool | Change the taint setting, or the `access` of the tool
`invalid_input` | The arguments do not match `input` | Fix the schema, or the description that the model reads
`handler_error` | The handler threw an error | Fix the handler. The model reads the text of the error
`invalid_output` | The result does not match `output` | Fix the handler, or the `output` schema
`output_blocked` | `guardrails.detect` blocks a match in the result | Change the action at `tool_output_<kind>`, or return less from the tool

## Fix a failed remote call

A tool that calls a URL, an MCP server or another agent can also fail on the way there.

Code | Cause | Fix
--- | --- | ---
`network_blocked` | `guardrails.network` refuses the address | Change `guardrails.network`, or the address
`network_error` | The request did not get a response | Check that the service is up
`http_<status>` | The URL answered with a status that is not a success | Read the status, and fix the request or the service
`response_too_large` | The response is more than 4 MiB | Ask the service for less
`mcp_http_<status>` | The MCP server answered with a status that is not a success | Read the status, and check `serverUrl`
`mcp_rpc_error_<code>` | The MCP server refused the call | Check `mcpToolName` and the arguments
`mcp_tool_execution_failed` | The tool on the MCP server reported an error | Read the message. The fault is in the server's tool
`out_of_scope` | The service wants a scope that `auth.scopes` does not list | Add the scope to `auth.scopes`
`agent_failed` | The other agent gave no reply | Read the trace of that agent's turn
