# ADR 0007 — Privacy self-service without accounts

- **Status:** accepted
- **Date:** 2026-10-19
- **Supersedes:** —

## Context

H5 asked for a way for a visitor to see and delete what the site keeps about them.
Kotree has no accounts, no email list and no sign-in for visitors — the guestbook
wall already lets an author edit and delete their own posts for a short while, using
a token the browser mints and stores on the device.

## Decision

`/api/privacy` speaks exactly that token's language. `GET ?owner=…` returns the
visitor's own guestbook entries; `DELETE ?owner=…` soft-deletes all of them
(`deleted: true`, `deletedBy: 'author'`), reusing the same fields the per-post delete
has always written. `src/components/privacy/privacy-data.tsx` on `/privacy` is the
interface.

The token is the whole proof of ownership, so:

- the server stores only its truncated SHA-256, never the token itself;
- `DELETE` sits behind `guardOrigin` like every other mutation; `GET` does not, because
  a same-origin page load sends no `Origin` header and a cross-site reader cannot read
  the response;
- both are rate-limited per IP.

## Consequences

- Deleting on one device leaves the copies on other devices alone — the tokens are
  per-device, and the page says so. There is no "delete everything everywhere"
  because there is no identifier that would find them.
- The link counters, page views and vitals hold no identifier to look up, so the page
  states what they are (aggregates, hashed-IP rate buckets that expire) instead of
  pretending to offer them for deletion.
- Rotating or clearing site data on the device loses the token and with it the claim
  to the posts; that is the accepted cost of never holding an identity.
