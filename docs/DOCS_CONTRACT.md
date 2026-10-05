# Docs contract

The invariant every page of Theorem's public documentation is written to. [SITE_SCHEMA.md](SITE_SCHEMA.md) says how `/docs` is built; this file says what may go on it.

**Clear is kind, and only the package's truth is clear.**

## Readers

Curious people, developers, designers, design engineers, builders, and AI systems that build with Theorem. They do not know this repo and do not need to. They want to know what Theorem is and how to use it.

## Every page

1. **A page tells one story.** It states the idea, draws it when a picture helps, then gives the steps in the order the reader does them. Anything that does not serve the story moves to another page or is cut. A page does not open with a list of questions.
2. **Each section opens with what the thing is and why the reader wants it.** Do not open with *What is X?* when the title already names X. Say what the reader must do, where it can go wrong, and why they can trust the behaviour (or not). Parallel items are a list.
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
- There is no build-time composition of a shared profile plus an addition, and no `highlightLines`. `npm run lint:docs` type-checks every `ts` snippet against the kernel. A snippet with an `import` is a whole program. Any other names a frame on its fence line (` ```ts frame=statements `), which says how the check completes it.

## When stuck

If the package cannot answer a question a page needs, stop and ask. Do not fill the gap.
