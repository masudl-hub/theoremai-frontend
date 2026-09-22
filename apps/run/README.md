# @theoremai/run

React host for `/playground/run/`. Uses `@theoremai/react` only — no Svelte.

`npm run dev` / `npm run build` at the repo root copy this app into `static/playground/run` so the site serves it on the same origin.

Playground opens `/playground/run/?run=<id>` after writing a keyed localStorage handoff. Refresh keeps that run’s payload.

Optional HMR while editing the run UI: `npm run dev:run` (`:5174`).
