# Verification record

This record distinguishes implemented features from evidence that they run successfully. Documentation reviewed on 1 October 2026. Live AI and hosted-database success are not implied by local tests. Docker verification is recorded separately below.

## Latest completed local checks

During the codebase assessment review on 1 October 2026:

| Check | Result | Scope |
|---|---|---|
| `npm test` | 9 tests passed | Fresh in-memory PGlite; local HTTP API; mocked provider |
| `npm run build` | Passed | Vite production frontend compilation |
| Public repository URL | HTTP 200 without authentication | Reachability of `https://github.com/cercuit-ola/martx-refund`; not a source comparison or CI check |
| Local AI configuration | Key absent at inspection | Real model inference was not active; configuration can change |

The 9 tests cover all 15 scenario rows, day 30/day 31 and $500/$500.01 boundaries, selected injection attempts, ownership response redaction, admin authentication, oversized messages, idempotency, duplicate refunds, escalation/audit/resolution, and rejection of undelivered-order approval. The AI contract test mocks structured responses and failure handling.

These tests do not prove provider behavior, full browser behavior, production PostgreSQL concurrency, or every adversarial input. No new runtime verification is claimed solely from this documentation update.

## Earlier recorded browser evidence

The original build’s 29 September 2026 record reported customer approval for $60, escalation for $720, dashboard review/resolution, and a 390px layout without horizontal overflow. Those are historical checks, not a fresh browser verification of this checkout. Repeat the walkthrough in the final submission environment.

## Outstanding verification and deliverables

| Item | Current evidence / next step |
|---|---|
| Docker build and startup | Passed on 1 October 2026; see the container verification below. |
| Live AI | Configure a provider key; prove a request and audit entry report `openai`. |
| Supabase | Prior direct-host connection failed DNS resolution. No successful connection, schema initialization, or hosted transaction has been verified. |
| GitHub source and CI | Repository is reachable; compare current source and inspect Actions results before submission. |
| Demo video | Recording guide exists; no completed video has been verified. |
| Public app hosting | No deployed end-to-end environment verified; optional for this assessment. |

## Repeatable verification

```sh
npm ci
npm test
npm run build
docker compose config --quiet
docker compose up --build -d --wait
curl --fail http://localhost:8080/api/health
```

After these commands, perform the customer and support cases in [DEMO.md](DEMO.md). Verify actual classifier mode on a request when testing AI. Health alone does not confirm tables, provider access, or a working refund transaction.

The configured GitHub workflow installs dependencies, runs tests/build, checks Compose configuration, starts the stack, and checks health. It does not currently demonstrate a live AI call or containerized browser workflow. Its success must be inspected on GitHub, not inferred from the workflow file.

## Docker verification — 1 October 2026

Docker Engine 29.8.1 and Compose v5.5.1 built the frontend and backend images and started all three services successfully. PostgreSQL and backend health checks passed. Nginx served the frontend and proxied API requests at `http://localhost:8080`.

The reproducible `scripts/docker-smoke.mjs` check passed against the fresh Compose database: frontend HTML, database health, unauthenticated admin rejection, $60 approval, same-key replay, duplicate denial, final-sale denial despite injection text, $720 escalation, human approval, and classification/policy/resolution audit persistence. Actual classification mode was `offline`; this does not verify a live model call. This was HTTP smoke verification, not browser interaction testing.

The test left four demo request records and marked MX-1001 and MX-1004 refunded. Containers and their database volume were left running. Other seeded examples remain available; rerunning this smoke script requires a fresh disposable database, and the script refuses a nonempty request history.

Run against a fresh Docker demo with the matching local support token:

```sh
node --env-file=.env scripts/docker-smoke.mjs
```

Docker Desktop was initially absent from the shell PATH. For the successful build, its bundled CLI and credential helper were made available for that shell session:

```sh
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
docker compose up --build -d --wait
```

The backend image initially omitted `docs/SCENARIOS.md`, which is required by the scenario test. The Dockerfile now copies that fixture. After rebuilding, `docker compose exec -T backend npm test --workspace backend` passed all 9 tests inside the container. These automated tests still use isolated in-memory PGlite; the separate HTTP smoke test above exercised the Compose PostgreSQL database.
