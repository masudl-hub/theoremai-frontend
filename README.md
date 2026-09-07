# theorum-frontend

Interactive site for [THEORUM](https://github.com/masudl-hub/theorum) — docs, traces, and live kernel experiments.

Built with **SvelteKit**.

## Kernel checkout

The frontend does **not** treat the nested `theorum/` git submodule as the live package when a sibling clone exists.

Resolution order (`scripts/resolve-theorum-root.mjs` + `npm run theorum:ensure`):

1. **Sibling** `../theorum` (preferred for local side-by-side work)
2. **Nested submodule** `./theorum` — only if sibling is missing **and** the submodule is not detectably stale

Vite aliases and `node_modules/theorum` both follow that resolution. A stale nested tree (still advertising `freeA` / `GEMINI_FREE_BUCKETS`) is rejected with an error — see `theorum/NOT_AUTHORITATIVE.md`.

## Layout

```text
theorum-frontend/
  theorum/                 # git submodule fallback (not preferred when ../theorum exists)
  scripts/
    vite-live-relay-plugin.mjs # local vite WebSocket upgrade for /api/live/relay
  src/
    lib/server/theorum.ts  # kernel version label helpers for the site
    lib/server/live-relay.ts # Gemini Live WebSocket relay (CF + local Node paths)
    lib/server/th30.ts     # Th30 site assistant profile (Live + standardEgressEnforce)
    routes/
      api/kernel/          # GET version + kernel head
      api/live/relay/      # Cloudflare Pages WebSocket upgrade → handleLiveRelay
```

## Setup

```bash
# Preferred: sibling kernel + this repo
#   ../theorum
#   ./theorum-frontend
git clone <this-repo>
cd theorum-frontend
npm install                 # runs theorum:ensure → symlinks node_modules/theorum → sibling
cp .env.example .env.local  # free-tier OPENROUTER + GEMINI keys
npm run dev
```

Fallback without a sibling (submodule must be current):

```bash
git clone --recurse-submodules <this-repo>
npm run theorum:sync
npm install
```

Update the preferred sibling kernel in place; re-run `npm run theorum:ensure` after pulls.

## Development notes

- **Th30 / Live WebSocket:** production uses Cloudflare `WebSocketPair` in `/api/live/relay`. Local `npm run dev` serves the same path through `scripts/vite-live-relay-plugin.mjs` (Node `ws` + standard upstream WebSocket). Requires `GEMINI_API_KEY` in `.env.local`.
- **Kernel runtime is server-only.** Client components should talk to `/api/*` routes, not import `@theorum/core` directly.
- **Schema vocab is client-safe.** `import { PROTOCOLS, fieldMeta } from '@theorum/schema'` (Vite alias via `resolveTheorumRoot`) — closed unions and profile field tips, no Deno or provider graph.
- Vite aliases `@theorum/core` (and related paths) through `resolveTheorumRoot()` — sibling first, submodule only as a non-stale fallback.
- **Provider wiring:** server routes call `createProvider(profile, { openAiGateway, gemini, local })`. OpenRouter credentials live under `openAiGateway` (not `openRouter`). Local adapters are available via `theorum/providers/local` if you bypass the factory.
- **Lazy adapters:** importing `@theorum/core` does not load OpenRouter, Google, or local adapter graphs — those load on the first `complete` for that transport.
- **Free models only.** Keys enforce this at the provider — OpenRouter free keys can't reach paid models, Gemini keys are free-tier. The landing playground defaults to `openrouter/free` and validates apiIds at compile time.
- **Google vault slots:** playground `model.key` must be `slotA` | `slotB` | `slotC` for Google transports — compile does not invent a key.
- **Tools model:** `tools.allow` is custom function tools only; provider builtins go on `model.config.*.builtInTools`. T0/T1/T2 visibility follows `loadTier` + optional `tools.t1Policy` / `tools.t2Loader` (T2 promotion is turn-local). Live sessions open via `runSession` (T0/T1 expanded at session start).
- **Playground** compiles `defineProfile` + `registerTool` source — it does not execute `runTurn`.

## Guardrails on this site

| Surface | Inbound | Outbound |
| --- | --- | --- |
| **`/api/live/relay` (WebSocket)** | `runSession` (inbound prep + outbound gate inside THEORUM) | Host pipes browser ↔ session; tool replies on the same socket |
| **Th30 widget** | Same Live path as relay | `standardEgressEnforce`, `onBlock: refuse_to_user` |

Egress is **opt-in per profile** — set `guardrails.egress.enforce` (the landing playground “default” egress mode wires `standardEgressEnforce` at compile time). Choose “none” to omit egress entirely.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start SvelteKit dev server |
| `npm run build` | Production build |
| `npm run check` | Typecheck |
| `npm run theorum:ensure` | Symlink `node_modules/theorum` → resolved kernel (sibling preferred) |
| `npm run theorum:sync` | Init/update submodule |
| `npm run theorum:pull` | Fast-forward submodule to `origin/main` |

## License

MIT — site code. Kernel license follows `theorum/LICENSE`.
