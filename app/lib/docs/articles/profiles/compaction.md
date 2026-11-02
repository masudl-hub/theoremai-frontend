---
title: History Compaction
updated: 2026-11-02
summary: Automated transcript compaction and exchange pruning for long-running conversations.
entry: src/kernel/engine/runner/mod.ts
covers: src/kernel/engine/runner, src/kernel/registry/profiles.ts
cover: /imagery/th30_peatbog.png
coverAlt: Rich dark peat moss and amber pools from above
coverPosition: 50% 50%
---

Over long-running conversations, dialogue history consumes substantial token budgets and risks exceeding model context windows. Left unmanaged, long histories degrade model reasoning and increase latency.

In Theorem, **history compaction** automatically condenses older exchanges into a summary while preserving recent context verbatim.

```figure
{
  "kind": "lanes",
  "still": {
    "src": "/imagery/th30_cloud.png",
    "position": "50% 50%"
  },
  "caption": "The scout's history at 24,000 tokens. The older exchanges become one summary, and the last four stay word for word.",
  "lanes": [
    "Before",
    "The compactor",
    "After"
  ],
  "steps": [
    {
      "lane": "Before",
      "label": "History over 24,000 tokens",
      "text": "compactAt: 0.75 of maxTokens: 32_000.",
      "kind": "store",
      "parts": [
        {
          "label": "Older exchanges",
          "text": "These go to the compactor."
        },
        {
          "label": "Last 4 exchanges",
          "text": "previousExchanges: 4 keeps these as they are."
        }
      ]
    },
    {
      "lane": "The compactor",
      "label": "research.compactor",
      "text": "A text profile with no tools. It keeps every source URL, every exact quote and every open lead.",
      "kind": "profile"
    },
    {
      "lane": "After",
      "label": "Shorter history",
      "text": "The summary comes first, then the messages that were kept.",
      "kind": "store",
      "parts": [
        {
          "label": "Summary",
          "text": "The compactor's text, in place of the older exchanges."
        },
        {
          "label": "Last 4 exchanges",
          "text": "Unchanged."
        }
      ]
    }
  ]
}
```

## The Compaction Specification (`compaction`)

Compaction is configured directly on a profile's model binding. Each of the scout's models hands its history to `research.compactor`, a text profile with no tools and one instruction: "Summarise the research so far. Keep every source URL, every exact quote, and every open lead." This is the `compaction` of the `open` model:

```ts frame=models
models: {
	open: {
		// ...
		compaction: {
			maxTokens: 32_000,
			compactAt: 0.75, // Trigger when tokens exceed 24,000 (0.75 * 32,000)
			profile: 'research.compactor', // The profile that writes the summary
			previousExchanges: 4, // Retain the last 4 exchanges verbatim
			timing: 'before', // Run compaction synchronously before the turn
		},
	},
}
```

### Configuration Parameters

* **`maxTokens`**: The baseline token ceiling against which compaction thresholds are evaluated.
* **`compactAt`**: Fraction of `maxTokens` (between `0` and `1`) that activates compaction. In the example above, compaction fires once tokens exceed 24,000 ($0.75 \times 32,000$).
* **`previousExchanges`**: Governs how much recent dialogue is preserved:
  * `≥ 1` (integer): Preserves the last $N$ user-assistant exchanges intact.
  * `(0, 1)` (fraction): Preserves exchanges that fit within that fraction of `maxTokens`. It must be below `compactAt`.
  * `0`: Compacts all history; nothing is retained verbatim.
* **`meter`**: Determines how tokens are calculated:
  * `'history'` (default): Counts the tokens in the earlier conversation.
  * `'input'`: Uses the prompt tokens the provider reported for the last call, or the count the host passes in.
* **`profile`**: The text profile that writes the summary. Register it before this one. Leave it out and a text agent summarises its own history, with its own instructions and model and no tools. Other profile types must name one.
* **`trigger`**: Your function that decides when to compact: it gets `ctx` and returns, or resolves to, `true` to compact. When set, it decides alone: `compactAt` and `maxTokens` are not compared. `ctx` carries the token count and the meter it used.

## Timing: Synchronous vs Asynchronous Compaction

Compaction runs at one of two times: before the turn, or after it in the background.

### 1. Synchronous (`timing: 'before'`)

The kernel evaluates token counts before calling the model. If compaction is needed, it runs the compactor immediately, splices the summary into the history, and executes the turn against the fresh history.

```figure
{
  "kind": "lanes",
  "still": {
    "src": "/imagery/th30_nightide.png",
    "position": "30% 50%"
  },
  "caption": "timing: 'before'. The turn waits for the compactor, and the model reads the shorter history on that turn.",
  "lanes": [
    "Your code",
    "Theorem",
    "The model"
  ],
  "steps": [
    {
      "lane": "Your code",
      "label": "You call runTurn",
      "text": "You pass the history so far.",
      "kind": "ingress"
    },
    {
      "lane": "Theorem",
      "label": "Theorem measures the history",
      "text": "It compares the count with compactAt of maxTokens, or asks your trigger. Under the threshold, the turn runs as it is.",
      "kind": "guardrail"
    },
    {
      "lane": "The model",
      "label": "The compactor summarises",
      "text": "A nested turn with no tools summarises the older messages.",
      "kind": "model"
    },
    {
      "lane": "Theorem",
      "label": "Theorem yields a compaction event",
      "text": "It carries the outcome, the message and token counts, and the summary.",
      "kind": "stream"
    },
    {
      "lane": "The model",
      "label": "The model answers",
      "text": "It reads the summary and the messages that were kept.",
      "kind": "model"
    },
    {
      "lane": "Your code",
      "label": "You get the turn's events",
      "text": "The turn ends with done.",
      "kind": "egress"
    }
  ]
}
```

The active turn absorbs the compactor's execution latency, and the model reads the shorter history on that same turn. During execution, Theorem emits a `compaction` lifecycle event containing the outcome, the message and token counts, and the generated summary.

### 2. Asynchronous (`timing: 'after'`)

The scout compacts before the turn. To compact after it instead, set `timing: 'after'`. The turn then executes without waiting for the compactor. At the conclusion of the turn, the kernel checks whether compaction thresholds were crossed. If so, it attaches a compaction signal to the `done` event as its `compaction` field.

```figure
{
  "kind": "lanes",
  "still": {
    "src": "/imagery/th30_nightide.png",
    "position": "70% 50%"
  },
  "caption": "timing: 'after'. Your code runs the compactor after the turn, in the background.",
  "lanes": [
    "Your code",
    "Theorem",
    "The model"
  ],
  "steps": [
    {
      "lane": "Your code",
      "label": "You call runTurn",
      "text": "You pass the history so far.",
      "kind": "ingress"
    },
    {
      "lane": "The model",
      "label": "The model answers",
      "text": "It reads the whole history.",
      "kind": "model"
    },
    {
      "lane": "Theorem",
      "label": "Theorem measures the history",
      "text": "This runs before done is delivered. The compactor does not.",
      "kind": "guardrail"
    },
    {
      "lane": "Your code",
      "label": "You read done.compaction",
      "text": "It is there only when the history needs compacting.",
      "kind": "ingress"
    },
    {
      "lane": "Your code",
      "label": "You call compactHistory",
      "text": "You pass the history and tokens from done.compaction.",
      "kind": "ingress"
    },
    {
      "lane": "The model",
      "label": "The compactor summarises",
      "text": "It runs on your host options, away from any turn.",
      "kind": "model"
    },
    {
      "lane": "Your code",
      "label": "You save the result",
      "text": "result.history comes first, then this turn's messages.",
      "kind": "store"
    }
  ]
}
```

The host application reads this signal and triggers out-of-band compaction in the background:

```ts frame=statements
// Inside your turn event consumer
if (doneEvent.compaction) {
	const result = await compactHistory(
		{
			profile: 'research.scout',
			model: 'gemini', // The model the turn ran on
			history: doneEvent.compaction.history,
			tokens: doneEvent.compaction.tokens,
		},
		hostOptions,
	);

	// undefined: there was nothing to compact
	if (result) {
		// Put this turn's messages after result.history, and persist that
		await saveSessionHistory(sessionId, result.history);
	}
}
```

* **`history`**: `done.compaction` carries the history the turn was given, before its own message and reply. Those are not compacted, so put them after `result.history` when you save it.
* **`model`**: The binding whose `compaction` applies. Left out, it is `defaultModel`.
* **Second argument**: The compactor runs a model, so `compactHistory()` takes the same host options as `runTurn()`, such as the `vault`.

`compactHistory()` also takes the controls every run takes: `signal`, `metadata`, `traceparent`, `projectId`, `conversationId` and `links`. So the compaction's trace joins the conversation it belongs to.

This model is ideal for user-facing applications where response latency is critical, shifting summarization work to background tasks between turns.

## Compaction Mechanics & Fault Tolerance

Compaction operates with deterministic rules to prevent data loss or context overflow:

1. **Exchange Splitting**: `splitForCompaction` divides messages into `toCompact` (older) and `toRetain` (recent).
2. **Tool Call Sanitization**: In `toCompact`, tool invocations and results are converted into plain text messages. The compaction agent requires no tool declarations to summarize past actions.
3. **Summary Injection**: The resulting text summary is prepended to `toRetain` with `metadata: { compactionSummary: true }`.
4. **Resilient Failure Handling**:
   * If the compactor fails and the history still fits `maxTokens`, the history is kept whole (`outcome: 'deferred'`). A later turn can try again.
   * If the compactor fails over `maxTokens`, the messages in `toCompact` are dropped (`outcome: 'dropped'`). Earlier compaction summaries among them stay. The result carries the `failure`.

## Suggested Reading

* **[Model Bindings](/docs/profiles/bindings)**: Binding upstream models, protocols, providers, and execution budgets.
* **[Text Agents](/docs/profiles/text)**: Invoking conversational agents via `runTurn()` and handling stream events.
* **[Turn Resumption & Steering](/docs/profiles/resumption)**: Managing human-in-the-loop gates, auto-continuations, and mid-turn steering affordances.
