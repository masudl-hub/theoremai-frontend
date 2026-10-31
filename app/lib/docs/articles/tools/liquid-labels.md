---
title: Liquid Tool Labels
updated: 2026-10-30
summary: Dynamic, typed status label templates for tool activity spinners, approval prompts, and transcripts.
entry: src/kernel/tools/activity-label.ts
covers: src/kernel/tools/activity-label.ts, src/kernel/tools/types.ts
cover: /imagery/th30_steppe.png
coverAlt: Expansive golden grassland steppe under towering cumulus clouds
coverPosition: 50% 50%
---

Model tool calls execute on structured JSON payloads, but end users and UI transcripts need human-readable status text. Showing raw function names and JSON objects creates cluttered interfaces and confusing approval cards.

Theorem tools declare dynamic, typed label templates directly in their definitions. Templates extract arguments, format numbers and dates, evaluate conditional rules, and join compound statements—all verified against your Zod schemas at startup.

## Label Slots

A tool's `labels` block provides templates for four distinct lifecycle states:

```ts frame=tool:mcp
name: 'read_pages',
// ...
labels: {
	activity: 'Reading {urls.0}',
	activityPast: [
		'when urls.length is 1: Read {urls.0}',
		'Read {urls.length} pages',
		'Read pages',
	],
	activityFailed: 'Could not read {urls.0|that page}',
	request: 'read {urls.0}',
},
// ...
```

| Slot | Display Trigger | Available Variables |
| :--- | :--- | :--- |
| **`activity`** | Displayed while the tool is executing (spinner line). | `input` |
| **`activityPast`** | Displayed once the tool completes successfully in the transcript. | `input` and `output` |
| **`activityFailed`** | Displayed when the tool throws an unhandled error or fails. | `input` |
| **`request`** | Displayed on human confirmation cards when the tool hits an approval gate. | `input` |

If a label is omitted, Theorem falls back to formatting the tool's name in natural words (e.g., `read_pages` becomes `"read pages"`).

## Value Placeholders & Formatting

Wrap field names in curly braces `{path}` to insert values from the call. A bare path reads the input, then the output where there is one. `{input.path}` and `{output.path}` read one side:

* **Object Paths**: `{query}`, `{output.result}`
* **Array Indexing**: `{urls.0}`, `{urls.-1}`
* **Automatic Formatting**:
  * Numbers are formatted with locale separators (`14500` $\rightarrow$ `"14,500"`).
  * ISO timestamps are formatted into readable dates (`"2026-10-25T14:00:00Z"` $\rightarrow$ `"Oct 25, 2026, 2:00 PM"`).
  * Control and unprintable characters are sanitized.

### Fallback Values

If an argument is optional, provide a fallback using the pipe syntax `{path|fallback}`:

```text
activityFailed: 'Could not read {urls.0|that page}',
```

If a placeholder has no value and no fallback is specified, that template line does not fit and is discarded.

### Counts

To show a number with the right word, put the word for one and the word for any other number after the path:

```text
activityPast: 'Found {length hit|hits} for {search}',
```

This is the first line of the label on the scout's `search_models`. That tool returns a list, so `length` is the length of the output. The label reads "Found 1 hit" or "Found 3 hits". English plural rules pick the word, so zero reads "0 hits". A third part is the fallback, used when the value is not a number: `{output.total_count hit|hits|some hits}`.

## Conditional Rules (`when`)

Prefix lines with `when <field> is <value>:` to display specialized copy based on arguments. A `when` reads the input only:

```text
labels: {
	activityPast: [
		'when urls.length is 1: Read {urls.0}',
		'Read {urls.length} pages',
		'Read pages', // Fallback line
	],
}
```

### Supported Condition Syntax

* **Equality**: `when urls.length is 1: ...`
* **Negation**: `when urls.length is not 1: ...`
* **Null Checks**: `when <field> is null: ...`, for a field whose schema allows null. A field that the model left out is not null. On a field that can never be null, this throws at registration.
* **Compound Logic**: Join multiple checks with `and`:
  `when urls.length is 1 and maxCharacters is 8000: reading {urls.0} in full`

## Multi-Line Evaluation Order

When an array of template lines is provided, Theorem evaluates them from top to bottom and renders the first line where:
1. Every `when` condition evaluates to true.
2. Every `{path}` placeholder resolves to a defined value (or has a fallback).

> [!IMPORTANT]
> The final line of a multi-line list must always fit—it should have no conditional `when` prefix and use fallbacks on any optional placeholders.

## Compound Joined Lines (`+ `)

To assemble sentences from multiple independent conditions without writing every combination, prefix lines with `+ `:

```text
labels: {
	activity: [
		'+ when urls.length is 1: reading {urls.0}',
		'+ when maxCharacters is 8000: up to 8,000 characters',
		'+ answering {question|your question}',
	],
}
```

Theorem evaluates all matching `+ ` lines in sequence and joins them naturally in words:
* If both checks hold: `"reading https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2, up to 8,000 characters, and answering What datasets are evaluated?"`
* If only the first holds: `"reading https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2 and answering What datasets are evaluated?"`

## Build-Time Schema Validation

Theorem validates label templates at registration time against your Zod `input` and `output` schemas:

* A placeholder referencing `{url}` will throw a `TheoremError('config')` at startup if `url` is not declared in the Zod schema. `read_pages` declares `urls`, so `{url}` throws there.
* A count needs both words: `{total_count hit}` throws. Its path must be a number field or a list's `length`.
* Output variables (e.g. `{output.total_count}`) are allowed only in `activityPast`. Referencing output variables in `activity`, `activityFailed` or `request` throws a build-time configuration error.
* A list whose last line can fail to fit throws too: that line needs no `when`, and a fallback on every placeholder.

## Related Guides

* **[Tools & Execution Pipeline](/docs/tools)**: Declaring tools and execution pipelines.
* **[Tool Permissions & Gates](/docs/tools/gates)**: Using `registerTool.labels.request` in human approval cards.
* **[Kernel Labels & Errors](/docs/profiles/labels)**: Customizing system error copy and localization.
