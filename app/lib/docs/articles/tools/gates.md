---
title: Tool Permissions & Gates
updated: 2026-11-02
summary: Decoupling model tool calls with human confirmation gates, argument editing, and turn resumption.
entry: src/kernel/tools/permission.ts
covers: src/kernel/tools/permission.ts, src/kernel/tools/gate-answer.ts
cover: /imagery/th30_reeds.png
coverAlt: Golden marsh reeds swaying along a quiet riverbank
coverPosition: 50% 50%
---

Model tool calls are requests, not commitments. Any tool can need a person's approval first: a scout reading a page you have not checked, or a tool that writes. Theorem halts execution before the tool runs and waits for explicit approval.

A held tool call is a **gate**. The turn pauses with `stop: { kind: 'gate' }`, preserves the pending call in a `TurnToolSnapshot`, and lets your frontend present an approval prompt to the user before resuming.

```figure
{
  "kind": "lanes",
  "still": {
    "src": "/imagery/th30_corals.png",
    "position": "50% 50%"
  },
  "caption": "A call held for approval. A tool with permission auto, or a session_consent tool that sessionPermissions names, passes this gate.",
  "lanes": [
    "The model",
    "Theorem",
    "Your app"
  ],
  "steps": [
    {
      "lane": "The model",
      "label": "The model calls a tool",
      "kind": "model"
    },
    {
      "lane": "Theorem",
      "label": "Theorem holds the call",
      "kind": "guardrail"
    },
    {
      "lane": "Theorem",
      "label": "The turn finishes",
      "kind": "runner"
    },
    {
      "lane": "Your app",
      "label": "The person decides",
      "kind": "ingress"
    },
    {
      "lane": "Your app",
      "label": "You resume the call",
      "kind": "egress",
      "parts": [
        {
          "label": "granted: true"
        },
        {
          "label": "granted: false"
        }
      ]
    }
  ]
}
```

## Gate Lifecycle

A gate holds a tool call until the person answers. The model does not run while it waits:

1. **The model calls a tool**: It names the tool and its arguments.
2. **Theorem holds the call**: The tool does not run. A tool event with `phase: 'gate'` carries the tool name, the filled request text and the prepared arguments. Other calls in the step finish first.
3. **The turn finishes**: It ends with `stop.kind: 'gate'`. The done event carries `done.tools`, the turn's tool snapshot.
4. **The person decides**: Your UI shows `gate.request`, filled from the `request` template in the tool's labels, such as `read {urls.0}`.
5. **You resume the call**: You pass the snapshot and an `InvokeToolResume` to `invokeTool`.
   * **`granted: true`**: The call goes back through its checks and runs. After an edit, pass `edited` with the model's input as `from`.
   * **`granted: false`**: The call settles as `declined`, or as `cancelled` for the causes `abandoned` and `expired`.

## Permission Policies

Set `permission` on a tool definition to declare its baseline gate policy:

```ts frame=tool:mcp
name: 'read_pages',
// ...
permission: 'always_confirm', // Reads only after approval
// ...
```

* **`'auto'`**: The tool runs immediately without pausing for confirmation.
* **`'session_consent'`**: The tool pauses for confirmation on first use. Once approved, the host passes the tool ID in `sessionPermissions: ['read_pages']` on subsequent turns; while present, future calls execute without prompting.
* **`'always_confirm'`**: The tool pauses for confirmation before every single execution, regardless of session history.

## Gate Kinds

The kernel categorizes held calls into four distinct gate kinds (`ToolGateKind`):

| Gate Kind | Trigger Condition | Resumption Mechanism |
| :--- | :--- | :--- |
| **`'confirmation'`** | Tool has `permission: 'always_confirm'` or was escalated dynamically. | User confirms or denies the action. |
| **`'permission'`** | Tool has `permission: 'session_consent'` and is absent from `sessionPermissions`. | User grants session consent. |
| **`'auth'`** | Remote tool credential is missing or expired (`onUnauthenticated: 'gate'`). | User signs in via OAuth or provides credentials. |
| **`'page'`** | Tool declares `answeredBy: 'page'`. | The page runs the call and returns the result. |

While `confirmation`, `permission`, and `auth` gates pause for an explicit human decision or credential, a `page` gate is an automated execution pause: the model called an `answeredBy: 'page'` tool such as `check_device`, and the turn waits for the page to return its result.

## Resuming Held Calls (`invokeTool`)

When the user approves or rejects an action, call `invokeTool()` with the held call's name and arguments, the `done.tools` snapshot, and an `InvokeToolResume` descriptor. In these examples, `gated` holds those three.

### Approving Execution

To approve the call as proposed by the model:

```ts frame=statements
const _resumeEvents = invokeTool({
	profile: 'research.scout',
	name: gated.name,
	snapshot: gated.snapshot,
	resume: { granted: true },
	input: gated.arguments,
});
```

### Modifying Arguments Before Approval

Users can edit proposed arguments before approving (e.g., correcting a URL). Pass `resume.edited` with the original input:

```ts frame=statements
const _resumeEvents = invokeTool({
	profile: 'research.scout',
	name: gated.name,
	// ...
	resume: {
		granted: true,
		edited: { from: gated.arguments },
	},
	// User-edited argument
	input: {
		urls: ['https://arxiv.org/abs/1706.03762'],
		question: 'What does the paper claim?',
	},
});
```

The kernel re-validates the edited input against the tool's Zod schema before invoking the handler.

### Rejecting or Abandoning Calls

To decline an action, pass `granted: false`. The kernel settles the tool call as an intentional refusal, formats the explanation, and returns it to the model:

```ts frame=statements
const _refuseEvents = invokeTool({
	profile: 'research.scout',
	name: gated.name,
	input: gated.arguments,
	// ...
	resume: {
		granted: false,
		cause: 'declined', // 'declined' | 'abandoned' | 'expired'
	},
});
```

* **`'declined'`**: The user said no. The call fails with the code `denied`.
* **`'abandoned'`**: The user left without an answer. The call fails with the code `cancelled`.
* **`'expired'`**: The answer did not come in time. A sign-in fails with the code `expired`. Any other gate fails with `cancelled`. On the web handler, `gateTtlMs` sets how long a gate waits. A later answer fails with `session.gate_expired`, and the next message cancels the call. Unset, a gate waits until it is answered.

### Answering Page Gates

When a turn halts at a `page` gate, the action requires no user confirmation. The page runs the call directly (`check_device` reads whether the device has WebGPU and how much memory it has) and submits the result by calling `invokeTool()` with `page: PageAnswer`:

```ts frame=statements
const _resumeEvents = invokeTool({
	profile: 'research.scout',
	name: gated.name,
	input: gated.arguments,
	// ...
	page: {
		output: { webgpu: true, memoryGb: 16 },
	},
});
```

The `PageAnswer` payload supports three outcome variants:

* **`{ output: unknown }`**: Successful execution. The kernel validates the returned data against the tool's Zod `output` schema before serializing it for the model.
* **`{ timedOut: true }`**: The client stopped waiting for the page. The kernel settles the call with a `tool.page_timed_out` failure for the model.
* **`{ unanswered: true }`**: The client web page does not implement a handler for the tool. The kernel settles the call with a `tool.page_no_answer` failure for the model.

In live streaming sessions where an active tool execution coordinator (`ctx.pageExecution`) is mounted, the kernel dispatches the call directly across the active connection and awaits `dispatch.result` without pausing at a turn gate.

## Dynamic Gate Escalation

A tool configured with `permission: 'auto'` can escalate dynamically to require human approval based on runtime arguments or host state.

### Tool `preTool` Hook

Declare a `preTool` hook on the tool definition to inspect inputs before execution:

```text
name: 'read_pages',
// ...
permission: 'auto',

preTool: async (input) => {
	if (input.urls.some((url) => !url.startsWith('https://arxiv.org/'))) {
		return {
			confirm: { summary: `Read ${input.urls.length} pages, some outside arXiv?` },
		};
	}
},
// ...
```

### Turn `onStage` Interception

Alternatively, the host application can escalate tools dynamically during turn execution using `onStage` at the `'pre_tool'` stage (see [Lifecycle Hooks & Interception](/docs/profiles/lifecycle)):

```text
// ...
if (ctx.stage === 'pre_tool' && ctx.tool === 'search_web') {
	return { confirm: { summary: 'Search the open web for this?' } };
}
// ...
```

## Related Guides

* **[Tools & Execution Pipeline](/docs/tools)**: Declaring schemas, handlers, and core attributes.
* **[Auth & Credentials](/docs/tools/auth)**: Handling OAuth sign-in gates and `auth` credentials.
* **[Liquid Tool Labels](/docs/tools/liquid-labels)**: Formatting approval text with the `registerTool.labels.request` template.
* **[Turn Resumption & Steering](/docs/profiles/resumption)**: Continuing conversational turns after early stops.
