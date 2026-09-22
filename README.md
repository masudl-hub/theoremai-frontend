# theoremai-frontend

Interactive site for [THEOREM](https://github.com/masudl-hub/theoremai) — docs, traces, and live kernel experiments.

Built with **SvelteKit** (marketing + playground author) and **React** (`@theoremai/react` run SPA at `/playground/run/`).

## Kernel checkout

Requires a sibling clone at `../theoremai` (side-by-side with this repo).

`scripts/resolve-theoremai-root.mjs` + `npm run theoremai:ensure` resolve that path and symlink `node_modules/theorem` → it. Stale sibling checkouts (still advertising `freeA` / `GEMINI_FREE_BUCKETS`) are rejected.

## Layout

```text
../theoremai/                # sibling kernel + @theoremai/react at react/
theoremai-frontend/
  apps/run/                # Vite React host for /playground/run/ (consumes @theoremai/react)
  scripts/
    vite-live-relay-plugin.mjs # local vite WebSocket upgrade for /api/live/relay
    sync-run-static.mjs    # copy apps/run/dist → static/playground/run
  src/
    lib/server/theorem.ts  # kernel version label helpers for the site
    lib/server/live-relay.ts # Gemini Live WebSocket relay (CF + local Node paths)
    lib/server/th30.ts     # Th30 site assistant profile (Live + standardEgressEnforce)
    routes/
      api/kernel/          # GET version + kernel head
      api/live/relay/      # Cloudflare Pages WebSocket upgrade → handleLiveRelay
```

## Setup

```bash
# Sibling layout:
#   ../theoremai
#   ./theoremai-frontend
git clone <this-repo>
cd theoremai-frontend
npm install                 # runs theoremai:ensure → symlinks node_modules/theorem → sibling
cp .env.example .env.local  # free-tier OPENROUTER + GEMINI keys
npm run dev
```

Update the sibling kernel in place; re-run `npm run theoremai:ensure` after pulls.

## Development notes

- **`npm run dev`** builds the React run SPA into `static/playground/run/` then starts SvelteKit. Playground “Run” opens `/playground/run/?run=<id>` on the same origin (no second server). Refresh keeps that run id’s payload in localStorage.
- **`npm run dev:run`** — optional Vite HMR for `@theoremai/react` alone on `:5174` while iterating on the run UI.
- **Th30 / Live WebSocket:** production uses Cloudflare `WebSocketPair` in `/api/live/relay`. Local `npm run dev` serves the same path through `scripts/vite-live-relay-plugin.mjs` (Node `ws` + standard upstream WebSocket). Requires `GEMINI_API_KEY` in `.env.local`.
- **Kernel runtime is server-only.** Client components should talk to `/api/*` routes, not import `@theoremai/agents` directly.
- **Schema vocab is client-safe.** `import { PROTOCOLS, fieldMeta } from '@theoremai/agents/schema'` — closed unions and profile field tips, no Deno or provider graph.
- Local development installs the sibling `../theoremai` checkout as the real `@theoremai/*` file dependencies; no source aliases are used.
- **Provider wiring:** server routes call `createProvider(profile, { openAiGateway, gemini, local })`. OpenRouter credentials live under `openAiGateway` (not `openRouter`). Local adapters are available via `@theoremai/agents/providers/local` if you bypass the factory.
- **Lazy adapters:** importing `@theoremai/agents` does not load OpenRouter, Google, or local adapter graphs — those load on the first `complete` for that transport.
- **Free models only.** Keys enforce this at the provider — OpenRouter free keys can't reach paid models, Gemini keys are free-tier. The landing playground defaults to `openrouter/free` and validates apiIds at compile time.
- **Google vault slots:** playground `model.key` must be `slotA` | `slotB` | `slotC` for Google transports — compile does not invent a key.
- **Tools model:** `tools.allow` is custom function tools only; provider builtins go on `model.config.*.builtInTools`. T0/T1/T2 visibility follows `loadTier` + optional `tools.t1Policy` / `tools.t2Loader` (T2 promotion is turn-local). Live sessions (`runSession`) are T0-only — function declarations are fixed at setup.
- **Playground** compiles `defineProfile` + `registerTool` source — it does not execute `runTurn`.

## Guardrails on this site

| Surface | Inbound | Outbound |
| --- | --- | --- |
| **`/api/live/relay` (WebSocket)** | `runSession` (inbound prep + outbound gate inside THEOREM) | Host pipes browser ↔ session; tool replies on the same socket |
| **Th30 widget** | Same Live path as relay | `standardEgressEnforce`, `onBlock: refuse_to_user` |

Egress is **opt-in per profile** — set `guardrails.egress.enforce` (the landing playground “default” egress mode wires `standardEgressEnforce` at compile time). Choose “none” to omit egress entirely.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Build React run into `static/`, then start the site |
| `npm run build` | Build React run into `static/`, then SvelteKit |
| `npm run check` | Typecheck |
| `npm run theoremai:ensure` | Symlink `node_modules/theorem` → sibling `../theoremai` |
| `npm run theoremai:pull` | Fast-forward sibling `../theoremai` to `origin/main` |

## License

MIT — site code. Kernel license follows `../theoremai/LICENSE`.
