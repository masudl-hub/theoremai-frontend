---
title: Setting turn behaviour
updated: 2026-10-05
summary: Let a user continue a reply that stopped early, and decide whether a running turn takes new messages from the user.
entry: src/kernel/registry/profiles.ts
covers: src/kernel/stop.ts, src/kernel/registry/resolve.ts
cover: /imagery/th30_nightide.png
coverAlt: A night tide along a wooded shore
coverPosition: 0% 0%
---

Use `turnBehaviour` to let a user continue a reply that stopped early, and to decide whether a running turn takes new messages. Both settings are optional.

A **continue** is a new turn that your host sends. An **inject** adds a message to a turn that is running. Live profiles do not use `resumption`. They use `live.sessionResumption` ([Choosing a modality](/docs/modalities)).

```ts frame=profile:text
turnBehaviour: {
	resumption: {
		allowContinue: ['length', 'stream_incomplete'],
		maxContinues: 2,
	},
	allowSteering: true,
},
```

## Continue a reply

Use a continue when a reply stops before it ends and the user wants the rest. You send the continue as one more `runTurn` call with `continueFrom`. The kernel does not send it for you.

Three stop kinds can be continued ([Describing statuses](/docs/statuses)). `length` means the reply reached the output token limit. `stream_incomplete` means the connection dropped. `provider_error` means the provider returned an error or timed out. A profile that lists any other kind fails with a `config` error.

```ts frame=statements
runTurn(
	{
		profile: 'support.agent',
		continueFrom: { stop: { kind: 'length' } },
		continuation: 1,
		input: { history },
	},
	provider,
)
```

## Send the continue turn

On a text profile, end `input.history` with the cut reply as an assistant message. Leave `input.text` out. Theorem sends the lexicon text `continue.instruction` in its place.

On an image or speech profile, send the original request again.

When `maxContinues` is set, each continue must carry `continuation`. It counts the continues of one reply, starting at 1.

## Choose which stops continue

`allowContinue` lists the stops for which your host offers Continue. Leave it out to allow all three. Set it to `[]` to allow none.

`autoContinue` lists the stops that your host continues without asking. Leave it out to use `length` and `stream_incomplete`. Set it to `[]` to use none. Each kind in `autoContinue` must also be in `allowContinue`, or the profile fails with a `config` error.

`maxContinues` limits how many times one reply may be continued. Leave it out for no limit.

These lists guide your host. The kernel does not refuse a continue because its stop is off a list. `isResumeableStop` and `shouldAutoContinue` apply the lists for you. Wait `AUTO_CONTINUE_DELAY_MS` (1,500 ms) before an automatic continue, so a weak connection can recover.

## Allow messages during a turn

Use inject when a user sends a message while the agent works. Your `onStage` handler returns the messages in `inject`. Each message has `role: 'user'` and a string `content`. See [Running a turn](/docs/runner).

An inject lands at the `pre_turn`, `post_tool` or `before_end` stage. Text and live profiles accept it. Image and speech profiles have no `allowSteering`.

Leave `allowSteering` out, or set it to `true`, to allow inject. Set it to `false` to refuse it. A refused inject does not stop the turn. The `stage` event reports it in `stageWarnings` with the code `inject_not_allowed`.

A text profile also shows `allowSteering` in its interface, so the chat can offer the user a way to steer ([Building the interface](/docs/interface)).

## Fix a refused continue or inject

Where | What you see | Fix
--- | --- | ---
Registering the profile, kind `config` | `allowContinue` or `autoContinue` lists a kind other than `length`, `stream_incomplete` or `provider_error` | List only those three kinds
Registering the profile, kind `config` | `autoContinue` has a kind that `allowContinue` leaves out | Add the kind to `allowContinue`
A turn, kind `request` | The profile is `live` | Use `live.sessionResumption`
A turn, kind `request` | A text continue carries `input.text` | Remove `input.text`
A turn, kind `request` | `maxContinues` is set, and `continuation` is missing, below 1 or above `maxContinues` | Send `continuation`, counting from 1
`stage` event, `stageWarnings` | `inject_not_allowed`: `allowSteering` is `false` | Set `allowSteering` to `true`, or leave it out
`stage` event, `stageWarnings` | `inject_rejected_max_steps`: one more model call would pass `maxSteps` | Raise `maxSteps` on the profile ([Binding models](/docs/models))
`stage` event, `stageWarnings` | `affordance_not_allowed`: the stage cannot inject | Inject at `pre_turn`, `post_tool` or `before_end`
