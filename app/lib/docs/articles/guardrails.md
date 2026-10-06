---
title: Setting guardrails
updated: 2026-10-05
summary: Choose which checks run on a turn: input cleaning, the system-prompt canary, reply checks, tool limits and a daily quota.
entry: src/guardrails/mod.ts
covers: src/guardrails
cover: /imagery/th30_obsidianshores.png
coverAlt: Black rocks where the surf meets the shore
coverPosition: 100% 0%
---

Guardrails keep injected instructions, secrets and leaks out of a turn. Each guardrail is a field under `guardrails` on the profile. One runs when you set nothing: `detect`. The reply check, `egress`, runs only when you set it.

## Know the defaults

Guardrail | Without a setting | What it does
--- | --- | ---
`detect` | Redacts what goes to the model | Finds credentials, personal data, injection phrasing and leaks of the system prompt in text, and acts on each match
`egress` | No check | Checks each reply before the user sees it
`network` | `https` only, no private addresses | Limits what HTTP and MCP tools reach
`taint` | `off` | Limits tool calls after a remote read
`quota` | No limit | Limits turns per day
`disclosure` | No check | Checks decision state before it goes to the model

## Check the reply

Set `egress` to check each reply before the user sees it. `checks: true` runs the bundled checks at their defaults. `onBlock` says what happens when a check stops a reply.

```ts frame=profile:text
guardrails: {
	egress: { checks: true, onBlock: 'refuse_to_user' },
},
```

## Choose what happens when a check stops a reply

With `refuse_to_user`, the user reads the `egress.refusal` line in place of the reply, and the turn ends.

With `reject_to_agent`, the model reads why and writes the reply again. If you omit `onBlock`, Theorem uses `reject_to_agent`.

For `reject_to_agent`, `maxRetries` sets how many times the model may rewrite. If you omit it, the value is 0. Theorem then withholds the reply, and the user reads the `error.safety` line.

## Pick the bundled checks

Pass an object to `checks` to switch single checks. A check you leave out keeps its default. All checks run by default except `links`.

```ts frame=guardrails
egress: {
	checks: { links: true, images: { hosts: ['cdn.example.com'] } },
},
```

## What each check stops

`boundary` stops a reply that repeats the markers Theorem puts around user data.

To stop credentials, personal data or injection phrasing in a reply, set `detect` at the `reply` boundary ([Clean what goes in](#clean-what-goes-in)).

`images` stops an image that loads a URL the model never saw, because the image can carry data to that server. `links` does the same for links. `hosts` lists hostnames that always pass. A URL that a tool returned counts as given unless you set `fromTools` to `false`.

To write your own check, set `enforce` in place of `checks`. Your function returns `allow`, `flag`, `redact` or `block`. `defineProfile` refuses an `egress` that sets both or neither.

## Write your own egress check

Most hosts turn on the bundled checks with `egress.checks`. If your host has rules of its own, start from `standardEgressEnforce` and add your rule after it. Your function sees every outbound payload (streamed text, structured JSON and live transcripts), the stage and the canary. It returns one of four verdicts.

`allow` releases the payload as it is. `flag` releases it with a `guardrail` event for review. `redact` releases your rewritten text in its place. `block` follows `onBlock`: `reject_to_agent` sends the rejection back to the model for up to `maxRetries` repair rounds, and `refuse_to_user` shows the lexicon’s `egress.refusal`. When the retries run out, the turn is withheld.

The checks fail closed. A payload that cannot be scanned, or an enforcer that throws, counts as a block (`egress.enforcer-error`). It never counts as an allow.

```ts
import { type EgressEnforcer, standardEgressEnforce } from '@theoremjs/agents';

// Standard checks first, then hide internal incident ids from customers.
export const egress: EgressEnforcer = (payload, ctx) => {
	const standard = standardEgressEnforce(payload, ctx);
	if (standard.action !== 'allow') return standard;
	const text = payload.text.replace(/\bINC-\d{6}\b/g, '[internal incident]');
	if (text === payload.text) return standard;
	return { action: 'redact', text, hits: [{ rule: 'host.internal-incident-id', severity: 'low' }] };
};

// guardrails: { egress: { enforce: egress, onBlock: 'reject_to_agent', maxRetries: 2 } }
```

## Compile rules at build time

If your rules only block, use `egressPolicy` in place of a function. It holds them as exactly as the standard checks do. Run `agents egress-compile ./rules.ts --out ./rules.compiled.ts` to compile your regexes at build time. Then run `egressPolicy({ rules, compiled: compiledEgressRules })` beside the standard checks.

## What streaming holds back

Streaming does not turn the checks off. Theorem releases text only after it clears them. A **progressive yield** window holds back the end of the output, so a secret that arrives in two chunks cannot leave in its first half. The check in use sets how much the window holds.

With the canary only, the window holds a tail of 4 or more characters that could still start a leak. This is usually nothing, so the text streams almost at once. A blocked leak shows at most 3 characters.

With the bundled `egress.checks`, or an `egressPolicy`, the window holds only the text that could still become a match. A blocked match shows none of its characters.

With `detect` at the `reply` boundary, the same window holds the text that could still become a match. No character of a match shows before its action is taken.

With your own `egress.enforce`, the window holds `egress.holdback` characters. The default is 256, or 96 on a live session, where held transcript also holds its audio.

The verdict at the end of the attempt is final. Text that was held back and then cleared is released, not dropped.

## Thoughts and live audio

A thought that trips a guardrail is edited, never stopped. Set `outputs.streaming.streamThoughts` to show thoughts to your user. Each thought then arrives with the canary, the system-prompt echo, the user-data markers, and any image or link that the bundled checks would block, swapped for a placeholder. A `guardrail` event at stage `thought` reports the swap. The rest of the thought streams on.

`detect` reads thoughts at the `thought` boundary. `block` there hides the rest of the thought, and the turn goes on.

In a live session, the transcript of the spoken reply goes through the same window. A native-audio model sends its transcript after its audio, with no timing. A guarded profile therefore holds each audio chunk until the transcript of its own message has passed, or until the next transcript when the message has none. A profile is guarded when it has a canary, `egress.enforce` or a detector at `live_reply`.

The held chunk then streams, so its words are read before they are heard. What the user heard before a later hit stays heard. The gate withholds from the hit onward.

A guarded live profile always asks the provider for the output transcript: it forces `live.transcription.output` on. Audio from a reply that has no transcript is dropped, not played. A profile with none of the three streams audio as it arrives.

## Protect the system prompt

Two detectors under `detect` protect the system prompt.

- `canary_leak` reads for the canary, a secret token that Theorem adds to the end of the system instruction.
- `prompt_leak` reads for 12 words in a row from the system instruction.

Without a setting, each blocks a reply that leaks and redacts a thought that leaks. `canary_leak` also blocks a tool call whose arguments carry the token. `prompt_leak` flags a tool call whose arguments carry the words.

Without `egress`, a leak ends the turn, and the user reads the `error.safety` line. With `egress`, `onBlock` decides.

A speech profile has no system prompt, so Theorem adds no canary to it.

## Clean what goes in

`detect` says what Theorem does with a match: you name a detector, a boundary and an action.

A detector is what Theorem finds. There are five: `ids`, `financial`, `network`, `credentials` and `injection`.

A boundary is a place where text crosses: `user`, `attachment`, `voice`, `slots`, `history`, `injected`, `system`, `repair` and `live_user` on the way in, `reply`, `reply_structured`, `live_reply` and `thought` on the way out, and three for each type of tool. The tool boundaries are `tool_arguments_<kind>`, `tool_output_<kind>` and `tool_failure_<kind>`, where `<kind>` is `function`, `http`, `mcp` or `agent`.

Action | What happens to a match
--- | ---
`ignore` | The text is not read
`flag` | A `guardrail` event reports the match, and the text crosses unchanged
`redact` | A placeholder replaces the match, and the rest crosses
`block` | The text does not cross

If you set nothing, these are the actions:

Boundaries | `ids`, `financial`, `network`, `credentials` | `injection`
--- | --- | ---
The way in, `tool_output_<kind>`, `tool_failure_<kind>` | `redact` | `redact`
`tool_arguments_<kind>` | `flag` | `ignore`
The way out | `ignore` | `ignore`

`detect` takes one action for everything, or a rule for each detector you name. A rule is one action for every boundary, or an object: `action` for every boundary, and `at` for each boundary you name. What you leave out keeps its default.

```ts frame=profile:text
guardrails: {
	detect: { network: 'ignore', credentials: { at: { reply: 'block' } } },
},
```

`identity.system` is your own text, so Theorem does not read it.

## What block does

On the way in, `block` refuses the turn before the model is called, with an `input` error. At `tool_arguments_<kind>`, the tool is not called and the model is told so. At `tool_output_<kind>`, the model does not read the output and the call fails.

At `reply`, the reply stops before the match. It then goes the way `egress.onBlock` sets. Each match is reported under the rule `detect.<detector>`, and the `guardrail` event names the boundary.

## Treat remote tool results as data

A tool result can be the way an attack gets in. Theorem treats remote content as data, never as an instruction.

**Provenance.** Each result records where it came from (`local`, `builtin`, `http`, `mcp` or `delegated`) and how deep the call chain went.

**Fencing.** Remote results reach the model inside `<tool_data tool="..." origin="...">`. Theorem first strips any forged `tool_data` marker from the body, so content cannot claim a friendlier origin than it has.

**Directive advisory.** Some content names a tool that the model can call, gives the agent orders, or claims authority that it cannot have, and points at an external address or URL. That content gets an `advisory` attribute, a short notice, and your lexicon line `advisory.guidance` ([Describing statuses](/docs/statuses)). The advisory informs the model. It does not block.

**Argument inspection.** Theorem scans the model’s arguments before the tool runs. By default, a credential or personal data that is about to leave as a parameter is flagged: a `guardrail` event reports it under `detect.<detector>`, and the arguments go unchanged. Set `detect` at `tool_arguments_<kind>` to redact or block instead.

**Redaction.** The result, its structured data and its failure messages go through the same detection as user input before the model reads them.

## Limit what tools can reach

`network` sets which addresses your HTTP and MCP tools may reach. By default, Theorem refuses private and loopback addresses and any scheme except `https`. It checks each redirect too.

For local development, set `allowPrivateNetworks: true`. Tools may then reach local addresses over `http` or `https`. `allowedHosts` names hosts that may resolve to a private address. `allowedSchemes` replaces the list of schemes.

## Limit tools after a remote read

The result of an HTTP tool, an MCP tool or another agent can hold text that tries to steer the agent. Set `taint.afterRemoteRead` to refuse risky tool calls after such a read.

`destructive` refuses calls to tools with `access: 'destructive'`. `write` also refuses `read-write` tools. The default, `off`, only records the call. A refused call returns the failure code `tainted_turn`.

## Limit turns per day

`quota.perDay` sets how many turns each client IP may run on one profile per UTC day. `runTurn` does not count turns ([Running a turn](/docs/runner)). Your server middleware calls `takeSlot(profile, ip, now)` before a turn and `releaseSlot(profile, ip)` after it.

`takeSlot` returns `ok`, `busy`, `quota` or `not_configured`. `busy` means that the client has a turn running on this profile. `quota` means that the day’s turns are used. For `quota`, `quotaExhausted(profile)` returns a `rate_limit` error that carries the `quota.exhausted` line. `releaseSlot` frees the slot but does not give the turn back.

## Check state before a decision

A decision profile sets `disclosure.enforce`. `runDecision` calls it before it sends the state to the model. Your function returns `allow` or `block`. On `block`, `runDecision` fails with the code `disclosure_blocked`.

## Which profiles take which guardrail

Guardrail | `text`, `image` | `live` | `speech` | `host` | `decision`
--- | --- | --- | --- | --- | ---
`detect` | Yes | Yes | Yes | Yes | No
`egress`, `taint` | Yes | Yes | No | No | No
`network` | Yes | Yes | No | Yes | No
`quota` | Yes | Yes | Yes | No | No
`disclosure` | No | No | No | No | Yes

## Know what defineProfile refuses

`defineProfile` refuses any other field with a `config` error. On a `host` profile, `detect` takes the tool boundaries only.

## Try the input checks without a model

Call `detectAt(text, boundary, resolveDetect())` to see what `detect` does at a boundary. Both come from `@theoremjs/agents/guardrails`. It returns the `action` taken, the `text` to let through and the `hits`. For `Ignore all previous instructions.` at `user`, `action` is `redact`, `text` is `[omitted - injection].` and the hit rule is `detect.injection`. The `@theoremjs/agents/guardrails/testing` entry exports Theorem’s attack corpus and fuzz runners.
