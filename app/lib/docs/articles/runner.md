---
title: Running a turn
updated: 2026-10-22
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
The host options supply credentials and optional transport functions. The profile contains no executable code for the model.

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
			"text": "Your code can inject, abort, deny, mutate or label the call as failed."
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

The checkpoint contains native state for the protocol. Portable history remains necessary for recovery.
The kernel checks the protocol, provider, model, connection, key slot, state version, and the covered history prefix.
On a mismatch, it rebuilds from portable history and emits `provider_warning` with code `provider_state_rebuilt`.
Set the profile's `providerContinuation: { history: 'provider' }` to send the checkpoint alone. A request that also carries history is then a mismatch. With `'stateless'`, a request that carries history or a checkpoint is refused, and completion carries no checkpoint.
Google persistence uses this same checkpoint boundary ([Binding models](/docs/models)).

### 3. Read the stream

Read the event stream to completion. An `error` event can precede terminal `done` status.

- Model output arrives as `text`, `thought`, structured data or media.
- The `tool`, `stage` and `guardrail` events arrive as they fire.
- `done` reports completion status. Its `stop.kind` is `completed` for a normal finish.
- The `post_turn` stage follows completion. Continue reading the stream for that stage.

A `done` with `length`, `stream_incomplete` or `provider_error` can continue ([Setting turn behaviour](/docs/turn-behaviour)).

Every `done` carries a `stop.kind` that says why the turn ended:

- `completed`: the model finished its reply.
- `length`: the model reached its token limit.
- `tool`: the model called tools and the turn hands them to you, in `done.tools`.
- `gate`: a `pre_tool` stage held a tool call. You resume it with `invokeTool`, not `continueFrom`.
- `filtered`: the provider filtered the reply, or the egress guardrail withheld it.
- `provider_error`: the provider failed or reported an error.
- `cancelled`: the turn was cancelled, by the user or by a stage that aborted it.
- `stream_incomplete`: the stream ended without the provider reporting a final status.
- `step_limit`: the last model call `maxSteps` allows asked for tools, so the turn ended with no answer ([Setting turn behaviour](/docs/turn-behaviour)).
- `interrupted`: a live utterance was cut off by an interruption.
- `generation_complete`: live, the model finished generating audio or text for this utterance. The turn may still be open.

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
`post_tool` | inject, abort, deny, mutate, labelFailed
`before_end` | inject, abort
`post_turn` | none

- A `confirm` on `pre_tool` opens a **gate**. A gate pauses the tool until a person decides.
- A `mutate` replaces the tool input or output. Theorem validates the new value again.
- `labelFailed: true` on `post_tool` keeps the result and the phase, and shows the tool's failed activity label on the terminal `tool` event.
- Set `injectId` to name an inject on the `stage` event.
- With an inject at `post_tool` or `before_end`, set `released` to the number of characters of the reply that the user already has. Theorem removes the rest of the reply from the turn and its history, and the model answers again after that point. Without `released`, the user has the whole reply.

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

When the page needs only how the call ended, call `runTool` with the same request. It returns the last `tool` event of the call, with `phase` `complete`, `gate` or `error`. Its `events` field holds every event that the call sent. A call that never ended is an `error` with code `invoke_failed`.

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

Each question has a `type`. Each answer has the same `type` as its question.

Type | Question | Answer
--- | --- | ---
`choice` | `instructions` and named `criteria` | `choice`, the name of the criterion, with `confidence` and `probabilities`
`noul` | `instructions`, and optional named `criteria` | `noul`, one number
`score` | `instructions` and a list of `criteria`, in order | `score`, with `confidence`, `legend` and `probabilities`
`box` | `instructions` that name a thing in an image, and an optional `image` | `box`, with `top`, `bottom`, `left` and `right` as fractions of the image from its top-left corner, and `confidence`

The kernel does not check that the model can answer a type. The provider refuses one that it cannot answer.

### Send images

Pass PNG or JPEG images in `assets`, as base64 by reference. Write the reference in a string where the image belongs: in `state`, in the instructions or in the criteria. The model reads the image in its place. The kernel sends only the images that a string references. Use a reference that cannot occur in your text by accident, such as `<shelf>`.

A `box` question gives its image in `image`, as a reference or as the state field that holds one. On TypeSafe, the binding must set `options: { images: true }`, or the request fails before it leaves. A `box` question also fails on a `jev-1.13` model. On OpenRouter, the `openRouterDecisions` protocol takes no options.

```ts frame=statements
import { readFile } from 'node:fs/promises';

const shelf = (await readFile('shelf.jpg')).toString('base64');
const result = await runDecision(
	{
		profile: profile.id,
		state: { photo: '<shelf>' },
		questions: {
			open: { type: 'box', instructions: 'Find the open jar.', image: 'photo' },
		},
		assets: { '<shelf>': { mimeType: 'image/jpeg', data: shelf } },
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
`runTurn`, kind `unsupported` | The profile is `live`, which a turn cannot run | Use `runSession` ([Choosing a modality](/docs/modalities))
`runTurn`, kind `request` | The profile is `host`, `decision` or `embedding`, which runs no turn | Use `invokeTool`, `runDecision` or `runEmbedding` ([Choosing a modality](/docs/modalities))
