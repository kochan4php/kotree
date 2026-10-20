---
title: An AI terminal without a backend
date: 2026-07-25
tags: ai, react, privacy
series: Building Kotree
seriesOrder: 6
summary: The terminal resolves commands locally, streams from a provider with the visitor's own key, and treats every answer as untrusted text.
---

An AI terminal sounds like a server: an API key, a queue, a database of conversations, a bill. It can also be a static page. The commands run in the browser, the model call goes straight to a provider that allows browser requests, and the key belongs to the person using it. No backend means no transcript to leak and no quota to fund, at the cost of a narrower set of things the feature can do.

## Commands before chat

The first token decides where the input goes. A registry maps names and aliases to local functions: `help`, `notes`, `theme`, `goto`, `clear`, `whoami`. These never touch the network. They are fast, they work offline, and they are the part people use most.

Only the leftover text becomes a prompt. That split keeps the terminal useful without a key, makes the common actions deterministic, and gives the model a smaller job. A failed command can be fixed; a model that mishears "open notes" is a mystery.

The registry is a plain array, so help and autocomplete share one source.

## Streaming without a framework

The provider returns a stream, usually server-sent events. `fetch` gives a `ReadableStream`; a `TextDecoder` turns bytes into text; a small buffer splits on blank lines and parses the `data:` payloads. The parser has to tolerate a chunk boundary in the middle of an event, which is the part most hand-rolled SSE readers get wrong.

Tokens arrive faster than a React render should. Appending each one to state produces hundreds of renders and a janky cursor. The terminal buffers tokens and flushes once per animation frame, or every 50 milliseconds, whichever comes first. Markdown is rendered at the end of the stream, not on every token; halfway through a code fence is not a useful parse.

An `AbortController` is wired to the Stop button and to unmount. Without it, a closed tab keeps reading a stream until the provider gives up. The abort error is not shown as a failure; it is a normal way to stop.

## Citations or silence

The prompt includes a short context built from the site's own search index. A local scoring pass picks the three or four notes that share the most terms with the question, and the prompt says to answer from those excerpts and to say when they do not cover it. The response is asked to end with links in a fixed form.

The renderer only accepts links whose URLs are in the index it supplied. A model can invent a plausible URL, and a terminal that turns that into a clickable link is a small phishing engine. Anything unrecognised is shown as text, not as an anchor. Model output is never inserted as HTML; it goes through the same Markdown renderer as the rest of the site, with raw HTML disabled.

If no note scores above a threshold, the terminal says it does not know rather than answering from general knowledge. That is a deliberate limitation. A personal site's assistant should be able to say "not in the notes".

## Limits, visible and enforced

The provider's rate limit is the real limit, but the page should not discover it by burning a request. A token bucket in memory caps requests per minute and per session. The input is disabled during a request, which also limits concurrency.

A 429 is handled with `Retry-After` if the provider sends it, and a capped exponential backoff if not. A 401 means the key is wrong; say so and offer the settings field again. A 5xx is a provider problem, not a user error. None of these should wipe the prompt.

Output tokens are capped, the prompt is capped, and the request has a timeout. An unbounded response feels broken and expensive at the same time.

## Falling back

Without a key, the terminal still works. Local commands answer, and a short list of example questions explains what the model would add. When offline, it says so and suggests the notes, which are cached. When the provider fails, the last answer stays on screen with a retry action rather than being replaced by an error page.

The key lives in memory and, if the user asks, in `sessionStorage`. It is never put in a URL, never logged, and never sent anywhere except the provider's endpoint. The privacy note says the provider sees the prompt; pretending otherwise would be dishonest. The terminal does not store transcripts, which also means it cannot offer history. That is a feature with a cost, and the cost is worth stating.

No backend is not a moral position. It is a set of trade-offs: no server bill, no transcript database, no shared key to abuse, and no ability to hide the provider from the visitor. For a terminal on a personal site, those are the right trades.
