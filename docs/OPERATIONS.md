# Setup, configuration, and troubleshooting

## Configuration reference

Local `npm run dev:api` reads the repository-root `.env`. The backend workspace `npm start` does not load that file automatically; a hosting environment must inject its variables. Compose maps its declared variables into containers.

| Variable | Use |
|---|---|
| `ADMIN_TOKEN` | Required by server startup; shared support credential. Compose supplies a demo default. |
| `OPENAI_API_KEY` | Optional backend provider key. Empty means offline keyword classification. |
| `OPENAI_MODEL` | Classifier model; defaults to `gpt-4.1-mini` in the implementation. Requires compatible structured-output support and account access. |
| `DATABASE_URL` | External PostgreSQL URI for local/hosted API execution. Empty selects PGlite. Compose overrides it with its internal database URI. |
| `POSTGRES_PASSWORD` | Password used by the bundled Compose database and its backend connection URI. |
| `LOCAL_DB_PATH` | Optional PGlite directory, relative to the backend process working directory unless absolute. |
| `PORT` | API port, default 3001. Changing it also requires updating the frontend proxy configuration. |

`SUPABASE_URL`, a Supabase publishable key, and `NEXT_PUBLIC_*` variables are not read by this codebase. There is no Supabase browser SDK. Database access uses the server-side PostgreSQL driver.

Use `.env.example` as the template, preserving an existing `.env`. Never place a provider key or database password in a frontend environment variable. `.env` is excluded from Git. The current Docker ignore file excludes `.env` specifically; keep secret variants out of build contexts too.

## Activate and verify real AI

1. Set `OPENAI_API_KEY` in the backend environment; optionally select a compatible `OPENAI_MODEL`.
2. Restart the local API, or run `docker compose up --build` to apply Compose environment changes.
3. Submit a request using a matching seeded email/order pair.
4. Inspect the API result for `aiMode: "openai"`.
5. In the support workspace, inspect its classification audit for `mode: "openai"`, reason, confidence, and flags.

The header and health endpoint check key presence only. They can say `openai` even when the key is invalid or provider access fails. An actual result of `unavailable` means the provider call or output validation failed. The implementation does not retain detailed provider failure diagnostics, so check credentials, model access, connectivity, and account availability when troubleshooting.

Without a key, `offline` is expected and is not real AI inference. The automated test suite mocks the provider and cannot certify a live integration. No LangChain, Ollama, or alternative provider adapter is implemented.

## Database options

### Bundled Docker PostgreSQL

The assessment’s default stack needs no hosted database credentials. `docker compose up --build` uses PostgreSQL 16, runs the SQL initialization files on an empty volume, and persists data in `postgres_data`.

To inspect data locally:

```sh
docker compose exec db psql -U refund -d refunds -c 'SELECT count(*) AS customers FROM customers;'
docker compose exec db psql -U refund -d refunds -c 'SELECT count(*) AS orders FROM orders;'
docker compose exec db psql -U refund -d refunds -c 'SELECT order_id, verdict, review_status, final_verdict FROM refund_requests ORDER BY created_at DESC LIMIT 10;'
```

A fresh seed contains 15 customers and 21 orders. Seed dates are calculated when inserted. Changing the configured PostgreSQL password after a volume has been initialized does not automatically change the database role’s existing password.

The Compose file interpolates `POSTGRES_PASSWORD` into a URI. If using reserved URI characters, update the connection configuration to percent-encode credentials correctly; the supplied demo password avoids this issue.

### Embedded PGlite

Leave `DATABASE_URL` empty and start with `npm run dev:api`. The default directory is `backend/data` for that workspace command. Tests instead use a fresh in-memory database and do not modify this directory.

To use a separate fresh demo dataset without deleting existing data, set an unused absolute directory as `LOCAL_DB_PATH` and restart the API. Keep the original path if you want to return to the old dataset later.

### External PostgreSQL / Supabase

The existing adapter supports a PostgreSQL URI. For Supabase, copy the PostgreSQL connection string from the project’s Connect panel, selecting a direct or Session pooler connection appropriate for the environment. A publishable API key cannot authenticate this SQL connection.

1. Put the URI in the backend’s `DATABASE_URL`. Replace the password placeholder; do not include its surrounding placeholder brackets. Percent-encode special characters in the password component.
2. Configure TLS as required by the provider, with appropriate certificate verification. Do not work around TLS failures by globally disabling certificate checks.
3. Inspect the target database for existing tables or conflicting data before applying this demo’s SQL.
4. On a fresh target database, apply `db/01-schema.sql`, then `db/02-seed.sql`, then `db/03-requests.sql` using an authenticated SQL client or SQL editor.
5. Restrict the application tables to backend access. The supplied schema does not configure Supabase RLS or public Data API permissions; review those before loading customer data or exposing the project.
6. Start the API and verify `/api/health`, then run a customer request and inspect the stored audit trail.

External initialization is not automatic. Never rerun `02-seed.sql` against a populated database: it inserts fixed IDs and is intended for an empty demo schema. Future migrations must be applied explicitly. Do not assume Compose uses your hosted URI; it currently hardcodes the internal PostgreSQL service connection.

## Docker lifecycle and reset

```sh
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 backend
docker compose down
```

Stopping the stack preserves the volume. To deliberately erase **all data in the demo stack’s volume** and reseed:

```sh
# Destructive: deletes this Compose stack's database volume.
docker compose down -v
docker compose up --build
```

Use this only for disposable demo data. It resets submitted requests, decisions, and seeded order dates. A normal restart does not.

## Troubleshooting

| Symptom | What to check |
|---|---|
| `vite: command not found`, missing `zod` or `pg` | Run `npm ci` at the repository root. |
| `Set ADMIN_TOKEN in .env before starting` | Populate the root `.env`; use `npm run dev:api`, which loads it. |
| Frontend loads but submissions fail | Confirm API startup and health, database access, and proxy target port 3001. |
| `ENOTFOUND` for database hostname | Check hostname, project availability, DNS/network access, and whether the provider’s Session pooler is reachable. |
| Database authentication fails | Verify username, password, placeholder removal, and URI encoding. |
| Missing relation/table | Initialize external PostgreSQL or apply missing migrations to an existing database. |
| Support dashboard returns 401 | Use the token from the running backend environment; restart after changing it. |
| `openai` header but `unavailable` request | Header checks configuration only; inspect provider credentials/access/connectivity. |
| 409 pending review | Resolve the existing request in support before submitting another. |
| An example is now denied | An earlier approval may have marked the order refunded; seed dates also age over time. |
| Demo differs after restart | Persistence is expected; a restart does not reseed data. |
| Port 8080 is busy | Free the port or change the frontend host port mapping in Compose. |
| Vite prints a different URL | Use the printed port; the default was occupied. |
| Tests fail on socket permissions | HTTP integration tests need permission to listen on an ephemeral local port. |
| 429 for several users behind a proxy | Review Express proxy/client-IP configuration and replace the in-process limiter for scaled hosting. |

## Hosting boundary

The current deployment unit is the Compose stack or an equivalent static frontend plus persistent Express service and PostgreSQL. A static frontend host alone cannot run the API. Hosting the frontend separately requires a working same-origin `/api` proxy or an explicit cross-origin API/authentication design; neither is automatically configured for a hosting provider.

Before real customer use, add verified customer sessions, individual staff roles, payment/refund reconciliation, customer notifications, access controls, retention rules, and operational monitoring. These are production extensions beyond the assessment’s simulated workflow.
