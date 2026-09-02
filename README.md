# theorum-frontend

Interactive site for [THEORUM](https://github.com/masudl-hub/theorum) — docs, traces, and live kernel experiments.

Built with **SvelteKit**. The kernel lives in a nested git submodule at `theorum/`.

## Layout

```text
theorum-frontend/
  theorum/                 # git submodule → masudl-hub/theorum
  src/
    lib/server/theorum.ts  # server-only @theorum/core imports
    lib/server/live-relay.ts # Gemini Live WebSocket relay (guardrails parity)
    lib/server/th30.ts     # Th30 site assistant profile (Live + standardEgressEnforce)
    hooks.server.ts        # upgrades GET /api/live/relay → WebSocket
    routes/
      api/kernel/          # GET version + submodule head
      api/live/relay/      # GET 426 — WebSocket handled in hooks.server.ts
```

## Setup

```bash
git clone --recurse-submodules <this-repo>
cd theorum-frontend
npm install
cp .env.example .env.local   # free-tier OPENROUTER + GEMINI keys
npm run dev
```

If you cloned without submodules:

```bash
npm run theorum:sync
```

Update the nested kernel:

```bash
npm run theorum:pull
```

Kernel changes land in the `theorum/` submodule (or a package checkout you then point the submodule at). The frontend never reads a sibling `../theorum` checkout.

## Development notes

- **Kernel runtime is server-only.** Client components should talk to `/api/*` routes, not import `@theorum/core` directly.
- **Schema vocab is client-safe.** `import { PROTOCOLS, fieldMeta } from '@theorum/schema'` (Vite alias to `theorum/src/kernel/schema.ts`) — closed unions and profile field tips, no Deno or provider graph.
- Vite aliases `@theorum/core` (and related paths) to the nested `theorum/` submodule only.
- **Provider wiring:** server routes call `createProvider(profile, { openAiGateway, gemini, local })`. OpenRouter credentials live under `openAiGateway` (not `openRouter`). Local adapters are available via `theorum/providers/local` if you bypass the factory.
- **Lazy adapters:** importing `@theorum/core` does not load OpenRouter, Google, or local adapter graphs — those load on the first `complete` for that transport.
- **Free models only.** Keys enforce this at the provider — OpenRouter free keys can't reach paid models, Gemini keys are free-tier. The landing playground defaults to `openrouter/free` and validates apiIds at compile time.
- **Tools model:** `tools.allow` is custom function tools only; provider builtins go on `model.config.*.builtInTools`. T0/T1/T2 visibility follows `loadTier` + optional `tools.t1Policy` / `tools.t2Loader` (T2 promotion is turn-local). Live relay resolves wire via `prepareTurnToolSnapshot` (T0/T1 at session start).
- **Playground** compiles `defineProfile` + `registerTool` source — it does not execute `runTurn`.

## Guardrails on this site

| Surface | Inbound | Outbound |
| --- | --- | --- |
| **`/api/live/relay` (WebSocket)** | `prepareLiveInboundText` on client text | `createLiveOutboundGateSession` — rolling canary gate + egress at `turnComplete` |
| **Th30 widget** | Same Live path as relay | `standardEgressEnforce`, `onBlock: refuse_to_user` |

Egress is **opt-in per profile** — set `guardrails.egress.enforce` (the landing playground “default” egress mode wires `standardEgressEnforce` at compile time). Choose “none” to omit egress entirely.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start SvelteKit dev server |
| `npm run build` | Production build |
| `npm run check` | Typecheck |
| `npm run theorum:sync` | Init/update submodule |
| `npm run theorum:pull` | Fast-forward submodule to `origin/main` |

## License

MIT — site code. Kernel license follows `theorum/LICENSE`.
