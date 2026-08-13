# Security & Threat Model

Status: verified live on 2026-08-13 (commit 726ae41). All protections below
were confirmed with live probes against the deployed site.

## Attack surface

| Endpoint | Purpose | Writes |
| -------- | ------- | ------ |
| `GET /api/click-link-counter` | public click counts | no |
| `POST /api/click-link-counter` | click tracking + webhook | yes (Mongo + Discord/Telegram) |
| `GET /api/guestbook` | public guestbook entries | no |
| `POST /api/guestbook` | new anonymous entry | yes (Mongo) |
| `POST /api/chat` | Gemini proxy (AI terminal) | no (burns Gemini quota) |

## Defense layers (in order, all verified)

| Layer | What it stops | Proof |
| ----- | ------------- | ----- |
| `guardOrigin` (Origin header check) | cross-site requests / CSRF | evil-origin POST to all 3 write endpoints -> 403 |
| CSRF token + honeypot | naive bots, automated spam | no-token POST -> 403; honeypot field -> 403 |
| Rate limit (30/min/IP, last XFF hop) | floods, Gemini quota drain | 35 spoofed-IP posts -> 429 at hit 31 |
| Input validation (whitelist, caps, clamps) | garbage / oversized payloads | name whitelist, 100/200 char caps, count clamp |
| Upstream timeouts (AbortSignal) | hung webhook / Gemini / ipapi | 5s webhook, 10s Gemini, 8s geo fallback |
| PII hygiene | visitor data exposure | GET guestbook returns only `createdAt` + `message`; stored IP is sha-256 hashed |

## Threat actors

| Actor | Target | Vector | Outcome |
| ----- | ------ | ------ | ------- |
| Random bot | any POST | cross-site form/fetch | blocked by guardOrigin (403) |
| Spammer | guestbook | scripted posts | blocked by token + honeypot + rate limit |
| Flooder | chat (Gemini quota) | rapid same-site requests | rate limited (30/min/IP); limiter resets on cold start |
| Curious dev | endpoints | manual probing | sees only public data; no stack traces, no PII |
| Attacker with real browsers | any write | distributed, one request per IP | **residual risk** — no auth, by design |

## Known limitations (deliberate tradeoffs)

1. Rate limiter is in-memory per serverless instance — resets on cold start.
   Ceiling: distributed floods. Upgrade path: Redis-backed limiter if the site
   ever gets real traffic.
2. CSRF token is derivable (hour slice + public base URL) — cosmetic only.
   The real protection is `guardOrigin`: browsers enforce the Origin header,
   which cross-site requests cannot forge.
3. Write endpoints have no authentication — the guestbook is anonymous by
   design. Anything public can be written by anyone.
4. Gemini prompt injection can at most leak the public profile (the system
   prompt contains no secrets).
5. Browser APIs (mic, Bluetooth, battery, screen-share) are permission-gated
   by the browser and guarded with fallbacks.

## Not implemented (YAGNI)

API keys, Redis rate limiting, per-user auth, WAF rules — all would break the
anonymous guestbook or add cost without protecting anything sensitive. Add
when the site outgrows "personal linktree".
