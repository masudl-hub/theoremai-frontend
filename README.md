# theorum-frontend

Interactive site for [THEORUM](https://github.com/masudl-hub/theorum) — docs, traces, and live kernel experiments.

Built with **SvelteKit**. The kernel lives in a nested git submodule at `theorum/`.

## Layout

```text
theorum-frontend/
  theorum/                 # git submodule → masudl-hub/theorum
  src/
    lib/server/theorum.ts  # server-only @theorum/core imports
    routes/
      playground/          # interactive UI (replace with your mock)
      api/turn/            # POST smoke turn via nested kernel
      api/kernel/          # GET version + submodule head
```

## Setup

```bash
git clone --recurse-submodules <this-repo>
cd theorum-frontend
npm install
cp .env.example .env   # add OPENROUTER_API_KEY for live turns
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

## Development notes

- **Kernel imports are server-only.** Client components should talk to `/api/*` routes, not import `@theorum/core` directly.
- Vite aliases `@theorum/core` to `theorum/mod.ts` so the site tracks submodule source during development.
- Transitive npm deps (`ai`, `@openrouter/ai-sdk-provider`, `gpt-tokenizer`) are listed in this repo because the kernel source is bundled through Vite SSR.

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
