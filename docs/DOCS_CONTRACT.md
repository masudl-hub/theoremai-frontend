# Docs contract

The invariant every page of Theorem's public documentation is written to. [SITE_SCHEMA.md](SITE_SCHEMA.md) says how `/docs` is built; this file says what may go on it.

**Clear is kind, and only the package's truth is clear.**

## Readers

Curious people, developers, designers, design engineers, builders, and AI systems that build with Theorem. They do not know this repo and do not need to. They want to know what Theorem is and how to use it.

## Every page

1. **Three questions, agreed first.** Before a page is written, its three questions are agreed. The page opens by showing them to the reader ("This page answers"), then answers them in that order. Anything that serves none of the three moves to another page or is cut.
2. **Answers first.** Each section leads with the answer, short and plain. Detail follows for readers who want it.
3. **Vocabulary is decided term by term.** Internal words (facet, spine, profile graph, protocol dialect, projection) appear only once agreed, and are defined where they first appear. Until then, plain words. File paths, repo structure and history stay out.

## Truth

- A claim is allowed only if it traces to the kernel the site is built from — `../theoremai`, or `THEOREMAI_ROOT` when set — as that checkout stands. The sources are its **public exports and types**, its **implementation source**, and its **JSDoc**.
- Tests and spec documents (e.g. `theoremai/tmp/specs`) are **not** sources.
- When JSDoc and source disagree, the disagreement is raised, not resolved by picking one.
- **No invention.** A claim, default, option, type name or behaviour that cannot be traced is not written. The gap is raised. A visible gap beats a plausible guess.
- The process is slow and careful so the reader's path can be fast.

## Snippets

- Every snippet a reader sees is complete and runnable: imports included, nothing elided. The page's `.md` twin and `llms.txt` carry the same full code.
- An example is authored as only what it adds. The shared profile comes from one source compiled from a playground seed (`app/lib/docs/seeds.ts`) — never a hand-typed `defineProfile` with materialised defaults.
- Profile and addition are composed at build time, and every composed snippet type-checks against the kernel. `highlightLines` marks the addition.
- Biome passing is not proof. A snippet is verified only by type-checking against the package. That check does not exist yet, so no snippet counts as verified until it does.

## When stuck

If the package cannot answer a question a page needs, stop and ask. Do not fill the gap.
