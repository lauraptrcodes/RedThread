# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

The git root contains a single SvelteKit app in `red-thread/`. Run all commands from that directory. The project is a fresh `sv` scaffold (TypeScript, Tailwind v4, Drizzle + libSQL/SQLite, Vitest, ESLint, Prettier). So far the only domain code is the `tracks` table in `src/lib/server/db/schema.ts`, which holds DJ tracks with title, artist, BPM, Camelot key (e.g. `"8A"`) and energy (1–10).

## Commands (from `red-thread/`)

```sh
npm run dev              # dev server
npm run build            # production build (adapter-auto)
npm run check            # svelte-kit sync + svelte-check (type checking)
npm run lint             # prettier --check + eslint
npm run format           # prettier --write
npm test                 # all Vitest projects, single run
npm run test:unit        # Vitest in watch mode

# single test file / single project / single test name
npx vitest run src/lib/vitest-examples/greet.spec.ts
npx vitest run --project server        # or --project client
npx vitest run -t "renders greetings"

npm run db:push          # push schema.ts to the DB (no migration files)
npm run db:generate      # generate migration files
npm run db:migrate       # apply migrations
npm run db:studio        # Drizzle Studio
```

`DATABASE_URL` must be set (see `.env.example`: `file:local.db`). Both `drizzle.config.ts` and the runtime DB module throw if it is missing.

## Architecture and conventions

- **SvelteKit 3 with no `svelte.config.js`.** The SvelteKit config, including the adapter and compiler options, goes through the `sveltekit({...})` plugin in `vite.config.ts`. Runes mode is forced for every non-`node_modules` file, so use `$props`, `$state` and `$derived`, not legacy `export let` or `$:`.
- **Styling uses Tailwind CSS v4 utility classes** in the markup. Avoid component `<style>` blocks and separate CSS files. Tailwind runs through the `@tailwindcss/vite` plugin and is loaded once in `src/routes/layout.css` (`@import 'tailwindcss'`). There is no `tailwind.config.js`: put theme customizations (colors, fonts, etc.) in `layout.css` with `@theme`. Google Fonts are loaded with `<link>` tags in `src/app.html`, then mapped to a utility in `@theme` (e.g. `--font-display` → `font-display` for Climate Crisis). Colors are semantic tokens in `@theme` (`background`, `body`, `heading`, `link`, `muted`, `accent`), so use `text-muted`, `bg-accent`, etc. rather than raw hex values. Base element styles (body, h1–h3, a) are set in `@layer base` in the same file.
- **Imports use Node subpath imports** (`#lib`, `#lib/*` in `package.json`) instead of `$lib`, e.g. `import favicon from '#lib/assets/favicon.svg'`. Always write the full file path with its extension: `#lib/tracks.ts` and `#lib/server/db/index.ts` work, but `#lib/tracks` or `#lib/server/db` fail type checking.
- **Mutations use classic form actions** (`+page.server.ts` `actions` + `use:enhance`). Remote functions are still behind `experimental.remoteFunctions` in this Kit version and are not enabled. Form parsing and validation live in plain, unit-testable modules (e.g. `parseTrackForm` in `src/lib/tracks.ts`). The action returns `fail(400, { values, errors })` so the form can show the input again.
- **Domain helpers**: `src/lib/camelot.ts` holds the Camelot wheel keys (1A–12B). `src/lib/mixing.ts` holds the harmonic-mixing rules: key match, BPM match, transition score and `suggestNext`. Change thresholds and rules there, not in components.
- **Sets**: `sets` plus `set_tracks` (`setId`, `trackId`, `position`, unique per set+track). `position` starts at 1 and stays gapless. Change it only through the transactional helpers in `src/lib/server/sets.ts` (add appends, remove renumbers, move swaps with the neighbour). `deleteSet` removes `set_tracks` explicitly rather than relying on SQLite FK cascades. Routes: `/sets` (list/create/delete) and `/sets/[id]` (ordering, transitions, suggestions).
- **Order generator** (`src/lib/setGenerator.ts`, pure and seeded): `MODES` defines energy curves over the set (0–1 position → 0–1 energy quantile of the set's own energies). Tracks without energy get an estimate from BPM (`effectiveEnergies`): the set's BPM range is mapped onto the known energy range, or 1–10 if there is none. All energy logic and the chart use these effective values. The cost is a weighted mix of the energy-curve deviation and the transition cost from `mixing.ts`. The search is a randomized greedy construction plus swap/reverse local search over several runs. The `avoid` list makes "Neu generieren" return a different near-optimal order. It runs client-side in `OrderGenerator.svelte`. Only "Übernehmen" hits the server (`applyOrder` → `reorderSet`, which rejects orders that no longer match the set's tracks).
- **Rekordbox import** (`/import`): `src/lib/rekordbox.ts` parses the collection XML client-side with `fast-xml-parser` (tracks plus playlists, KeyType 0 = TrackID, 1 = Location). `ImportPreview.svelte` is an editable preview table that validates each row with `parseTrackInput`. The `importTracks` action re-validates and inserts through `src/lib/server/tracks.ts`, which skips duplicates by `trackIdentity` (artist + title, case-insensitive). `toCamelot` in `camelot.ts` normalizes musical, Open Key and Camelot notation. Track validation accepts any of these, so use `parseTrackInput` for non-form input.
- **Links** must go through `resolve()` from `$app/paths` (ESLint rule `svelte/no-navigation-without-resolve`), e.g. `resolve('/sets/[id]', { id: String(set.id) })`.
- `npm test` also runs the browser project, which needs Playwright's Chromium (`npx playwright install chromium`). Without it, use `npx vitest run --project server`.
- **Env vars** are declared in `src/env.ts` with `defineEnvVars` and read through `$app/env/private` (server) or the matching public modules. Declare any new env var in `src/env.ts`.
- **DB**: `src/lib/server/db/index.ts` exports a Drizzle `db` (libSQL client) with the full schema attached. Keep it under `src/lib/server/` so it is never bundled into client code.
- **Tests run as two Vitest projects** (defined in `vite.config.ts`):
  - `client`: `*.svelte.spec.ts` / `*.svelte.test.ts` files run in real headless Chromium through Playwright (`vitest-browser-svelte`, `page` from `vitest/browser`). These need the Playwright browsers installed (`npx playwright install chromium`).
  - `server`: all other `*.spec.ts` / `*.test.ts` files run in Node.
  - `expect.requireAssertions` is enabled, so every test must make at least one assertion.
  - `src/lib/vitest-examples/` holds scaffold examples showing both test styles.
- Prettier uses the Svelte and Tailwind plugins (class sorting).
