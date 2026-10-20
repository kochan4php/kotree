---
title: A CI that stays green
date: 2026-03-07
tags: ci, testing, github-actions
series: Web platform notes
seriesOrder: 5
summary: A green build is a budget and a contract: fewer matrix jobs, honest retries, captured evidence and audit exceptions that expire.
---

A CI that is always red teaches everyone to ignore it. A CI that is always green because it retries everything teaches the same lesson more slowly. The useful middle is a pipeline where a failure means something, a retry is recorded, and the whole thing finishes before someone switches to another branch.

## The matrix is a budget

The temptation is a full grid: three operating systems, three browsers, two Node versions. That is eighteen jobs, each installing dependencies and building the app, and the queue alone can outlast the tests. Most of the grid tests combinations nobody uses.

The shape that works here is one canonical gate and a few compatibility checks. Ubuntu with the current LTS Node and Chromium runs lint, typecheck, unit tests and the full end-to-end suite. A single Windows job runs the visual baselines, because those are generated on Windows and comparing them elsewhere is a different test. WebKit and Firefox get a smoke journey on one operating system, not the full suite.

Sharding is tempting once the end-to-end run passes ten minutes. It also breaks stateful tests: shared rate limits, a single database and a test that logs in as the admin will interfere across shards. Either give each shard its own database and its own rate-limit prefix, or shard only the read-only specs. A half-sharded suite that fails at random is worse than a slow one.

## Ports and stale processes

Most "works locally, fails in CI" stories are a server on the wrong port. Playwright's `webServer` option helps, but only if it is configured honestly: `reuseExistingServer: !process.env.CI`, a port from the environment, and a `baseURL` derived from the same value. Hard-coding `localhost:3000` in one place and letting the server choose another is a reliable way to test yesterday's build.

On Windows, a killed parent process does not always take its children with it. A Next server can survive a cancelled job and hold the port, so the next run connects to the old process. GitHub's runners are fresh machines, which hides this; a self-hosted runner does not. If the process tree matters, kill it as a tree rather than adding a dependency for port cleanup.

Give every job `timeout-minutes`, and give the workflow a `concurrency` group with `cancel-in-progress: true`. A push that supersedes another should stop the old run rather than queue behind it.

## A flake policy, not a retry count

Retries are a painkiller. One retry in CI, zero locally, is a defensible default. The important part is what happens next: the run is marked as flaky, an annotation is written, and someone owns the fix. A test that needs a retry every week is not slow; it is broken.

The usual causes are worth naming because they are usually fixable. `waitForTimeout` is a guess; use a web-first assertion. `networkidle` is a promise the app cannot keep once it polls. A test that depends on the current date breaks at midnight; freeze the clock. A test that depends on random window positions breaks when the seed changes; seed the random.

Quarantine is the last resort, and it needs an issue and a date. A skipped test with no owner is a deleted test with extra steps.

## Keep the evidence

When a browser test fails in CI, the trace is worth more than the log. Record a trace on the first retry, keep a video only on failure, and upload the HTML report and any diffs as artifacts with a short retention. The next person should be able to open one file and see what the browser saw.

Build once and reuse the artifact. Installing dependencies and running `next build` in every shard is wasted minutes and, worse, means each shard can test a slightly different build. Cache the pnpm store keyed by the lockfile, install with `--frozen-lockfile`, and pass the build output forward.

## Audit exceptions that expire

`pnpm audit` is useful until an advisory has no fix and the build is red for a month. The answer is not `--ignore` in the script. It is a small JSON file with one entry per exception: the advisory, why it does not apply or cannot be fixed yet, an owner, and an expiry date. CI fails when the date passes. The exception is visible in review, and it cannot quietly become permanent.

The same principle applies to lint suppressions and skipped tests. A suppression without a reason is a bug with a comment syntax.

## What green means

A green run should mean the thing you just pushed works in the browser, on the database, with the service worker registered. It should finish quickly enough that nobody merges around it. And when it goes red, the first question should be "what broke?", not "which test is flaky this time?".

The pipeline has to stay small enough to trust.
