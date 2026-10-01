# Docs contract

The invariant every page of Theorem's public documentation is written to. [SITE_SCHEMA.md](SITE_SCHEMA.md) says how `/docs` is built; this file says what may go on it.

**Clear is kind, and only the package's truth is clear.**

## Readers

Curious people, developers, designers, design engineers, builders, and AI systems that build with Theorem. They do not know this repo and do not need to. They want to know what Theorem is and how to use it.

## Every page

1. **Questions, agreed first.** Before a page is written, its questions are agreed — as many as the page needs, never padded. One is fine. Two are fine. The page opens by showing them to the reader ("This page covers"), then answers them in that order. Anything that serves none of them moves to another page or is cut.
2. **Questions are intention, not taxonomy.** Do not open with *What is X?* when the title already names X. Ask what the reader must do, where it can go wrong, and why they should trust the behaviour (or not). Empathy over inventory.
3. **Answers first.** Each section leads with the answer, short and plain. Detail follows for readers who want it.
4. **Vocabulary is decided term by term.** Internal words (facet, spine, profile graph, protocol dialect, projection) appear only once agreed, and are defined where they first appear. Until then, plain words. File paths, repo structure and history stay out.
5. **No AI-isms.** Authored `/docs` copy is linted against `scripts/docs-banned-voice.json`. *Magic* is allowed. Do not translate a human why into a field list.

## Truth

- A claim is allowed only if it traces to the kernel the site is built from — `../theoremai`, or `THEOREMAI_ROOT` when set — as that checkout stands. The sources are its **public exports and types**, its **implementation source**, and its **JSDoc**.
- Tests and spec documents (e.g. `theoremai/tmp/specs`) are **not** sources.
- When JSDoc and source disagree, the disagreement is raised, not resolved by picking one.
- **No invention.** A claim, default, option, type name or behaviour that cannot be traced is not written. The gap is raised. A visible gap beats a plausible guess.
- The process is slow and careful so the reader's path can be fast.

## Snippets

- A topic page shows only the code that page is about. Getting started carries the full program from the `firstTurn` seed. Do not repeat `defineProfile` / `runTurn` around every field. Modalities may show a full `defineProfile` for one type.
- Getting started compiles from a playground seed (`app/lib/docs/seeds.ts`). Topic pages use literal slices of that shape. Do not hand-type a `defineProfile` that materialises omit defaults.
- There is no build-time composition of a shared profile plus an addition, and no `highlightLines`. A snippet is not type-checked against the kernel yet, so no snippet counts as verified until that check exists.

## When stuck

If the package cannot answer a question a page needs, stop and ask. Do not fill the gap.
