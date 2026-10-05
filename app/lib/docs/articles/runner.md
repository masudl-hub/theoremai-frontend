---
title: Running a turn
updated: 2026-10-05
summary: Call the door that matches your profile type, read the event stream, and resume a tool that paused for approval.
entry: src/kernel/engine/runner/mod.ts
covers: src/kernel/engine/runner, src/kernel/engine/decision.ts, src/kernel/engine/session, src/kernel/tools/invoke.ts, src/kernel/stages.ts
cover: /imagery/th30_poppies.png
coverAlt: A field of poppies
coverPosition: 0% 8%
suggest: 3
---

Call `runTurn` to run one turn of a profile and read its events. Text, image and speech profiles use it. Live, decision and host profiles each have their own door ([Choosing a modality](/docs/modalities)).

## Run a turn

Pass a request and a provider. Create the provider with `createProvider` and a vault. The vault maps each key slot to its secret. The profile names the slot in `key`.

The request needs `profile`, the id of a registered profile. Add `input` for a user turn ([Declaring inputs](/docs/inputs)). The optional third argument is a trace sink ([Recording traces](/docs/traces)).

```ts
import { createProvider, runTurn } from '@theoremjs/agents';

const vault = { openrouter: process.env.OPENROUTER_API_KEY };
const provider = createProvider(profile, { vault });

for await (const event of runTurn(
	{ profile: profile.id, input: { text: 'Where is hold H-2291?' } },
	provider,
)) {
	if (event.type === 'text') console.log(event.text);
}
```

## Set more on the request

The request also takes `model`, `effort`, `system`, `host`, `signal`, `credentials`, `resolveHost`, `continueFrom` and `continuation`. It takes the trace fields `traceparent` and `conversationId`. See [Setting turn behaviour](/docs/turn-behaviour) for `continueFrom`.

## Continue a chat

A turn does not remember the turn before it. Your host stores the chat. To continue, send the earlier messages in `input.history` and the new message in `input.text`.

Each message has a `role` (`user`, `assistant`, `system` or `tool`) and its `content`. A Gemini binding with `persistViaInteractionId: true` is the exception: send `previousInteractionId` and no history ([Binding models](/docs/models)).

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
	provider,
)
```

## Act at a stage

Pass `onStage` to run your code at a stage of the turn. Return nothing to observe. Return a result to act. Each stage allows only some results.

`pre_turn` and `before_end` may inject or abort. `pre_tool` may abort, deny, confirm or mutate. `post_tool` may inject, abort, deny or mutate. `post_turn` allows none.

A `confirm` on `pre_tool` opens a gate. A `mutate` replaces the tool input or output, and Theorem validates it again. Set `injectId` to name an inject on the `stage` event.

```ts frame=request
onStage: (ctx) => {
	if (ctx.stage === 'pre_tool' && ctx.tool === 'payments.charge') {
		return { confirm: true };
	}
},
```

## Read the stream

The stream yields `TurnEvent` values until `done` or `error`. Model output comes first as `text`, `thought`, structured data or media. The `tool`, `stage` and `guardrail` events arrive as they fire.

The last event is `done`. Its `stop.kind` is `completed` for a normal finish. A `done` with `length`, `stream_incomplete` or `provider_error` can continue ([Setting turn behaviour](/docs/turn-behaviour)).

A `guardrail` event reports a policy decision. It is not a stage result ([Setting guardrails](/docs/guardrails)).

## Resume a gate

A gate is not an event type. The tool event shows phase `gate`. Then `done` arrives with `stop.kind` set to `gate`.

Resume with `invokeTool`. Pass the tool name, the input, the turn’s `callId` and `resume`. Set `resume.granted` to `true` to approve or `false` to refuse. HTTP surfaces that answer gates are in [Building the interface](/docs/interface).

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

## Run a tool without a model

Call `invokeTool` without `resume` and without a `callId` to run a registered tool directly. A host profile uses this door. `onStage` sees `pre_tool` and `post_tool` only.

## Run a live session

Call `runSession` for a live profile. It returns a session. Read its events with `session.events()`. The events use the same family as a turn.

The second argument takes a `vault`. It also takes `gemini`, `openWebSocket`, `gateTtlMs` and `signInGate`.

A live gate settles on the session with `executeTool` or `answerToolCall`, not with `invokeTool`. `onStage` is fixed when the session opens. `gateTtlMs` defaults to 30 minutes. A later decision fails with `session.gate_expired`.

```ts frame=statements
const session = await runSession(
	{ profile: profile.id },
	{ vault: { google: process.env.GEMINI_API_KEY } },
);

for await (const event of session.events()) {
	if (event.type === 'text') console.log(event.text);
}
```

## Run a decision

Call `runDecision` with JSON state and named questions. It returns validated answers and usage. It has no event stream. Pass the vault in the second argument. An empty slot throws a `DecisionError` (from `@theoremjs/agents/kernel`) with code `authentication`. Its `code` is one of `invalid_request`, `authentication`, `permission`, `rate_limited`, `unavailable`, `network`, `timeout`, `cancelled`, `malformed_response` or `disclosure_blocked`.

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

What you see | Cause | Fix
--- | --- | ---
`TheoremError`, kind `config`: unknown profile | The profile is not registered | Call `registerProfile` first
`error` event, `errorKind: 'auth'` | The vault has no key in the slot that the profile names | Fill the slot ([Binding models](/docs/models))
`DecisionError`, code `authentication` | The vault has no key in the slot, or the provider refused it | Fill the slot, or check the key
`stage` event with `stageWarnings` | A stage returned a result that the stage does not allow | Return only the results in the stage list above
`session.gate_expired` | A live gate waited longer than `gateTtlMs` | Settle the gate sooner, or raise `gateTtlMs`
`createProvider`, kind `request` | The profile is `live`, `host` or `decision`, which have no `runTurn` provider | Use `runSession`, `invokeTool` or `runDecision` ([Choosing a modality](/docs/modalities))
