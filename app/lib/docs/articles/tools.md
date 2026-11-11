---
title: Tools & Execution Pipeline
updated: 2026-11-02
summary: Give an agent tools that run custom code, call REST APIs, query MCP servers, or delegate to sub-agents.
entry: src/kernel/tools/mod.ts
covers: src/kernel/tools, src/kernel/auth
cover: /imagery/th30_lichentundra.png
coverAlt: Aerial pattern of arctic lichen tundra
coverPosition: 0% 50%
suggest: 5
---

A tool is code or an external capability that a model can request Theorem to execute. You register tools once in your application scope, then name them in each profile that is permitted to invoke them.

Theorem routes every tool call through the same checks before its result reaches the model.

```figure
{
  "kind": "sequence",
  "still": {
    "src": "/imagery/th30_autumnmoss.png",
    "position": "30% 40%"
  },
  "caption": "The order for a function tool. HTTP and MCP tools check their network address just before they send.",
  "steps": [
    {
      "label": "The model asks for a tool",
      "kind": "model"
    },
    {
      "label": "Theorem checks the call",
      "kind": "guardrail",
      "parts": [
        {
          "label": "tools.allow"
        },
        {
          "label": "tool_arguments"
        },
        {
          "label": "Taint"
        },
        {
          "label": "Destination"
        },
        {
          "label": "Input schema"
        },
        {
          "label": "Permission"
        },
        {
          "label": "Sign-in"
        },
        {
          "label": "pre_tool"
        }
      ]
    },
    {
      "label": "The tool runs",
      "kind": "tool"
    },
    {
      "label": "Theorem checks the result",
      "kind": "guardrail",
      "parts": [
        {
          "label": "Output schema"
        },
        {
          "label": "tool_output"
        },
        {
          "label": "post_tool"
        },
        {
          "label": "tool_shown"
        }
      ]
    },
    {
      "label": "The model reads the result",
      "kind": "model"
    }
  ]
}
```

## Tool Execution Pipeline

When a model asks for a tool, Theorem runs the call through these checks, in this order:

1. **The model asks for a tool**: Theorem holds the call until the model's stream ends.
2. **Theorem checks the call**: A failed check fails the call before the tool runs.
   * **`tools.allow`**: The profile must list the tool.
   * **`tool_arguments`**: Detectors read the arguments.
   * **Taint**: A tainted turn can refuse the call.
   * **Destination**: Theorem checks where the arguments point.
   * **Input schema**: The arguments must fit the tool's input Zod schema.
   * **Permission**: A tool that needs approval holds the call, and the turn stops with `stop.kind: 'gate'`.
   * **Sign-in**: A tool that signs in gets its credential.
   * **`pre_tool`**: Your hook can stop the call.
3. **The tool runs**: A function, http, mcp or agent tool. A built-in tool never gets here: the provider runs it.
4. **Theorem checks the result**: What the model and the person see has passed these checks.
   * **Output schema**: The result must fit the tool's output Zod schema.
   * **`tool_output`**: Detectors read what the tool returned.
   * **`post_tool`**: Your hook sees the result.
   * **`tool_shown`**: Detectors read what the call shows the person.
5. **The model reads the result**: The result reaches the model in the next step.

## Tool Types Taxonomy

Theorem categorizes tools into five distinct execution types:

| Type | Execution Host | Typical Use Case | Guide |
| :--- | :--- | :--- | :--- |
| **`builtin`** | Provider | Native capabilities like Google Search or code execution. Declared in model `builtInTools`. | [Model Bindings](/docs/profiles/bindings) |
| **`function`** | Host Process or Browser | Custom TypeScript/JavaScript logic (`handler`), such as `export_report`, or tools the page answers (`answeredBy: 'page'`), such as `check_device`. | [Function Tools](/docs/tools/function) |
| **`http`** | Kernel HTTP Client | Direct REST API calls, such as `list_arxiv`, with URL parameter mapping, rate limiting, and size caps. | [HTTP Tools](/docs/tools/http) |
| **`mcp`** | Remote MCP Server | Tools on external servers conforming to the Model Context Protocol, such as `read_pages`, with automatic session pooling. | [MCP Tools](/docs/tools/mcp) |
| **`agent`** | Kernel Runner | Delegating a task to another registered agent profile (`text`, `image`, or `speech`), such as `record_podcast`. | [Agent Tools](/docs/tools/agent) |

## Core Tool Attributes

Every custom tool registered with `registerTool` declares metadata that governs how the kernel classifies, routes, and protects the capability. `registerTool` throws a `config` error on a setting the tool does not take, and on a value of the wrong kind or outside a field's options, such as `access: 'read'`. `assertToolSettings(def)` makes the same checks without registering the tool.

* **`access`**: `'read-only'`, `'read-write'`, or `'destructive'`:
  * `'read-only'`: Only reads. An `http` tool with this access is sent again when the service is busy or briefly down.
  * `'read-write'`: Changes external state, as `export_report` does. A write is never sent twice.
  * `'destructive'`: Deletes data or performs irreversible actions. `guardrails.taint.afterRemoteRead` can refuse these calls after a turn reads a remote result.
* **`permission`**: `'auto'`, `'session_consent'`, or `'always_confirm'`:
  * `'auto'`: Executes without human intervention.
  * `'session_consent'`: Asks once. The approval lasts as long as the host passes the tool name back in `sessionPermissions`.
  * `'always_confirm'`: Demands explicit human approval before every execution (see [Tool Permissions & Gates](/docs/tools/gates)).
* **`loadTier`**: `'T0'` or `'T2'`:
  * `'T0'`: Core tools loaded into model prompt context at the start of every turn.
  * `'T2'`: On-demand tools loaded selectively at turn start via `tools.t1Policy` or mid-turn via a `tools.t2Loader` tool.
* **`paths`**: String array restricting tool availability to specific turn paths (e.g., `['code']`). Use `['*']` to make the tool available on all paths. When a turn specifies `runTurn({ path: 'code' })`, only tools whose `paths` include `'code'` or `'*'` are offered to the model.
* **`category`**: A label for grouping tools. Nothing reads it yet.
* **`after`**: `true` lets the model order its calls in a step. The tool's input gains an `after` field, a list of tool names called in the same step that must settle before this call starts. The kernel removes the field before the tool, the stages or a gate read the input. A name with no other call in the step fails the call with `wait_unknown`. Outside a step, as in a live session, `after` waits on nothing. `registerTool` refuses `after` on a tool whose input already has a field of that name, or whose input is not an object or a union of objects. The cookbook sets it on `read_pages`, `read_model_card`, `read_dataset_card`, `read_readme` and `read_library_docs`. For an order your own code decides, return `waitFor` at `pre_tool` (see [Lifecycle Hooks & Interception](/docs/profiles/lifecycle)).
* **`background`**: `'never'`, `'always'`, `{ afterMs }` or `'ask'`: when the model gets its reply, so a slow tool can finish after its turn (see [Finish a Call After Its Turn](#finish-a-call-after-its-turn)).

## Direct Tool Execution (`runTool` vs `invokeTool`)

Theorem exposes two programmatic entry points for executing registered tools outside an active model turn:

* **`invokeTool(request)`**: Returns an async generator of `TurnEvent`s: the lifecycle events (start, progress, completion, citations) as the tool executes. Ideal for streaming progress to user interfaces or resuming held tool gates. It also takes the controls every run takes, such as `signal`, `metadata`, `traceparent` and `projectId`. The trace records `projectId`.
* **`runTool(request)`**: A Promise-based alternative that resolves to a `ToolCallResult` when the call settles: it completed, a gate held it, it failed, or it went on in the background. Ideal for backend batch operations and headless integrations.

## Dynamic Tool Loading & Profile Binding

A registered tool belongs to no profile until allowed. Profiles declare allowed tools and configure on-demand loading policies in the profile's `tools` block:

```ts frame=profile:text
tools: {
	allow: ['search_github', 'read_readme', 'load_tools', 'ask_repo_docs'],

	// Evaluate at turn start: load code tools only on the code path
	t1Policy: ({ path }) => (path === 'code' ? ['ask_repo_docs'] : []),

	// Tool the model can call mid-turn to load additional T2 tools on demand
	t2Loader: 'load_tools',
},
```

* **`allow`**: The complete list of tool IDs permitted for this profile. For zero tools, write `{ allow: [] }`.
* **`t1Policy`**: A host function called at the start of every turn. It receives `ToolLoadContext` (`path`, `input`, `host`) and returns an array of `T2` tool names to load for this turn. Only `text` and `image` profiles run it. You can import your own routing logic here—such as rule-based heuristics, keyword matching, or embedding similarity search.
* **`t2Loader`**: Names a function tool the model can call mid-turn when its current toolset is insufficient. The loader tool executes host search logic and returns `{ loaded: [...] }` with the newly loaded tool names.

Live and host profiles ignore `loadTier` and load all allowed tools at turn start.

## Finish a Call After Its Turn

A slow tool can give the model a reply now and finish later, so the turn does not wait for it. The model reads that the call has started and that it has no result yet. The call's end reaches your host alone. The model reads it on a later turn, in `input.lateResults`. `createTheoremHandler` passes it for you, and wakes the chat when it is due.

Set `background` on the tool. The cookbook sets it on no tool. Add this when the model should choose whether `record_podcast` finishes after the turn:

```ts frame=tool:agent
name: 'record_podcast',
// ...
background: 'ask',
// ...
```

| Value | When the model gets its reply |
| :--- | :--- |
| `'never'` | When the call ends. This is the default. |
| `'always'` | When the call has passed its gates and `pre_tool`. |
| `{ afterMs }` | That many milliseconds after the call has passed them, if it has not ended. |
| `'ask'` | The tool's input gains a `background` field. If the model sets it to `true`, as with `'always'`. If not, as with `'never'`. |

Then pass a background service and a coordinator on the request. `runTurn`, `runSession`, `invokeTool` and `runTool` all take them. Without a service, every tool runs inline and the model does not see the `background` field.

```ts frame=request
execution: createMemoryToolExecution(),
background: {
	detached: (call) => void call.done.then(() => send({ finished: call.toolId })),
	event: (event) => send(event),
},
// ...
```

* **`execution`**: Keeps the reply and the call's end. It must have `detach`, or the run fails with a `config` error. `createMemoryToolExecution()` has it, and keeps them in memory.
* **`detached`**: Runs once for each call that goes on. `call` holds the `operationId`, `callId` and `toolId`, with `stop` and `done`.
* **`event`**: Receives each later event of the call, up to the `tool` event that ends it. A shutdown sends no such event. A failure here does not change how the call ends.

The model reads the `tool.background_started` label. It says not to state a result and not to call the tool again. The call's `tool` event has `phase: 'background'`.

After the reply, the turn's signal no longer reaches the call, so the end of the turn does not stop it. `call.stop(reason)` does: the call settles as a `cancelled` failure with `reason` as its `code`. With no reason, the stop is a shutdown, and the call ends `execution_interrupted`. With `{ graceMs }`, a handler that ignores `ctx.signal` past that time settles anyway. `call.done` resolves when the call has ended.

No turn is open after the reply. An `inject` or `abort` from `post_tool` reaches nothing, and a call that asks the user a question fails with `awaiting_after_reply`.

Theorem refuses `background` with a `config` error on:

* A tool with `answeredBy: 'page'`.
* A value that is not `'never'`, `'always'`, `'ask'` or `{ afterMs }`.
* An `afterMs` that is below 0 or is not a finite number.
* An `'ask'` tool whose input already has a `background` field, or whose input is not an object or a union of objects.
* The tool that a profile names as `tools.t2Loader`, when a turn starts.

## Fix a failed call

A failed call settles with a `code` and a message. Theorem sets these codes for every type of tool.

| Code | Cause | Fix |
| :--- | :--- | :--- |
| `unknown_tool` | No registered tool has this name | Register the tool, or correct the name |
| `not_allowed` | The tool is not in `tools.allow` of the profile | Add the name to `tools.allow` |
| `not_gated` | The `path` of the turn is not in the `paths` of the tool | Add the path, or use `paths: ['*']` |
| `not_loaded` | The tool has `loadTier: 'T2'` and nothing loaded it in this turn, or a built-in tool is not on for this model | Load it with `t1Policy` or `t2Loader`, use `T0`, or add the built-in tool to `builtInTools` |
| `provider_native` | The tool is a built-in tool, so the model provider runs it | Do not call it with `invokeTool` |
| `denied` | The user said no to the approval or the sign-in | Nothing. The tool did not run |
| `cancelled` | The approval or the sign-in was left without an answer | Ask again |
| `expired` | The sign-in link expired before the user finished | Ask the user to sign in again |
| `arguments_blocked` | `guardrails.detect` blocks a match in the arguments | Change the action at `tool_arguments_<kind>`, or keep that data from the model |
| `tainted_turn` | The turn read a remote result, and `guardrails.taint.afterRemoteRead` refuses the `access` of this tool | Change the taint setting, or the `access` of the tool |
| `remote_destination` | The arguments name an address that only a remote result mentioned, and `guardrails.taint.remoteDestination` is `block` | Change that setting, or have the user give the address |
| `invalid_input` | The arguments do not match `input` | Fix the schema, or the description that the model reads |
| `handler_error` | The handler threw an error | Fix the handler. The model reads the text of the error |
| `network_blocked` | `guardrails.network` refuses the address | Change `guardrails.network`, or the address |
| `invalid_output` | The result does not match `output`, the handler returned nothing, or a `t2Loader` result has the wrong shape | Fix the handler, or the `output` schema |
| `output_blocked` | `guardrails.detect` blocks a match in the result | Change the action at `tool_output_<kind>`, or return less from the tool |
| `awaiting_after_reply` | A call that went on after its reply asked the user a question, and no turn is open to answer it | Have the tool finish without asking, or keep it in the turn |
| `run_failed` | A call that went on after its reply threw before it settled | Read the message. It says what threw |
| `result_too_large` | The result is larger than the coordinator's `maxOutcomeBytes` | Return less from the tool, or raise that limit |

`tainted_turn` never stops a `read-only` tool. With `afterRemoteRead: 'write'`, it stops `read-write` and `destructive` tools. With `'destructive'`, it stops `destructive` tools only.

A call that waits fails in two more ways. `wait_unknown` means `after` or `waitFor` names a call that is not in the step. `wait_cycle` means the call waits for a call that cannot finish before it.

## Tool Types In Detail

* **[Function Tools](/docs/tools/function)**: Local JavaScript/TypeScript handlers, streaming generators, browser UI tools (`answeredBy: 'page'`), `ToolContext`, grounding citations (`sources`), and `uncheckedOutput`.
* **[HTTP Tools](/docs/tools/http)**: Declarative REST endpoints, URL mapping (`pathParams`, `queryParams`, `bodyParam`), rate limits, timeout controls, and multimodal image extraction (`images`).
* **[MCP Tools](/docs/tools/mcp)**: Model Context Protocol integration, server endpoints, and native MCP session pooling (`session.idleMs`, `session.max`, LRU eviction, parallel open deduplication).
* **[Agent Tools](/docs/tools/agent)**: Delegating to registered agent profiles, input/output schema derivation, `maxCallsPerTurn`, isolation, and `onAgentCall` interception.

## Related Guides

* **[Tool Permissions & Gates](/docs/tools/gates)**: Configuring `session_consent`, `always_confirm`, and approval lifecycles.
* **[Auth & Credentials](/docs/tools/auth)**: Authenticating tools via OAuth, API keys, and `signedInFetch`.
* **[Liquid Tool Labels](/docs/tools/liquid-labels)**: Dynamic transcript activity labels with conditional formatting.
