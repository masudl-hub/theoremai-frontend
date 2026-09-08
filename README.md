# theorum-frontend

Interactive site for [THEORUM](https://github.com/masudl-hub/theorum) — docs, traces, and live kernel experiments.

Built with **SvelteKit** (marketing + playground author) and **React** (`@theorum/react` run SPA at `/playground/run/`).

## Kernel checkout

Requires a sibling clone at `../theorum` (side-by-side with this repo).

`scripts/resolve-theorum-root.mjs` + `npm run theorum:ensure` resolve that path and symlink `node_modules/theorum` → it. Stale sibling checkouts (still advertising `freeA` / `GEMINI_FREE_BUCKETS`) are rejected.

## Layout

```text
../theorum/                # sibling kernel + @theorum/react at react/
theorum-frontend/
  apps/run/                # Vite React host for /playground/run/ (consumes @theorum/react)
  scripts/
    vite-live-relay-plugin.mjs # local vite WebSocket upgrade for /api/live/relay
    sync-run-static.mjs    # copy apps/run/dist → static/playground/run
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
# Sibling layout:
#   ../theorum
#   ./theorum-frontend
git clone <this-repo>
cd theorum-frontend
npm install                 # runs theorum:ensure → symlinks node_modules/theorum → sibling
cp .env.example .env.local  # free-tier OPENROUTER + GEMINI keys
npm run dev
```

Update the sibling kernel in place; re-run `npm run theorum:ensure` after pulls.

## Development notes

- **`npm run dev`** builds the React run SPA into `static/playground/run/` then starts SvelteKit. Playground “Run” opens `/playground/run/` on the same origin (no second server).
- **`npm run dev:run`** — optional Vite HMR for `@theorum/react` alone on `:5174` while iterating on the run UI.
- **Th30 / Live WebSocket:** production uses Cloudflare `WebSocketPair` in `/api/live/relay`. Local `npm run dev` serves the same path through `scripts/vite-live-relay-plugin.mjs` (Node `ws` + standard upstream WebSocket). Requires `GEMINI_API_KEY` in `.env.local`.
- **Kernel runtime is server-only.** Client components should talk to `/api/*` routes, not import `@theorum/core` directly.
- **Schema vocab is client-safe.** `import { PROTOCOLS, fieldMeta } from '@theorum/schema'` (Vite alias via `resolveTheorumRoot`) — closed unions and profile field tips, no Deno or provider graph.
- Vite aliases `@theorum/core` (and related paths) through `resolveTheorumRoot()` → sibling `../theorum`.
- **Provider wiring:** server routes call `createProvider(profile, { openAiGateway, gemini, local })`. OpenRouter credentials live under `openAiGateway` (not `openRouter`). Local adapters are available via `theorum/providers/local` if you bypass the factory.
- **Lazy adapters:** importing `@theorum/core` does not load OpenRouter, Google, or local adapter graphs — those load on the first `complete` for that transport.
- **Free models only.** Keys enforce this at the provider — OpenRouter free keys can't reach paid models, Gemini keys are free-tier. The landing playground defaults to `openrouter/free` and validates apiIds at compile time.
- **Google vault slots:** playground `model.key` must be `slotA` | `slotB` | `slotC` for Google transports — compile does not invent a key.
- **Tools model:** `tools.allow` is custom function tools only; provider builtins go on `model.config.*.builtInTools`. T0/T1/T2 visibility follows `loadTier` + optional `tools.t1Policy` / `tools.t2Loader` (T2 promotion is turn-local). Live sessions (`runSession`) are T0-only — function declarations are fixed at setup.
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
| `npm run dev` | Build React run into `static/`, then start the site |
| `npm run build` | Build React run into `static/`, then SvelteKit |
| `npm run check` | Typecheck |
| `npm run theorum:ensure` | Symlink `node_modules/theorum` → sibling `../theorum` |
| `npm run theorum:pull` | Fast-forward sibling `../theorum` to `origin/main` |

## License

MIT — site code. Kernel license follows `../theorum/LICENSE`.
