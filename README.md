# theoremai-frontend

Interactive site for [THEOREM](https://github.com/masudl-hub/theoremai) — docs, traces, and live kernel experiments.

Built with **React Router v8** (framework mode) on **Cloudflare Workers**, with [Astryx](https://astryx.design) via `@theoremai/react`.

> **Migration in progress.** The SvelteKit site was removed on 2026-09-23; its last state is tagged `svelte-final`.
> The playground, facet editors, and marketing sections are being rebuilt in React — read the old versions with
> `git show svelte-final:<path>` (e.g. `src/lib/components/Pillars.svelte`). The live domain is still served by the
> Pages project `theorem`, deployed from that tag.

## Kernel checkout

Requires a sibling clone at `../theoremai` (side-by-side with this repo).

`scripts/resolve-theoremai-root.mjs` + `npm run theoremai:ensure` resolve that path and symlink `node_modules/@theoremai/agents` → it. Stale sibling checkouts (still advertising `freeA` / `GEMINI_FREE_BUCKETS`) are rejected. Set `THEOREMAI_ROOT` to point at a different checkout.

## Layout

```text
../theoremai/                   # sibling kernel + @theoremai/react (react/) + @theoremai/playground (playground/)
theoremai-frontend/
  workers/app.ts                # Worker entry: /api/live/relay upgrade, then React Router
  app/
    root.tsx                    # document shell, error boundary, document cache headers
    routes.ts                   # route table
    cloudflare.ts               # Worker env type + per-request context
    routes/
      home.tsx                  # placeholder until the shared shell lands
      playground.run.tsx        # run host for a compiled playground draft (@theoremai/react)
      api.*.ts                  # resource routes → app/lib/.server/api.ts
    lib/
      .server/                  # server-only (React Router refuses to ship .server modules to the client)
        api.ts                  # framework-free Request → Response handlers
        live-relay.ts           # Gemini Live WebSocket relay (WebSocketPair)
        th30.ts                 # Th30 site assistant profile
        test-connection.ts      # SSRF-guarded tool connection test
      playground/registrations.ts # turn wire contract: custom tools, structured spec, trace destination
  scripts/                      # kernel checkout resolution + build-time kernel metadata
```

## Setup

```bash
# Sibling layout:
#   ../theoremai
#   ./theoremai-frontend
git clone <this-repo>
cd theoremai-frontend
npm install                 # runs theoremai:ensure → symlinks the sibling kernel
cp .env.example .env.local  # free-tier OPENROUTER + GEMINI keys
npm run dev
```

Update the sibling kernel in place; re-run `npm run theoremai:ensure` after pulls.

## Development notes

- **`npm run dev`** runs the Worker in `workerd` through `@cloudflare/vite-plugin`, so local dev matches production — including the `/api/live/relay` WebSocket upgrade. Secrets load from `.env.local`.
- **Run tab:** the playground opens `/playground/run?run=<id>`. The compiled draft lives in this browser's localStorage, so the route loads it in a `clientLoader`; without a draft it redirects home.
- **Kernel runtime is server-only.** Client code talks to `/api/*` routes, not `@theoremai/agents` directly; server modules live under `app/lib/.server/`.
- **Schema vocab is client-safe.** `import { PROTOCOLS, fieldMeta } from '@theoremai/agents/schema'` — closed unions and profile field tips, no Deno or provider graph.
- Local development installs the sibling `../theoremai` checkout as the real `@theoremai/*` file dependencies; no source aliases are used.
- **Provider wiring:** server routes call `createProvider(profile, { openAiGateway, gemini, local })`. OpenRouter credentials live under `openAiGateway` (not `openRouter`).
- **Lazy adapters:** importing `@theoremai/agents` does not load OpenRouter, Google, or local adapter graphs — those load on the first `complete` for that transport.
- **Free models only.** Keys enforce this at the provider — OpenRouter free keys can't reach paid models, Gemini keys are free-tier.
- **Google vault slots:** playground `model.key` must be `slotA` | `slotB` | `slotC` for Google transports — compile does not invent a key.
- **Tools model:** `tools.allow` is custom function tools only; provider builtins go on `model.config.*.builtInTools`. Live sessions (`runSession`) are T0-only — function declarations are fixed at setup.

## Guardrails on this site

| Surface | Inbound | Outbound |
| --- | --- | --- |
| **`/api/live/relay` (WebSocket)** | `runSession` (inbound prep + outbound gate inside THEOREM) | Host pipes browser ↔ session; tool replies on the same socket |
| **Th30 profile** | Same Live path as relay | `standardEgressEnforce`, `onBlock: refuse_to_user` |

Egress is **opt-in per profile** — set `guardrails.egress.enforce`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the site in local `workerd` |
| `npm run build` | Production build (client assets + Worker) |
| `npm run check` | Generate route types, then typecheck |
| `npm run lint` | ESLint, Biome, and fallow |
| `npm run deploy` | Build and `wrangler deploy` the `theorem-site` Worker — not yet the live domain |
| `npm run theoremai:ensure` | Symlink the sibling `../theoremai` checkout |
| `npm run theoremai:pull` | Fast-forward sibling `../theoremai` to `origin/main` |

## License

MIT — site code. Kernel license follows `../theoremai/LICENSE`.
