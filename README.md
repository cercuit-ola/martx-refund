# MartX Care — AI-assisted refund support

React + Vite, Express, PostgreSQL, and an optional OpenAI classifier. Includes 15 customers and 21 orders from the supplied assessment files. This application simulates refunds; it never moves money.

## Run with Docker

Install Docker Desktop, then from this directory:

```sh
cp .env.example .env
# Optional: set OPENAI_API_KEY in .env to enable real AI classification.
docker compose up --build
```

Open http://localhost:8080. The legacy `docker-compose up --build` command also works if installed. Support token defaults to `local-demo-support-token`; change it in `.env` before exposing this application. Without a key the interface explicitly shows offline demo mode.

PostgreSQL persists in a named volume. Seed dates are relative to database initialization, not each app restart. For a deliberately fresh demo dataset, `docker compose down -v` deletes ALL demo data; then start again. SQL initialization scripts run only on empty volumes. Apply future migrations explicitly to existing databases.

## Local development without Docker

Node 22.12+ is required. With no DATABASE_URL, the backend uses PGlite (embedded PostgreSQL) persisted in `backend/data`.

```sh
npm ci
cp .env.example .env
npm run dev:api
# In another terminal:
npm run dev:web
```

Open the Vite URL (normally http://localhost:5173). Vite proxies `/api` to port 3001. Run `npm test` for policy and HTTP integration checks; `npm run build` compiles the frontend. Tests use a fresh in-memory PostgreSQL instance and make no paid API calls.

## Architecture

```text
React request form / support workspace
              | same-origin /api
        Express + validation + rate limit
              | verified email/order lookup
      Untrusted message → intent classifier
              | reason, confidence, safety flags
      Deterministic policy engine (R1–R7)
              | transaction + order row lock
       PostgreSQL requests + audit logs
```

The supplied policy in `docs/refund_policy.md` defines rule precedence. Amounts are calculated in integer cents from stored items; customer text and AI outputs cannot set amounts or verdicts. UTC calendar days determine the delivery window, including all of day 30. Hard denials precede escalation. A mixed basket refunds eligible items only. Approvals mark the simulated order refunded in the same transaction as the request and audit log, preventing duplicate processing. Human decisions recheck hard eligibility rules and are recorded separately from the original verdict.

## AI integration

Set `OPENAI_API_KEY` on the backend only. `OPENAI_MODEL` defaults to `gpt-4.1-mini` and can be set to a compatible model available to your account. The Responses API uses strict structured output for reason, confidence, injection and ambiguity. Only the submitted message is transmitted after ownership verification; CRM records are not sent. Storage is disabled in the request. See [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

A deterministic prefilter is combined with model safety flags. Model refusals, timeouts, invalid JSON and provider failures become low-confidence human escalations (unless a hard policy denial applies). With no key, a labelled local classifier enables reproducible demos. Customer-facing replies are deterministic templates so model-generated text cannot promise unauthorized payments. The AI performs useful intent triage; it is not the policy authority.

## API

- `GET /api/health`: database availability and configured AI mode.
- `POST /api/refunds`: `{email, orderId, message, idempotencyKey}`. UUID key required. Returns ID, verdict, eligible amount, rule IDs, reply and actual classification mode.
- `GET /api/admin/refunds`: latest 100 requests, newest first.
- `GET /api/admin/refunds/:id/audit`: structured decision evidence.
- `POST /api/admin/refunds/:id/resolve`: `{verdict: "Approved" | "Denied", note}`. Note must contain 10–1,000 characters.

Admin endpoints require `Authorization: Bearer <ADMIN_TOKEN>`. The UI holds that token only in memory. Input errors return 400, invalid credentials 401, missing requests 404, duplicate/conflicting operations 409 and rate limits 429. Requests use parameterized SQL; React escapes rendered messages. No public endpoint lists customer records. UUID idempotency keys are bound to the request contents. The request form preserves the key after a network failure for safe retries.

## Assumptions and trade-offs

- Email + order ID is the assessment's ownership check, **not production authentication**. Before a real deployment, add verified customer sessions, staff identities/RBAC, account-level rate limiting, and retention controls.
- This version handles whole-order requests with final-sale exclusions. Ambiguous or item-specific requests should receive human review; robust item-level selection is a future extension. Offline classification is intentionally simpler than the model.
- A partially refunded mixed basket is marked refunded at order level. Additional item-level refunds are outside scope.
- One pending review per order. An in-transit order cannot be approved; support should deny/close it and request a new submission after delivery.
- Review within one business day is sample policy copy, not an operational service guarantee.
- No payment processor, email delivery, real refund settlement or persistent customer conversation is implemented.
- The single shared support token and in-process rate limiter suit this local assessment, not a multi-tenant production service.
- Audit records contain application evidence, not private model chain-of-thought. Raw customer messages remain in the database and should be subject to an appropriate retention policy.

## Hosting handoff — what to provide and when

Nothing from Vercel or Supabase is required for local Docker execution.

1. **Real AI verification:** add your OpenAI API key directly to local `.env`; do not commit it or paste it into chat. Tell the developer once configured.
2. **GitHub submission:** provide your GitHub username / target repository and an authenticated GitHub connection. Source is ready to upload; a public repository has not yet been created.
3. **Supabase (optional hosted database):** create a project and supply its backend PostgreSQL connection string securely as DATABASE_URL. Run `db/01-schema.sql`, `02-seed.sql`, then `03-requests.sql` against a fresh database. Do not expose these tables through public anon access; keep them backend-only and configure RLS/privileges before public hosting. Never place database credentials in Vite variables.
4. **Hosted application:** the Docker stack can run on a container host. Vercel can host the built frontend, but this repository currently expects a same-origin `/api` proxy to a separately hosted Express backend. Provide the Vercel project and backend hosting choice when ready; deployment rewrites and hosted security configuration still need to be configured and verified.
5. **Demo video:** use `docs/DEMO.md` for the walkthrough after a fresh seed. The required narrated video and live AI verification are pending.

## Verification status

Consult `docs/VERIFICATION.md` for checks actually performed. Docker configuration is supplied, but a real container run requires Docker, which was not installed in the build environment. Do not treat source or embedded PostgreSQL tests as proof of a Docker/Supabase deployment.
# martx-refund
