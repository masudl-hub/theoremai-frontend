---
title: Turn Resumption & Steering
updated: 2026-11-02
summary: Continuing turns across token limits, resuming after gates, and steering mid-flight.
entry: src/kernel/engine/runner/mod.ts
covers: src/kernel/engine/runner, src/kernel/registry/profiles.ts
cover: /imagery/th30_piercedpeaks.png
coverAlt: Jagged mountain ridges piercing high cloud layers
coverPosition: 50% 50%
---

Not every agent turn runs from start to finish in a single uninterrupted pass. A model may exhaust its output token budget mid-sentence, a critical tool action may pause for human approval, or a user might need to redirect an agent while it is executing a multi-step research loop.

The `turnBehaviour` configuration governs how Theorem manages these pauses—enabling automated continuations, human approval gates, and mid-turn user steering.

## Turn Behavior Configuration

Base profile fields such as `identity`, `models`, `guardrails` and `observability` are documented in [Profiles](/docs/profiles). Text profiles declare a `turnBehaviour` block to configure continuation rules, steering affordances, and what the last step may do. This slice shows only that block, as the research scout sets it:

```ts frame=profile:text
turnBehaviour: {
	resumption: {
		allowContinue: [], // Offer no Continue button
		autoContinue: ['length', 'stream_incomplete', 'provider_error'], // Continue all three without asking the user
		maxContinues: 3,
	},
	atStepLimit: 'answer',
},
```

* **`resumption`**: Governs how truncated or failed model completions are continued.
* **`allowSteering`**: Allows injects into a running turn (default: `true`). The scout leaves it on. Set it to `false` to refuse them. Stage events still emit when it is off.
* **`atStepLimit`**: Sets what the last model call under `maxSteps` may do.

## Continuing Incomplete Replies

Completions can halt prematurely when reaching output token budgets or when network streams drop. Theorem standardizes continuation across three stop reasons (`ContinueStopKind`):

* **`'length'`**: The reply hit its output token limit (`maxOutputTokens`) or the provider's budget. A [structured reply](/docs/profiles/text) cut this way is first asked for again by the turn itself, so a structured turn ends at `length` only when the cut left no answer to send back.
* **`'stream_incomplete'`**: The stream ended before the provider said the reply was done.
* **`'provider_error'`**: The provider call failed. The provider sent an error, reported a failed status, or gave a finish reason Theorem does not know.

### Manual vs. Automated Continuations

The `resumption` block controls whether recoveries are automatic or require user confirmation:

* **`allowContinue`**: Lists stop kinds for which your frontend UI should display a "Continue" button. This is UI policy only: the kernel does not refuse a `continueFrom` for a stop outside it. Omit it to offer Continue for all three kinds; `[]` offers none.
* **`autoContinue`**: Lists stop kinds the host continues on its own, after a short pause. Omit it for `length` and `stream_incomplete`; `[]` means none. When you set this list and it names `provider_error` or `stream_incomplete`, a text turn also sends a failed model call again itself, if the call gave no reply and no tool call. Omitted, the turn sends nothing again itself.
* **`maxContinues`**: The cap that `continuation` is compared against. Omit it for no cap. It also sets how many times one text turn sends a failed model call again itself (default: one).

### A File the Provider Refuses

One file a provider cannot read refuses every call that replays it. So when a text turn may send a failed call again (see `autoContinue`), and a call that carried files fails as `unsupported` with no reply and no tool call, the turn sends it once more without them. It takes out this turn's files. If this turn has none, it takes out the files in the conversation. A turn tries this once.

A note stands where each file was, so the model knows what it could not read. The notes are the labels `turn.media_refused_image`, `turn.media_refused_video` and `turn.media_refused_file`, and a profile's `labels` can reword them.

If the provider accepts the call, the turn goes on and `done.mediaRefused` says what happened. `dropped` lists each file's `mimeType` and where the turn carried it (`from`: `'input'`, `'history'` or `'tool'`). `said` is the provider's own reason. `forClient` removes `mediaRefused`, so your server reads it and a client does not. If the provider refuses the call again, the files go back and the failure stands.

### Executing a Continuation Turn

To continue a truncated text turn, call `runTurn()` with `continueFrom` set to the stop from the last `done` event. Set the 1-based `continuation` count, and place the partial text reply as the last assistant message in `input.history`. Send no `input.text`: the turn's user message is the continue instruction.

```ts frame=statements
const continuedEvents = runTurn({
	profile: 'research.scout',
	continueFrom: { stop: { kind: 'length' } },
	continuation: 1,
	input: {
		options: { reader: 'anyone' },
		history: [...previousMessages, { role: 'assistant', content: partialReplyText }],
	},
});
// ...
```

The model reads the partial reply from history. In place of the user's text, it gets the continue instruction (label `continue.instruction`), which you can reword like any label. The scout does, in its `labels`.

A continuation builds its prompt again, so it sets its options as the first turn did. The sample sets the `reader` option the first turn chose, so the same lines fit.

## Tool Action Gates

When a tool requires human confirmation or session consent, Theorem halts the turn before tool execution begins with `stop: { kind: 'gate' }`. The `tool` event with phase `gate` carries the held call, and `done.tools` carries the turn's tool snapshot.

Unlike incomplete model replies, held tool calls are not resumed with `continueFrom`. Instead, your frontend application collects the user's approval and resumes or declines execution using `invokeTool()`.

A pause does not end the reply. When the model reads the answered call, the run that goes on keeps what the reply had. Pass two fields on that `runTurn()`:

* **`stepsTaken`**: The steps the reply already took, from `done.steps`. They count against `maxSteps`, so a pause does not give the reply its steps back.
* **`promoted`**: The tools the reply already had, so a tool the model loaded stays on its list. An id the profile does not grant is left out.

`replyCarriedFromEvents()` from `@theoremjs/agents/interface` reads both from the paused run's events. `createTheoremHandler` passes them for you.

For approval cards, argument modification, and gate resumption patterns, see [Tool Permissions & Gates](/docs/tools/gates).

## Mid-Turn Steering

Steering adds messages to a turn while it runs. The turn does not stop: the model reads the new messages at its next step.

`turnBehaviour.allowSteering` controls it. It is on unless you set it to `false`, on text and live profiles. Image and speech profiles never take injects.

* **From your code**: an `onStage` handler returns `inject` with one or more `user`, `assistant` or `system` messages. A `tool` message is refused.
* **From the user**: on a text profile, the composer offers a `steer` action while the reply streams. Your host sends that message to the turn as an inject.

### How Steering Works

1. **Where it lands**: an inject lands only at `pre_turn`, `post_tool` or `before_end`. At any other stage it is refused with a warning.
2. **What it changes**: the messages are added to the end of the turn's history, and a `stage` event records that they landed. Earlier history and tool results stay.
3. **Unsent draft text**: at `post_tool` or `before_end`, `released` says how many characters of the reply the user already has. The rest leaves the history and the reply, and the model writes it again.
4. **Step limit**: if the inject would need another model call past `profile.maxSteps`, it is refused with a warning.
5. **Off**: with `allowSteering: false`, every inject is refused. Stage events still emit.

## Stop Reason Reference

Every turn ends with a `done` event. Its `stop.kind` says why the turn ended:

| Stop Kind | What Happened | What the Host Can Do |
| :--- | :--- | :--- |
| **`'completed'`** | The model finished its reply. | Nothing; the turn is done. |
| **`'length'`** | The reply hit its output token limit. | Continue with `runTurn({ continueFrom })`. |
| **`'stream_incomplete'`** | The stream ended before the provider said it was done. | Continue with `runTurn({ continueFrom })`, or let `autoContinue` do it. |
| **`'provider_error'`** | The provider call failed. | Continue with `runTurn({ continueFrom })`, or let `autoContinue` do it. |
| **`'tool'`** | The model called tools, and the turn gives them to the host in `done.tools`. | Run them with `invokeTool({ snapshot })`. |
| **`'gate'`** | A `pre_tool` gate held a call. | Settle it with `invokeTool({ snapshot, resume })`. |
| **`'step_limit'`** | The last call allowed by `profile.maxSteps` asked for tools, or the reply spent its steps before it paused, so there is no answer. | Nothing; set `atStepLimit: 'answer'` to prevent it. |
| **`'filtered'`** | A provider filter or a Theorem guardrail blocked the reply. | Nothing; `guardrails.blockedReply` sets whether the model rewrites a blocked reply first. |
| **`'cancelled'`** | The signal aborted the turn, or a stage handler returned `abort`. | Nothing. |
| **`'interrupted'`** | Live: the session was aborted or interrupted during the turn. | Nothing. |
| **`'generation_complete'`** | Live: the model finished this utterance; the turn may still be open. | Nothing. |

## Related Guides

* **[Profiles](/docs/profiles)**: Universal profile identity, model bindings, inputs, and registry lifecycle.
* **[Text Profiles](/docs/profiles/text)**: Conversational agents, output schemas, and `atStepLimit` policies.
* **[Defining Tools](/docs/tools)**: Declaring gates (`auto`, `session_consent`, `always_confirm`) on tool definitions.
* **[Lifecycle Hooks & Interception](/docs/profiles/lifecycle)**: Using `onStage` and `onAgentCall` to observe and modify running turns.
