---
title: Setting turn behaviour
updated: 2026-10-11
summary: Continue an early-stopped reply, and choose if a turn takes new messages.
entry: src/kernel/registry/profiles.ts
covers: src/kernel/stop.ts, src/kernel/registry/resolve.ts
cover: /imagery/th30_nightide.png
coverAlt: A night tide along a wooded shore
coverPosition: 0% 0%
---

Decide what happens when a reply stops early, and when a user sends a message while the agent still works.

## The idea

A turn does not always end cleanly. Two things happen in real use:

- **The reply stops early.** The model reaches its token limit, or the connection drops. The user wants the rest.
- **The user interrupts.** A shipper sees the desk look up the wrong container, and sends a correction before the reply ends.

`turnBehaviour` holds the answer to both in the profile.

- A **continue** is a new turn that your application sends, to get the rest of a reply.
- An **inject** adds a message to a turn that is running.

```figure
{
	"kind": "sequence",
	"still": {
		"src": "/imagery/th30_nightide.png",
		"position": "40% 50%"
	},
	"caption": "An inject changes a turn that is running. A continue starts a new turn for the rest of a reply.",
	"steps": [
		{
			"label": "Turn 1 runs",
			"text": "The desk starts its reply."
		},
		{
			"label": "The user injects",
			"text": "A message from the user joins the turn that is running."
		},
		{
			"label": "The reply stops early",
			"text": "The model reached its token limit, and the stop kind is length."
		},
		{
			"label": "Your application sends a continue",
			"text": "The continue is a new turn. It asks for the rest."
		},
		{
			"label": "Turn 2 runs",
			"text": "The desk gives the rest of the reply."
		}
	]
}
```

Both settings are optional. Live profiles do not use `resumption`. They use `live.sessionResumption` ([Choosing a modality](/docs/modalities)).

## Let the Harbor desk continue and take corrections

A dispatcher asks the desk to list each hold at a dock. The list is long, and the reply stops at the token limit. These steps let the dispatcher get the rest.

### 1. Set the behaviour in the profile

```ts frame=profile:text
turnBehaviour: {
	resumption: {
		allowContinue: ['length', 'stream_incomplete'],
		maxContinues: 2,
	},
	allowSteering: true,
},
```

### 2. Send the continue turn

You send the continue as one more `runTurn` call with `continueFrom`. Theorem does not send it for you.

```ts frame=statements
runTurn(
	{
		profile: 'harbor.desk',
		continueFrom: { stop: { kind: 'length' } },
		continuation: 1,
		input: { history },
	},
	hostOptions,
)
```

What the continue turn carries depends on the type of profile:

- On a text profile, end `input.history` with the cut reply as an assistant message. Leave out `input.text`. Theorem sends the label text `continue.instruction` in its place.
- On an image or speech profile, send the original request again.

If the profile sets `maxContinues`, each continue must carry `continuation`. It counts the continues of one reply, and it starts at 1.

### 3. Choose which stops continue

Three kinds of stop can continue ([Describing statuses](/docs/statuses)):

- `length`: the reply reached the output token limit.
- `stream_incomplete`: the connection dropped.
- `provider_error`: the provider returned an error or timed out.

Three fields of `resumption` use these kinds:

- `allowContinue` lists the stops for which your application offers Continue. Leave it out to allow all three. Set it to `[]` to allow none.
- `autoContinue` lists the stops that your application continues without a question to the user. Leave it out to use `length` and `stream_incomplete`. Set it to `[]` to use none.
- `maxContinues` limits how many times one reply can continue. Leave it out for no limit.

The two lists are separate. A stop in `autoContinue` does not have to be in `allowContinue`, so your application can continue a stop without offering Continue for it. A list can name only the three kinds above. A profile that names another kind fails with a `config` error.

```warning
These lists guide your application. Theorem does not refuse a continue because its stop is not on a list. Use `isResumeableStop` and `shouldAutoContinue` to apply the lists.
```

Wait `AUTO_CONTINUE_DELAY_MS` (1,500 ms) before an automatic continue, so that a weak connection can recover.

### 4. Accept a message during a turn

The shipper sends a correction while the desk still works. Your `onStage` handler returns the message in `inject` ([Running a turn](/docs/runner)). Each message has `role: 'user'` and a string `content`.

- An inject lands at the `pre_turn`, `post_tool` or `before_end` stage.
- Text and live profiles accept an inject. Image and speech profiles have no `allowSteering`.
- Leave out `allowSteering`, or set it to `true`, to allow an inject. Set it to `false` to refuse it.

A refused inject does not stop the turn. The `stage` event reports it in `stageWarnings` with the code `inject_not_allowed`.

A text profile also shows `allowSteering` in its interface, so that the chat can offer the user a way to steer ([Building the interface](/docs/interface)).

### 5. Choose what the last step does

`maxSteps` limits the model calls in one turn. The last call can still ask for tools. Then the tools run, no call is left to read their results, and the turn ends with no reply. Its `done` has the stop kind `step_limit`.

Set `atStepLimit` to `'answer'` to get a reply instead. Theorem then sends the last call without tools, so the model writes its reply from the results that the turn has.

```ts frame=profile:text
turnBehaviour: {
	atStepLimit: 'answer',
},
```

- Only a text profile takes `atStepLimit`.
- Leave it out, or set it to `'stop'`, to keep tools on the last call.
- A profile with `atStepLimit: 'answer'` and `maxSteps: 1` fails with a `config` error, because no call could use a tool.

## Fix a refused continue or inject

A wrong list fails when the profile is checked. A wrong continue fails the turn. A refused inject is a warning on the `stage` event.

Where | What you see | Fix
--- | --- | ---
Registering the profile, kind `config` | `allowContinue` or `autoContinue` lists a kind other than `length`, `stream_incomplete` or `provider_error` | List only those three kinds
A turn, kind `request` | The profile is `live` | Use `live.sessionResumption`
A turn, kind `request` | A text continue carries `input.text` | Remove `input.text`
A turn, kind `request` | `maxContinues` is set, and `continuation` is missing, below 1 or above `maxContinues` | Send `continuation`, counting from 1
`stage` event, `stageWarnings` | `inject_not_allowed`: `allowSteering` is `false` | Set `allowSteering` to `true`, or leave it out
`stage` event, `stageWarnings` | `inject_rejected_max_steps`: one more model call would pass `maxSteps` | Raise `maxSteps` on the profile. Without it, a turn stops at 20 model calls
`stage` event, `stageWarnings` | `affordance_not_allowed`: the stage cannot inject | Inject at `pre_turn`, `post_tool` or `before_end`
