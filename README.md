# MartX Care — AI-assisted refund support

A full-stack assessment application that receives customer refund requests, checks stored orders against a defined policy, and returns **Approved**, **Denied**, or **Escalated**. Support staff can inspect decision evidence and resolve requests requiring human review.

**Refunds are simulated. No payment is issued.** Real AI classification is optional at startup but must be enabled and demonstrated to verify the assessment’s AI requirement.

## At a glance

- React + Vite customer form and support workspace.
- Express API with validation, rate limiting, authenticated support routes, and safe retry handling.
- PostgreSQL with 15 synthetic customers and 21 orders; embedded PGlite for development without Docker.
- Optional OpenAI message classification; fixed policy code controls verdicts and amounts.
- PostgreSQL transactions, order locks, and decision audit records.
- Docker Compose services for the frontend, backend, and database.

## Documentation

| Guide | Contents |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | Request flow, data model, AI boundary, design decisions, limitations |
| [API reference](docs/API.md) | Endpoints, payloads, validation, authentication, retries, errors |
| [Refund policy](docs/refund_policy.md) | Business rules R1–R7 and precedence |
| [Operations](docs/OPERATIONS.md) | Environment variables, AI activation, hosted database setup, troubleshooting |
| [Scenarios](docs/SCENARIOS.md) | Seeded cases and prompt-injection examples |
| [Demo walkthrough](docs/DEMO.md) | Recording plan and assessment handoff checklist |
| [Verification](docs/VERIFICATION.md) | Checks completed and outstanding evidence |

## Quick start: Docker

Prerequisite: Docker with Compose. Run from the repository root:

```sh
docker compose up --build
```

Open **http://localhost:8080**. The supplied Compose configuration starts PostgreSQL, Express, and Nginx serving the React build. On a new database volume, it initializes the schema and synthetic data automatically. Defaults support an offline local demonstration; the support token is `local-demo-support-token` unless overridden.

To configure real AI or change demo settings, create `.env` only if it does not already exist:

```sh
# This preserves an existing .env file.
[ -f .env ] || cp .env.example .env
```

Edit `.env` and set `OPENAI_API_KEY` and your chosen `ADMIN_TOKEN`, then rerun `docker compose up --build`. Compose uses its bundled PostgreSQL database even if your local `.env` contains a different `DATABASE_URL`.

Useful commands:

```sh
docker compose ps
docker compose logs --tail=100 backend
curl http://localhost:8080/api/health
docker compose down
```

`docker compose down` preserves database data. Seed dates are relative to the first initialization; restarting does not reset orders or refresh dates. See [Operations](docs/OPERATIONS.md) for a deliberately destructive demo reset.

The legacy `docker-compose` command may be used if that is the installed Compose executable. An actual container run remains an outstanding verification item; configuration alone is not proof of successful startup.

## Local development without Docker

Use Node.js 22.12+ on the Node 22 line, or a compatible newer release, and npm.

```sh
npm ci
[ -f .env ] || cp .env.example .env
```

For the embedded database, leave `DATABASE_URL=` empty in `.env`. Keep `ADMIN_TOKEN` populated.

Start the API:

```sh
npm run dev:api
```

In another terminal:

```sh
npm run dev:web
```

Open the URL printed by Vite, normally **http://localhost:5173**. Vite proxies `/api` to port 3001. If that frontend port is occupied, Vite may choose another. PGlite initializes the database automatically and persists it in `backend/data` when started with the root workspace command.

A populated `DATABASE_URL` selects external PostgreSQL instead. External databases must be initialized explicitly; connection details are in [Operations](docs/OPERATIONS.md).

## Try the customer and support flows

1. Open **Customer care**.
2. Under **Take it for a test drive**, choose a seeded scenario.
3. Click **Check my refund** and inspect the decision, amount, rule IDs, and request reference.
4. Choose **Human review** to submit the $720 laptop request.
5. Open **Support workspace** and enter the `ADMIN_TOKEN` used by the running backend.
6. Click **Load requests**, select the order, and inspect classification and policy evidence.
7. Enter a review note of at least 10 characters, then approve or deny the pending request.

Expected examples on fresh data:

| Scenario | Order | Expected outcome |
|---|---|---|
| Standard return | MX-1001 | Approved, $60 |
| Final sale | MX-1002 | Denied, $0 |
| Human review | MX-1004 | Escalated, $720 eligible |
| Damaged item | MX-1005 | Approved, $85 |
| Mixed basket | MX-1009 | Approved, $90; final-sale items excluded |

Actual classification may cause additional review when live AI identifies uncertainty. Approvals persist: a new submission for an already-refunded order is denied. A pending review also prevents another request for the same order.

## How AI is used

The classifier extracts a reason, confidence, injection flag, and ambiguity flag from the customer message. The policy engine then makes the decision using verified database records. AI cannot choose an amount, modify records directly, or override a hard denial.

| Mode | Meaning |
|---|---|
| `offline` | No API key; local keyword matching, not an LLM |
| `openai` | A provider response was received and passed schema validation |
| `unavailable` | Provider failure, timeout, refusal, or invalid output; low-confidence review path |
| `skipped` | Email/order ownership check failed; no classification call made |

The header and `/api/health` describe **configured** AI mode. They do not prove a successful provider call. Verify live AI using `aiMode: "openai"` in an actual refund response and `mode: "openai"` in its classification audit entry.

Customer-facing replies are generated from controlled templates. The application does not upload or retrieve policy documents, answer general policy questions, or maintain a chat conversation. To change policy behavior, update both [the written policy](docs/refund_policy.md) and [the policy engine](backend/src/policy.js), then adjust scenarios and tests.

## Architecture

```text
React customer form / support workspace
                 |
     Vite proxy or Nginx /api proxy
                 |
 Express: validation, rate limits, support authentication
                 |
        Email + order ownership lookup
                 |
 Optional classifier: untrusted message -> intent and flags
                 |
 Deterministic policy: order + items + history + flags
                 |
 PostgreSQL transaction: request + order change + audit
```

Source map:

```text
backend/src/app.js       API routes and transactional request handling
backend/src/ai.js        Message prefilter and optional AI classifier
backend/src/policy.js    Eligibility rules and customer reply templates
backend/src/db.js        PostgreSQL/PGlite adapter
backend/src/server.js    Startup and shutdown
backend/test/            Policy, HTTP, and mocked AI tests
frontend/src/main.jsx   Customer and support interfaces
frontend/src/style.css  Visual styling and responsive layout
db/                     Schema, seed data, and request-column migration
docs/                   Supporting documentation
docker-compose.yml      Local three-service stack
.github/workflows/      Automated verification configuration
```

## Verification

```sh
npm test
npm run build
```

Tests use a fresh in-memory PGlite database and mocked provider calls. They make no paid AI calls. The latest local validation passed all 9 tests and the frontend production build. Tests cover the 15 seeded scenarios, date and amount boundaries, selected injection attempts, ownership redaction, protected admin routes, input limits, retries, duplicate prevention, audit entries, and human resolution.

Docker startup, live AI calls, and Supabase connectivity are separate verification tasks. See [the verification record](docs/VERIFICATION.md) for scope and remaining work.

## Scope and trade-offs

This is a refund-decision demonstration, not a production payment service. Email plus order ID is a demo ownership check, and staff use one shared token. There is no payment settlement, email delivery, customer account system, or customer-facing review-status endpoint. Whole-order requests exclude final-sale items; additional item-level refunds are not supported. A partially refunded mixed basket is marked refunded at order level.

The code separates UI, HTTP handling, AI classification, policy, and persistence. Routes and UI remain compact, concentrated modules; larger deployments would benefit from further modularization. [Architecture](docs/ARCHITECTURE.md) explains the reliability safeguards and remaining limitations.

## Assessment handoff

Repository: [cercuit-ola/martx-refund](https://github.com/cercuit-ola/martx-refund).

Before submitting, confirm the repository contains the latest source, its CI run passes, a clean Docker startup works, at least one real AI request is demonstrated, and a short walkthrough video is linked in the submission. Follow [the demo guide](docs/DEMO.md). Supabase and a public application deployment are optional; the assessment can run entirely through Compose.
