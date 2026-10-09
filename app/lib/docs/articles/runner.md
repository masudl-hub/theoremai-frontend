---
title: Running a turn
updated: 2026-10-09
summary: Resolve a registered model, run the profile, save history, and resume a paused tool.
entry: src/kernel/engine/runner/mod.ts
covers: src/kernel/engine/runner, src/kernel/engine/decision.ts, src/kernel/engine/session, src/kernel/tools/invoke.ts, src/kernel/stages.ts
cover: /imagery/th30_poppies.png
coverAlt: A field of poppies
coverPosition: 0% 8%
suggest: 3
---

Run the agent that the profile describes. One call runs one turn, and you read the reply as a stream of events.

## The idea

A profile describes an agent. A **runner** function runs it. Each type of profile has one function ([Choosing a modality](/docs/modalities)):

- `runTurn` runs one turn of a `text`, `image` or `speech` profile.
- `runSession` opens a call on a `live` profile.
- `runDecision` asks a `decision` profile its questions.
- `invokeTool` runs one tool of a `host` profile. It also resumes a tool that a gate paused.

Each model runner resolves the registered provider from the selected binding ([Binding models](/docs/models)).
The host options supply credentials and optional transport functions. The profile contains no executable adapter.

A turn can include several model steps. The model requests a tool, reads its result, and produces another response.
Theorem reports these operations as **events**. Your code can act at five fixed **stages**.

```figure
{
	"kind": "sequence",
	"still": {
		"src": "/imagery/th30_poppies.png",
		"position": "40% 50%"
	},
	"caption": "The five stages of one runTurn call, in order. The events arrive between them.",
	"steps": [
		{
			"label": "pre_turn",
			"text": "Your code can inject or abort. Then the model writes, and you receive text, thought, structured and media events."
		},
		{
			"label": "pre_tool",
			"text": "Your code can abort, deny, confirm or mutate. Then the tool runs, and you receive a tool event."
		},
		{
			"label": "post_tool",
			"text": "Your code can inject, abort, deny or mutate."
		},
		{
			"label": "before_end",
			"text": "Your code can inject or abort."
		},
		{
			"label": "post_turn",
			"text": "Your code observes the completed turn. The done event already reported stop.kind."
		}
	]
}
```

## Run the Harbor desk

These five steps run the Harbor front desk, keep a chat, and pause before a tool that takes a payment.

### 1. Run a turn

Pass the request first and host options second.
The vault fills credential slots selected by the binding or provider definition.
Optional `fetch`, `wait`, and `openWebSocket` functions let the host supply transport utilities.

The request needs `profile`, the id of a registered profile. Add `input` for a user turn ([Declaring inputs](/docs/inputs)). The optional third argument is a trace sink ([Recording traces](/docs/traces)).

```ts
import { runTurn } from '@theoremjs/agents';

const vault = { openrouter: process.env.OPENROUTER_API_KEY };

for await (const event of runTurn(
	{ profile: profile.id, input: { text: 'Where is hold H-2291?' } },
	{ vault },
)) {
	if (event.type === 'text') console.log(event.text);
}
```

### 2. Continue a chat

Store portable conversation history in your application.
To continue, send previous messages in `input.history` and the new message in `input.text`.
If completion returns `providerState`, save that checkpoint beside the history. Send it on the next request too.

```ts frame=statements
runTurn(
	{
		profile: 'harbor.desk',
		input: {
			history: [
				{ role: 'user', content: 'Where do I find hold H-2291?' },
				{ role: 'assistant', content: 'It is at bay 4.' },
			],
			text: 'When does bay 4 close?',
		},
	},
	hostOptions,
)
```

Each message has a `role` (`user`, `assistant`, `system` or `tool`) and its `content`.

The checkpoint contains native state for the adapter. Portable history remains necessary for recovery.
The kernel checks provider identity, model identity, deployment, state version, and the covered history prefix.
On a mismatch, it rebuilds from portable history and emits `provider_warning` by default.
Set `providerContinuation: { onMismatch: 'error' }` to reject the mismatch instead.
Google persistence uses this same checkpoint boundary ([Binding models](/docs/models)).

### 3. Read the stream

Read the event stream to completion. An `error` event can precede terminal `done` status.

- Model output arrives as `text`, `thought`, structured data or media.
- The `tool`, `stage` and `guardrail` events arrive as they fire.
- `done` reports completion status. Its `stop.kind` is `completed` for a normal finish.
- The `post_turn` stage follows completion. Continue reading the stream for that stage.

A `done` with `length`, `stream_incomplete` or `provider_error` can continue ([Setting turn behaviour](/docs/turn-behaviour)).

A `guardrail` event reports a policy decision. It is not a stage result ([Setting guardrails](/docs/guardrails)).

### 4. Act at a stage

The desk can take a payment for a release fee. A person must approve the payment first. Pass `onStage` to run your code at a stage of the turn.

```ts frame=request
onStage: (ctx) => {
	if (ctx.stage === 'pre_tool' && ctx.tool === 'payments.charge') {
		return { confirm: true };
	}
},
```

Return nothing to observe. Return a result to act. Each stage allows only some results.

Stage | Results that it allows
--- | ---
`pre_turn` | inject, abort
`pre_tool` | abort, deny, confirm, mutate
`post_tool` | inject, abort, deny, mutate
`before_end` | inject, abort
`post_turn` | none

- A `confirm` on `pre_tool` opens a **gate**. A gate pauses the tool until a person decides.
- A `mutate` replaces the tool input or output. Theorem validates the new value again.
- Set `injectId` to name an inject on the `stage` event.

### 5. Resume a gate

A gate is not a type of event. The `tool` event shows phase `gate`. Then `done` arrives with `stop.kind` set to `gate`. The turn is over, and the tool waits.

Resume with `invokeTool`. Pass the tool name, the input, the `callId` of the turn and `resume`. Set `resume.granted` to `true` to approve, or to `false` to refuse.

```ts frame=statements
for await (const event of invokeTool({
	profile: profile.id,
	name: 'payments.charge',
	callId,
	input,
	resume: { granted: true },
})) {
	if (event.type === 'done') break;
}
```

[Building the interface](/docs/interface) shows how a page answers a gate over HTTP.

## Set more on the request

A request can carry more than `profile` and `input`.

- `model`, `effort` and `system` change the model call ([Binding models](/docs/models), [Setting the identity](/docs/identity)).
- `continueFrom` and `continuation` make the turn a continue ([Setting turn behaviour](/docs/turn-behaviour)).
- `host` passes your own context to the tool handlers. Theorem does not read it.
- `credentials` gives authenticated HTTP and MCP tools their credentials ([Registering tools](/docs/tools)).
- `resolveHost` resolves the host names of remote tools before each request.
- `signal` cancels the turn.
- `traceparent` and `conversationId` are the trace fields ([Recording traces](/docs/traces)).

## Run a tool without a model

The Harbor toolbox measures a road leg for a page that has no chat. Call `invokeTool` without `resume` and without a `callId` to run a registered tool directly. A `host` profile uses this function. `onStage` sees `pre_tool` and `post_tool` only.

## Run a live session

The Harbor phone line talks with a shipper in real time. Call `runSession` for a `live` profile. It returns a session. Read its events with `session.events()`. The events have the same types as the events of a turn.

Pass host options as the second argument. They include the vault and optional transport functions.
Session options also include `gateTtlMs` and `signInGate`.

A live session differs from a turn in three ways:

- A live gate settles on the session with `executeTool` or `answerToolCall`, not with `invokeTool`.
- `onStage` is fixed when the session opens.
- `gateTtlMs` defaults to 30 minutes. A later decision fails with `session.gate_expired`.

```ts frame=statements
const session = await runSession(
	{ profile: profile.id },
	{ vault: { google: process.env.GEMINI_API_KEY } },
);

for await (const event of session.events()) {
	if (event.type === 'text') console.log(event.text);
}
```

To resume, pass the latest checkpoint as `providerState` and its covered portable messages as `history`.
Live `provider_checkpoint` events contain both values. The same mismatch policy applies to turns and sessions.
A rebuilt session with history does not repeat its initial greeting.

## Run a decision

The Harbor router sends each ticket to a team. Call `runDecision` with JSON state and named questions. It returns validated answers and usage. It has no event stream.

Pass the vault in the second argument. An empty slot throws a `DecisionError` (from `@theoremjs/agents/kernel`) with code `authentication`. Its `code` is one of `invalid_request`, `authentication`, `permission`, `rate_limited`, `unavailable`, `network`, `timeout`, `cancelled`, `malformed_response` or `disclosure_blocked`.

```ts frame=statements
const result = await runDecision(
	{
		profile: profile.id,
		state: { ticket: 'T-1042', priority: 'high' },
		questions: {
			route: {
				type: 'choice',
				instructions: 'Where should this ticket go?',
				criteria: {
					billing: 'Payment or invoice.',
					support: 'Product help.',
				},
			},
		},
	},
	{ vault: { typesafe: process.env.TYPESAFE_API_KEY } },
);
```

## Fix a failed call

A call can fail as a thrown error, as an `error` event or as a warning on a `stage` event. Each row is one failure and its fix.

What you see | Cause | Fix
--- | --- | ---
`TheoremError`, kind `config`: unknown profile | The profile is not registered | Call `registerProfile` first
`error` event, `errorKind: 'auth'` | The vault has no key in the slot that the model names | Fill the slot ([Binding models](/docs/models))
`DecisionError`, code `authentication` | The vault has no key in the slot, or the provider refused it | Fill the slot, or check the key
`stage` event with `stageWarnings` | A stage returned a result that the stage does not allow | Return only the results in the stage table above
`session.gate_expired` | A live gate waited longer than `gateTtlMs` | Settle the gate sooner, or raise `gateTtlMs`
`runTurn`, kind `unsupported` | The profile is `live`, `host` or `decision`, which a turn cannot run | Use `runSession`, `invokeTool` or `runDecision` ([Choosing a modality](/docs/modalities))
