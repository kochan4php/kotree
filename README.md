# Kotree

A link-in-bio page for Deo Subarno (Kochan). One page, all social links, click counters backed by MongoDB.

Built with Next.js, Tailwind CSS, and a small set of dependencies.

## Stack

- Next.js (App Router)
- Tailwind CSS v4
- MongoDB
- pnpm

## Features

- Profile card with avatar, bio, and quote
- Social link list with per-link click counters
- Total clicks / links stats
- PWA (native service worker, installable)
- SEO metadata (JSON-LD, Open Graph, sitemap)
- Dark theme with warm coffee palette

## Requirements

- Node.js 20+
- pnpm
- MongoDB running locally (or a `MONGODB_URL` env var)

## Setup

```bash
git clone https://github.com/kochan4php/kotree.git
cd kotree

npm install -g pnpm
pnpm install

# optional: point to your MongoDB
# MONGODB_URL=mongodb://localhost:27017

pnpm dev
```

Open https://localhost:3000 (the dev server runs with HTTPS).

## Scripts

| Command       | What it does             |
| ------------- | ------------------------ |
| `pnpm dev`    | Start dev server (HTTPS) |
| `pnpm build`  | Production build         |
| `pnpm start`  | Serve the build          |
| `pnpm lint`   | Run ESLint               |

## Environment variables

| Variable                              | Required | Default                       | Purpose                        |
| ------------------------------------- | -------- | ----------------------------- | ------------------------------ |
| `MONGODB_URL`                         | no       | `mongodb://localhost:27017`   | MongoDB connection string      |
| `NEXT_PUBLIC_BASE_URL`                | no       | `http://localhost:3000`       | Canonical URL for SEO          |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`| no       | -                             | Google Search Console token    |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION`  | no       | -                             | Bing Webmaster token           |

Set `NEXT_PUBLIC_BASE_URL` to your real domain before deploying. Without it, SEO links (canonical, sitemap, Open Graph) point to localhost.

## API

`POST /api/click-link-counter` increments a link counter. Body: `{ "name": "github", "count": 1 }`.

The endpoint rejects requests that:
- come from a different origin (checked via `Origin` and `Sec-Fetch-Site`)
- send a link name that is not in the social links list
- exceed 30 requests per minute per process

## Project structure

```
src/
  app/          pages, layout, metadata, API routes
  components/   UI components, one per file
  connections/  MongoDB client and queries
  data/         profile and social link data
  interfaces/   shared types
  lib/          utilities (security, rate limit, tracking)
```

## Deployment

1. Install dependencies with `pnpm install`.
2. Set env vars (see above).
3. Run `pnpm build`, then `pnpm start`.
