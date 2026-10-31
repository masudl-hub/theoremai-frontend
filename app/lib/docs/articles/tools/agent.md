---
title: Agent Tools
updated: 2026-10-30
summary: Delegating turns to other registered agents, with input derived from the called profile and host-only channels and fields.
entry: src/kernel/tools/agent.ts
covers: src/kernel/tools/agent.ts, src/kernel/tools/types.ts, src/kernel/engine/runner/nested.ts
cover: /imagery/th30_orchards.png
coverAlt: Geometric rows of blooming orchard trees in morning light
coverPosition: 50% 50%
---

An `agent` tool runs one complete turn of another registered agent profile and returns its reply to the caller. `research.scout` has two: `record_podcast` has `research.podcast` read the findings aloud, and `draw_method` has `research.illustrator` draw a paper's method.

An agent tool needs no handler code and no schemas of your own. Theorem builds the input schema from the called profile's `inputs`, and every agent tool returns the same output shape.

## Registering an Agent Tool

Register agent tools using `registerTool()` with `type: 'agent'`:

```ts frame=tool:agent
name: 'record_podcast',
// ...
profile: 'research.podcast',
// ...
```

* **`profile`**: The ID of the agent's profile, registered before this tool.
* **`maxCallsPerTurn`**: Optional. The most calls to this tool in one turn of its caller; a whole number above 0. A call past it fails with `call_limit`. Left out, as on `record_podcast` and `draw_method`, only the caller's `maxSteps` bounds them.

## Automatic Schema Derivation

Because the called agent is already a declared profile, Theorem derives the tool's input from it:

* **Input Schema**: The tool takes `text`, plus each channel the called profile declares in `inputs`: `attachments`, `voice` and `slots`. A `speech` profile also takes `speech`. Any other field is refused, not dropped.
* **Output Schema**: The tool returns the called agent's reply: its `text`, or its `structured` reply in place of the text; `removed`, the items its item rules took out of `structured`; media as `parts`; and what it cited as `sources`. The caller's turn cites those sources too. `record_podcast` returns its audio in `parts`, and `draw_method` returns its image there.

## Architectural Delegation Rules

The kernel enforces four rules on every agent tool. Breaking the first three is a `config` error when the tool registers:

1. **Registration Order**: The called profile, and every tool it allows, must be registered before the agent tool.
2. **Modality Support**: The called profile must be a `text`, `image`, or `speech` profile that takes text. `research.pagereader` is a `decision` profile, so it is not an agent tool: it reads each page result at `post_tool` (see [Lifecycle Hooks & Interception](/docs/profiles/lifecycle)).
3. **No Gated Tools**: None of the called agent's own tools may stop on a gate, because no one can answer it there. Every tool it allows needs `permission: 'auto'`, and a tool with `auth` needs an `onUnauthenticated` policy other than `'gate'`, which is the default.
4. **Context Isolation**: The caller's `ctx.host` is not passed down. The called agent's tools read no `host` unless `onAgentCall` returns one.

## Channel & Field Governance

To control what the calling model can send, set field and channel rules on the agent tool definition:

### Reserving Channels (`hostOnly`)

If the called profile takes channels that the calling model should not fill (such as private slots or documents), list them in `hostOnly`:

```ts frame=tool:agent
// ...
hostOnly: ['slots', 'attachments'],
// ...
```

Those channels leave the calling model's input; it still sees `text` and any channel you did not reserve. Only `onAgentCall` can send the reserved ones. Naming a channel the profile does not take is a `config` error.

### Host-Only Model Fields (`hostFields`)

Declare fields that the calling model fills, but only the host reads. A field may not reuse a name the input already has (`text`, `attachments`, `voice`, `slots`, `speech`):

```ts frame=tool:agent
name: 'record_podcast',
// ...
hostFields: {
	title: z.string().describe('The title of the report to read aloud'),
},
// ...
```

The cookbook's `record_podcast` sets no host field; add this when the model should name a saved report and your code should load it. The kernel hands `title` to `onAgentCall` as `hostInput` and never sends it to the called agent. A tool with `hostFields` needs the request's `onAgentCall`; a call without it is a `config` error.

## Host Interception (`onAgentCall`)

When a model calls an agent tool, Theorem runs the request's `onAgentCall` hook before the called agent's turn. The hook receives an `AgentCall` carrying the tool name, the called profile, the calling profile, the model's input, any `hostInput` from `hostFields`, and the call's `depth`.

The hook can return nothing to run the agent on what the model sent, or return `{ refuse: string }` to fail the call with `refused_by_host` and read the text back to the calling model. To limit delegation depth, refuse based on `depth`. It can also return an `AgentCallRequest` to reshape the `input`, choose the `model` or `provider`, or set the `host` the called agent's tools read.

For complete `onAgentCall` interceptor patterns, see [Lifecycle Hooks & Interception](/docs/profiles/lifecycle).

## Related Guides

* **[Tools & Execution Pipeline](/docs/tools)**: Universal tool attributes, pipeline stages, and dynamic loading.
* **[Profiles](/docs/profiles)**: Declaring agent profiles and modality configurations.
* **[Lifecycle Hooks & Interception](/docs/profiles/lifecycle)**: Detailed `onAgentCall` hook specifications.
