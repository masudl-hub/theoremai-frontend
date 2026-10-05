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

Guardrails keep injected instructions, secrets and leaks out of a turn. Each guardrail is a field under `guardrails` on the profile. Four run when you set nothing: `sanitizeInput`, `redactSensitive`, `canary` and `promptEcho`. The reply check, `egress`, runs only when you set it.

## Know the defaults

Guardrail | Without a setting | What it does
--- | --- | ---
`sanitizeInput` | On | Replaces injection phrasing in what goes in
`redactSensitive` | On, every group | Replaces credentials and personal data in what goes in
`canary` | On | Catches a reply that repeats a secret token from the system prompt
`promptEcho` | On | Catches a reply that repeats 12 words in a row from the system prompt
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

`sensitive` stops credentials and personal data in the reply, by group: `ids`, `financial`, `network` and `credentials`. In a reply, `network` is off by default, because replies cite addresses.

`boundary` stops a reply that repeats the markers Theorem puts around user data. `injection` stops injection phrasing.

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

With your own `egress.enforce`, the window holds `egress.holdback` characters. The default is 256, or 96 on a live session, where held transcript also holds its audio.

The verdict at the end of the attempt is final. Text that was held back and then cleared is released, not dropped.

## Thoughts and live audio

A thought that trips a guardrail is edited, never stopped. Set `outputs.streaming.streamThoughts` to show thoughts to your user. Each thought then arrives with the canary, the system-prompt echo, the user-data markers, and any image or link that the bundled checks would block, swapped for a placeholder. A `guardrail` event at stage `thought` reports the swap. The rest of the thought streams on.

In a live session, the transcript of the spoken reply goes through the same window. A native-audio model sends its transcript after its audio, with no timing. A guarded profile therefore holds each audio chunk until the transcript of its own message has passed, or until the next transcript when the message has none. A profile is guarded when it has a canary or `egress.enforce`.

The held chunk then streams, so its words are read before they are heard. What the user heard before a later hit stays heard. The gate withholds from the hit onward.

A guarded live profile always asks the provider for the output transcript: it forces `live.transcription.output` on. Audio from a reply that has no transcript is dropped, not played. A profile with neither a canary nor `egress.enforce` streams audio as it arrives.

## Protect the system prompt

`canary` adds a secret token to the end of the system instruction. A reply that repeats the token is a leak. `promptEcho` also counts 12 words in a row from the system instruction as a leak.

Without `egress`, a leak ends the turn, and the user reads the `error.safety` line. With `egress`, `onBlock` decides.

A speech profile has no system prompt, so its canary is always off.

## Clean what goes in

`sanitizeInput` replaces injection phrasing with a marker. `redactSensitive` does the same for credentials and personal data. Both clean the input text, slots, history, the turn’s `system` text and tool results. The turn then continues with the cleaned text.

`identity.system` is your own text, so Theorem does not clean it.

`redactSensitive` takes `true`, `false` or an object that switches single groups. On input, every group is on by default, including `network`.

```ts frame=profile:text
guardrails: {
	redactSensitive: { network: false },
},
```

## Treat remote tool results as data

A tool result can be the way an attack gets in. Theorem treats remote content as data, never as an instruction.

**Provenance.** Each result records where it came from (`local`, `builtin`, `http`, `mcp` or `delegated`) and how deep the call chain went.

**Fencing.** Remote results reach the model inside `<tool_data tool="..." origin="...">`. Theorem first strips any forged `tool_data` marker from the body, so content cannot claim a friendlier origin than it has.

**Directive advisory.** Some content names a tool that the model can call, gives the agent orders, or claims authority that it cannot have, and points at an external address or URL. That content gets an `advisory` attribute, a short notice, and your lexicon line `advisory.guidance` ([Describing statuses](/docs/statuses)). The advisory informs the model. It does not block.

**Argument inspection.** Theorem scans the model’s arguments before the tool runs. A credential-shaped value that is about to leave as a parameter raises a `tool_call.sensitive-argument` event. Theorem reports it and does not rewrite it.

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
`sanitizeInput`, `redactSensitive` | Yes | Yes | Yes | Yes | No
`canary`, `promptEcho` | Yes | Yes | Off only | No | No
`egress`, `taint` | Yes | Yes | No | No | No
`network` | Yes | Yes | No | Yes | No
`quota` | Yes | Yes | Yes | No | No
`disclosure` | No | No | No | No | Yes

## Know what defineProfile refuses

`defineProfile` refuses any other field with a `config` error. A speech profile has no system prompt, so it takes `canary: false` only.

## Try the input checks without a model

Pass a string to `detectText` to see what the input checks do. It returns the cleaned `text` and the `hits`. For `Ignore all previous instructions.`, `text` is `[omitted - injection].` and the hit rule is `sanitize.injection`. The `@theoremjs/agents/guardrails/testing` entry exports Theorem’s attack corpus and fuzz runners.
