---
title: Host Profiles
updated: 2026-11-02
summary: A profile with your own code as the orchestrator. Your code runs registered tools through invokeTool, under the same tool checks and traces as an agent.
entry: src/kernel/tools/invoke.ts
covers: src/kernel/tools/invoke.ts, src/kernel/registry/profiles.ts
cover: /imagery/th30_lilachaze.png
coverAlt: Rolling mountain foothills under soft lilac atmospheric haze
coverPosition: 50% 50%
---

In a host profile (`type: 'host'`), your code is the orchestrator. No model picks the next step: your app names the tool and its input, and Theorem runs it under the same permissions and traces as any agent, guarded by `detect` and `network`. Use it for function, HTTP and MCP tools that your own code calls. Your code can still call a model between tools, for example with `runDecision`, because that call goes to another profile.

The research cookbook has one, `research.console`: the scout's tools, for your code to call by hand.

## Define a host profile

A host profile has six fields: `type`, `id`, `tools`, and the optional `guardrails`, `observability` and `labels`. It has no `models` and no `identity`, because the profile itself never runs a model.

```ts frame=profile:host
type: 'host',
id: 'research.console',
tools: {
	allow: [
		'read_pages',
		'export_report',
		'list_arxiv',
		// ...
	],
	parallel: true, // Add this: the calls of one invokeToolStep run side by side
},
```

* **`tools.allow`** is required. Every tool it lists can be invoked, with no visibility tiers, loading tiers or path gating. A provider's own builtin tool cannot go here, because a host profile never runs a model: registering the profile fails.
* **`tools.parallel`** applies to `invokeToolStep`. When `true`, the calls of one step run side by side. When left out or `false`, they run one at a time, in the order given.
* **`guardrails`** takes only `detect` and `network`. These are the guards that fire when a tool is invoked. `defineProfile` refuses the others (quota, canary and egress), because they guard a model turn. `detect` here can name only the tool boundaries.

## What runs when you invoke a tool

`invokeTool()` does not call the tool function directly. It sends the call through the same checks a model's call gets:

* **Allowed.** A tool that `tools.allow` does not list fails with `not_allowed`.
* **Arguments checked.** The `detect` guardrail reads the arguments at the `tool_arguments` boundary for that kind of tool. A block fails the call with `arguments_blocked`.
* **Input parsed.** The input is parsed against the tool's input schema. Input that does not fit fails the call with `invalid_input`.
* **Network checked.** HTTP and MCP calls go through the `network` guardrail. When you pass `resolveHost`, Theorem looks up each host name before it is fetched, and refuses it when any address is private or the name does not resolve. The lookup is skipped for literal addresses and where the network policy already permits private targets.
* **Credentials read when needed.** When you pass `credentials`, Theorem reads a slot from it only when a tool that signs in runs.
* **Output checked.** The `detect` guardrail reads what the tool returns at the `tool_output` boundary, and what the person is shown at `tool_shown`. A blocked output fails the call with `output_blocked`.

```figure
{
  "kind": "lanes",
  "still": {
    "src": "/imagery/th30_lapis.png",
    "position": "50% 50%"
  },
  "caption": "One invokeTool call, with the checks in the order they run for a function tool.",
  "lanes": [
    "Your code",
    "Theorem",
    "The tool"
  ],
  "steps": [
    {
      "lane": "Your code",
      "label": "You call invokeTool",
      "text": "You pass the profile, the tool's name and its input.",
      "kind": "ingress"
    },
    {
      "lane": "Theorem",
      "label": "Theorem reports the call",
      "text": "A tool event carries the call and its arguments. A request that names a callId skips this event.",
      "kind": "stream"
    },
    {
      "lane": "Theorem",
      "label": "Theorem checks the call",
      "text": "A check that needs a person holds the call: a tool event has phase gate, and the run ends with stop.kind gate.",
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
      "lane": "The tool",
      "label": "The tool runs",
      "text": "It gets the parsed input, under the network policy and with your credentials.",
      "kind": "tool"
    },
    {
      "lane": "Theorem",
      "label": "Theorem checks the result",
      "text": "A failure before the tool runs skips the output checks.",
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
      "lane": "Your code",
      "label": "You get the outcome",
      "text": "A tool event with phase complete, or an error, and then done.",
      "kind": "egress"
    }
  ]
}
```

## Invoke a tool: `invokeTool()`

`invokeTool()` returns an async generator of turn events. The call starts when you pull the first event.

This code rechecks a page. `research.console` reads the page, and your code then asks `research.pagereader` whether what came back bears on the question. The tool runs through the host profile, and the model call goes to the decision profile:

```ts frame=statements
const question = 'What datasets are evaluated?';

const events = invokeTool({
	profile: 'research.console',
	name: 'read_pages',
	input: {
		urls: ['https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2'],
		question,
	},
});

for await (const event of events) {
	if (event.type === 'tool' && event.tool.phase === 'complete') {
		const result = await runDecision(
			{
				profile: 'research.pagereader',
				state: { question, passage: String(event.tool.output) },
				questions: {
					// ...
				},
			},
			hostOptions,
		);
		console.log('Recheck:', result.answers.passage);
	}
}
```

To run several calls as one step, use `invokeToolStep({ profile, calls })`. Each entry of `calls` has a `name` and an `input`. The calls share one tool snapshot, and `tools.parallel` decides whether they run side by side.

To let a long tool go on after the invoke ends, pass your `background` service and an `execution` coordinator with `detach`. When a tool with a `background` setting hands off, you get a `tool` event with phase `background`, then `done`, and the call's later events go to your service. Without a service, every tool runs inline.

`invokeTool()` also runs tools for other profile types, for example to resume a call that a gate held during a turn. A decision or embedding profile cannot invoke tools.

### The events you get

| Event type | Payload | When |
| :--- | :--- | :--- |
| **`tool`** | `event.tool: ToolCallEvent` | First the call and its `arguments`. Then its phases: `running`, `progress` while it runs, then `complete` with the `output`, `gate` when a confirmation, permission or sign-in holds the call, `background` when the call goes on after the invoke, or `error` with the `failure`. |
| **`guardrail`** | `event.guardrail: GuardrailEvent` | A guardrail flagged or blocked something at a tool boundary or on the network. |
| **`done`** | `event.stop: TurnStop` | Always last. `stop.kind` is `completed`, or `gate` when a gate held the call. |
| **`error`** | `event.errorKind: ErrorKind`, `event.error?: string` | The invoke threw outside the call itself. A tool that fails reports it as a `tool` event with phase `error`, not here. |

## Related Guides

* **[Profiles](/docs/profiles)**: Profile identity, inputs and the registry.
* **[Defining Tools](/docs/tools)**: Input schemas, credentials and handlers for tools.
* **[MCP & Remote Tools](/docs/tools/mcp)**: Connecting MCP servers and remote HTTP tools.
