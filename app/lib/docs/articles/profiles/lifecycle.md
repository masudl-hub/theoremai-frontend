---
title: Lifecycle Hooks
updated: 2026-11-13
summary: Observing and intercepting turn stages, gate approvals, and sub-agent invocations.
entry: src/kernel/engine/runner/mod.ts
covers: src/kernel/engine/runner, src/kernel/registry/profiles.ts
cover: /imagery/th30_tidalpools.png
coverAlt: Circular tidal pools carved into rocky ocean shoreline
coverPosition: 50% 50%
---

Large language models predict next tokens and generate tool calls, but they operate without awareness of host process boundaries, enterprise security policies, or out-of-band audit requirements. Placing security and telemetry checks inside model system prompts is fragile and consumes valuable token budget.

Theorem provides two deterministic interception hooks that execute in the host environment outside the model's token context:
* **`onStage`**: Observes turn milestones and applies host directives (denying tools, mutating inputs, requiring confirmation, or injecting messages).
* **`onAgentCall`**: Intercepts, shapes, or refuses delegations when an agent invokes a nested sub-agent tool.

To read a turn's raw events instead, use `onEvent`, at the end of this page.

## Stage Interception (`onStage`)

Pass an `onStage` callback to `runTurn()` or `runSession()` to intercept execution at defined lifecycle milestones:

```ts frame=statements
const events = runTurn({
	profile: 'research.scout',
	// ...
	onStage: (ctx) => {
		if (ctx.stage === 'pre_tool' && ctx.tool === 'ask_repo_docs') {
			return { deny: { code: 'FORBIDDEN', message: 'Read the primary source, not DeepWiki.' } };
		}
		return undefined;
	},
});
```

### Lifecycle Stages & Affordances

A turn moves through up to five lifecycle stages in sequence. The handler receives a `StageContext` and can return a `StageResult` containing permitted affordances for that milestone:

| Stage | Trigger & Context | Permitted Affordances (`StageResult`) |
| :--- | :--- | :--- |
| **`'pre_turn'`** | Fires before dispatching input to the provider. `ctx.history` contains existing messages. | `inject`, `abort` |
| **`'pre_tool'`** | Fires after the model requests tools, before handlers execute. `ctx.stepCalls` lists all calls in the step. | `abort`, `deny`, `confirm`, `mutate`, `waitFor` |
| **`'post_tool'`** | Fires after a tool settles or fails. `ctx.outputRaw`, `ctx.outputForModel` (the output without the fields the model does not read), `ctx.outputModel`, and `ctx.failure` are populated. | `inject`, `abort`, `deny`, `mutate`, `labelFailed`, `end` |
| **`'before_end'`** | Fires after final reply generation, before guardrail verdict and history commit. `ctx.reply` contains the draft answer. In a Live session it fires after the guardrail verdict, when the cycle ends, and `ctx.reply` is not set. | `inject`, `abort` |
| **`'post_turn'`** | Fires after `done`, once generation, tool loops, and cleanup finish. `ctx.stop` says how the turn ended. | *(None — read-only telemetry)* |

When a tool call goes on after its reply, `post_tool` fires when the call settles, after the turn has ended. No turn is open then, so an `inject` or `abort` it returns is dropped.

### Refusing a Call (`deny`)

`deny` turns a call into a failure the model reads. At `pre_tool` the tool never runs. At `post_tool` the failure replaces what the tool returned, for example when the tool answered but your own step after it failed. The failure's kind is `blocked`. Left out, `code` is `not_authorized`.

Give `details`, a JSON object, when the model needs more than the message. They become the failure's details. The guardrails read them first, then the model reads them. Details that are not a JSON object are dropped with a `deny_invalid` warning, and the call is still refused.

```ts
import type { StageHandler } from '@theoremjs/agents';

declare function keepPages(output: unknown): Promise<{ kept: boolean; retryId: string }>;

export const onStage: StageHandler = async (ctx) => {
	if (ctx.stage === 'post_tool' && ctx.tool === 'read_pages' && !ctx.failure) {
		const copy = await keepPages(ctx.outputRaw);
		if (!copy.kept) {
			return {
				deny: {
					code: 'not_kept',
					message: 'The pages were read, but no copy was kept.',
					details: { retryId: copy.retryId },
				},
			};
		}
	}
	return undefined;
};
```

To keep a failed call's failure and only give it new details, return `mutate: { details }` at `post_tool` instead. The code, kind and message stay. The details must be a JSON object. `{ details }` on a call that completed, `{ output }` on one that failed, or any other shape changes nothing, with a `mutate_invalid` warning.

### Ending the Turn After a Call (`end`)

Return `end: true` at `post_tool` on a text turn when the call is the last thing the turn needs to do. Every call of the step settles, then the turn ends as `completed` with the reply the model wrote before its calls, which can be empty. The model takes no further step, and `before_end` does not run. The reply still passes its checks, and a refused reply is retried like any other. To stop with `cancelled` instead, return `abort`.

```ts frame=statements
import type { StageHandler } from '@theoremjs/agents';

const onStage: StageHandler = (ctx) => {
	if (ctx.stage === 'post_tool' && ctx.tool === 'export_report' && !ctx.failure) {
		return { end: true };
	}
	return undefined;
};
```

### Tools an Inject Brings (`promote`)

An `inject` that asks the model to use a tool can bring that tool with it. Return `promote`, a list of tool ids, beside the `inject`. When the inject lands, each `T2` tool among the turn's gated tools goes on the model's list, as from `tools.t1Policy`. Any other id is left out. A `promote` that is not a list of ids, or one without an `inject`, warns `inject_promote_invalid`.

### Tool Gate Escalation (`confirm`)

At `pre_tool`, a stage handler can ask for a confirmation gate on a call. Pass the handler as `onStage` on the turn:

```ts frame=statements
import type { StageHandler } from '@theoremjs/agents';

const onStage: StageHandler = (ctx) => {
	if (ctx.stage === 'pre_tool' && ctx.tool === 'read_pages') {
		const urls = (ctx.input as { urls?: string[] } | undefined)?.urls ?? [];
		if (urls.some((url) => !url.startsWith('https://arxiv.org/'))) {
			return { confirm: { summary: `Read ${urls.length} pages, some outside arXiv?` } };
		}
	}
	return undefined;
};
```

When returned, the call is held. The turn ends with `stop: { kind: 'gate' }`, and `done.tools` carries the tool snapshot that `invokeTool()` resumes from.

### Parallel Tool Coordination (`waitFor`)

When a model requests several tools in one step, `ctx.stepCalls` lists every call in the step, in the order the model made them. To make one call wait for others, return `waitFor` with their call ids:

```ts frame=statements
import type { StageHandler } from '@theoremjs/agents';

const onStage: StageHandler = (ctx) => {
	if (ctx.stage === 'pre_tool' && ctx.tool === 'read_readme') {
		const searchCalls = (ctx.stepCalls ?? [])
			.filter((call) => call.tool === 'search_github')
			.map((call) => call.callId);
		if (searchCalls.length > 0) return { waitFor: searchCalls };
	}
	return undefined;
};
```

The body of `read_readme` starts only after those search calls settle. A call held for confirmation is held at once and does not wait.

`waitFor` is your code's answer at a stage. A tool can also let the model set the order. A tool registered with `after: true` gets an `after` field in its input: a list of tool names in the same step that must settle first. The scout's `read_pages`, `read_model_card`, `read_dataset_card`, `read_readme` and `read_library_docs` set it. Theorem turns each name into that tool's other calls in the step, waits for them as for `waitFor`, and takes `after` out of the input before the body runs. A name with no call in the step fails the call with `wait_unknown`. Outside a step, as in a live session, `after` waits on nothing.

## Sub-Agent Interception (`onAgentCall`)

An agent tool (`type: 'agent'`) delegates a subtask to another registered profile. When an agent's model requests an agent tool, Theorem invokes `onAgentCall` before dispatching the child turn.

The host hook receives an `AgentCall` descriptor:
* **`tool`**: Name of the agent tool being invoked.
* **`profile`**: Target profile ID configured to run the sub-agent.
* **`caller`**: Profile ID of the agent making the request.
* **`depth`**: Nesting depth (starts at `1` for direct child agents).
* **`input`**: Model-generated arguments destined for the sub-agent.
* **`hostInput`**: Model-generated values for tool `hostFields`. These fields are consumed only by `onAgentCall` and are stripped before child agent dispatch.

### Refusing or Reshaping Child Turns

The hook returns one of three outcomes:
1. **`undefined`**: Executes the child agent turn with the caller's arguments as-is.
2. **`{ refuse: string }`**: Rejects the delegation. Theorem returns the refusal message to the calling model as a tool error.
3. **`AgentCallRequest`**: Reshapes the child invocation—overriding inputs, swapping models, attaching isolated stage handlers, or setting the `host` value the child's tools read.

The caller's `host`, path and options are not passed down. Return `host` for the value the child's tools read, `path` for the path its turn runs on, and `options` to fill the child profile's own `identity.options` for its `when` lines. Without `path`, the child's turn gets only the tools on every path (`'*'`). Without `options`, no `when … is …:` line of the child fits.

```ts frame=statements
const events = runTurn({
	profile: 'research.scout',
	// ...
	onAgentCall: (call) => {
		// Prevent unbounded sub-agent recursion
		if (call.depth > 2) {
			return { refuse: 'Sub-agent recursion depth exceeded.' };
		}

		// Give the child turn's tools their own host context
		return {
			host: { tenantId: 'tenant-lab-01' },
			metadata: { parentCallId: call.callId },
		};
	},
});
```

## Reading Each Event (`onEvent`)

`onEvent` hears each of a turn's events as it leaves `runTurn()`, before your loop gets it. Use it to save a turn someone else runs, such as one `createTheoremHandler` or Studio runs, by setting it in `TurnWiring.prepare`. Stage handlers cannot do this: `post_turn` carries no reply, and the reply at `before_end` has not passed the guardrails.

```ts frame=statements
const seen: unknown[] = [];

const events = runTurn({
	profile: 'research.scout',
	// ...
	onEvent: async (event) => {
		seen.push(event);
		if (event.type === 'done') await saveSessionHistory(sessionId, seen);
	},
});
```

* The turn waits for your handler. A throw does not end the turn: the caller still gets the event, then a `hook_failed` event, which `onEvent` does not read.
* Only `runTurn()` calls it. `invokeTool()` and `runSession()` do not.
* `prepare` also gets a turn for a held call that goes on once answered, with `answersHeldCall` set. No model runs and `input` is the paused turn's, so do not read it as a new message.

## When Your Code Throws (`hook_failed`)

Your code that throws never ends a turn. Only a failed model call does. Theorem reports each throw once, as a `hook_failed` event with the `hook` that threw, the `stage` for `onStage` and `lateResults`, the `callId` when it ran for a call, and the `errorKind`. `errorInternal` holds the thrown reason for your logs, and `forClient` takes it out. The model and the person read the profile's wording, never your error.

| Your code | What a throw does | Reported as |
| --- | --- | --- |
| `onStage` at `pre_tool`, a tool's `preTool`, `onAgentCall` | The call fails without running: it cannot run unapproved. No later handler runs. | `hook_failed` with the call's `callId`. The call's `tool` event has `failure.code: 'hook_failed'`, which the model reads. |
| `onStage` at another stage | That handler applies nothing. | `hook_failed`, `hook: 'onStage'` |
| `lateResults` | Nothing lands at that moment. The source is asked again at the next one. | `hook_failed`, `hook: 'lateResults'` |
| `onEvent` | The caller still gets the event. | `hook_failed`, `hook: 'onEvent'`, which `onEvent` does not read |
| `execution` `lookup` or `begin` | The call fails without running. | `hook_failed`, `hook: 'execution'`, and the failed call as above |
| `execution` `settle`, `detach` or `markUncertain`, after the call ran | The model reads the real result, and the call is marked uncertain. | `hook_failed`, `hook: 'execution'` |
| `tools.t1Policy` | No T2 tool loads at the start. | `hook_failed`, `hook: 'tools.t1Policy'` |
| An `outputs.validation` field or item check | The value fails, or the item is refused. | `hook_failed`, `hook: 'outputs.validation'` |
| `compaction.trigger` | `compactAt` and `maxTokens` decide. | `hook_failed`, `hook: 'compaction.trigger'` |
| The store, after the reply of a call that goes on | The call goes on and settles. | `hook_failed` with the call's `callId`, through `background` `event` |
| `background` `event` itself | The call goes on and settles. | A `theorem.hook_failed` event on the call's own trace only |

A `TheoremError` from `execution` `lookup` or `begin` is the store's answer, not a crash: a held call or a full session still ends the turn. To give the model your own words for a call you stop, catch the error and return `deny` from `onStage`, or `refuse` from `onAgentCall`.

## Related Guides

* **[Turn Resumption & Steering](/docs/profiles/resumption)**: Handling tool gates, `continueFrom` executions, and `allowSteering` settings.
* **[Defining Tools](/docs/tools)**: Declaring function, MCP, HTTP, and agent tools.
* **[Host Profiles](/docs/profiles/host)**: Running tools from your own code using `invokeTool()`.
* **[Guardrails & Sanitize](/docs/guardrails)**: Declarative boundary filters applied before and after generation.
