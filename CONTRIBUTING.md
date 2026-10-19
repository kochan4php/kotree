# Contributing

This is a personal site, but the workflows are the ones any Neobrutalist Next.js
project would use, so they are written down. [AGENTS.md](AGENTS.md) has the same
rules phrased for coding agents.

## Setting up

```bash
pnpm install
pnpm dev            # HTTPS dev server
```

A local MongoDB is needed for the interactive bits (guestbook, counters, stats):
`MONGODB_URL` defaults to `mongodb://localhost:27017`. Nothing else is required;
every other environment variable in the README is optional.

## The gates

Run these before you push, in this order:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:e2e                       # the full browser suite
pnpm check:bundle                   # when the client bundle changed
pnpm smoke -- http://localhost:3000 # against a running build
```

`pnpm test:e2e` starts its own server and builds first. Local smoke tests and
load checks want a built server too, so `pnpm build && pnpm start`, never
`pnpm dev`.

## Writing

Notes and projects are plain Markdown in `content/`, with frontmatter the parser
in `src/lib/markdown-parse.ts` reads. Scaffold a note so the filename and
frontmatter are right:

```bash
pnpm new:note a-short-slug
```

Then fill in `summary` and `tags`, write the body, and run `pnpm changelog:draft`
before committing — it groups the commits since the last tag. A human turns those
bullets into a plain-English entry in `CHANGELOG.md`, which is what `/changelog`
renders. British spelling, no jargon.

## Rules that are not obvious from the code

- **No new dependencies.** The toolbox is the Web Platform, CSS, Next.js/Node
  built-ins and what is already installed — see
  [ADR 0003](docs/decisions/0003-features-are-built-on-the-platform.md).
- **Contrast never drops below WCAG AA**, including the neobrutalist chips and
  the dark/OLED palettes.
- **Motion and data**: ambient effects sit behind the `fx` preference, respect
  `prefers-reduced-motion` and skip themselves on `save-data` connections.
- **Visual baselines are Windows-only** (`*-win32.png`). Inspect the diff, then
  regenerate on Windows with `--update-snapshots`. Adding a link to the footer
  touches every baseline — expect it and budget for it.
- **Non-obvious trades get an ADR** in `docs/decisions/`, and a line in
  `docs/architecture.md` when the shape of the site changes.

## Commits

Conventional-commit prefixes (`feat`, `fix`, `perf`, `test`, `docs`, `chore`) —
`pnpm changelog:draft` groups by them. Each commit should leave the gates green.
