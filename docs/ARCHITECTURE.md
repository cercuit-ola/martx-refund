# Architecture and engineering decisions

## Components

The React frontend provides one customer request form and a support workspace. Express owns validation, ownership checks, orchestration, authorization, and transactions. `ai.js` handles classification; `policy.js` handles eligibility and response templates. The database adapter supports a PostgreSQL pool or embedded PGlite through a small shared query/transaction interface.

In Docker, Nginx serves the built frontend and proxies `/api` to Express. Only Nginx is published to localhost on port 8080. PostgreSQL and Express communicate inside the Compose network. During development, Vite proxies `/api` to the local Express service on port 3001.

## Request lifecycle

1. Validate and normalize input; enforce body and rate limits.
2. Look for an existing idempotency key and verify its request-content hash.
3. Verify the email/order combination before sending any message to an external model.
4. Classify the message, or skip classification when ownership fails.
5. Begin a database transaction and lock the matching order.
6. Recheck idempotency and reject a second pending review for that order.
7. Load items and the customer’s completed-refund count over the last 90 days.
8. Flag multi-line-item orders as ambiguous unless the message explicitly requests the whole order.
9. Apply policy rules, calculating eligible value from stored unit prices and quantities in cents.
10. Store the request, update the order if approved, and insert classification/policy audit entries atomically.
11. Return a controlled customer reply and actual classification mode.

The classifier call occurs before the transaction so a slow provider does not hold an order lock. This also means a retry or conflicting pending request can incur an unnecessary model call before the transactional checks reject it.

## Data model

| Table | Purpose |
|---|---|
| `customers` | Synthetic customer identities and contact details |
| `orders` | Customer relationship, delivery/refund dates, status, total and currency |
| `order_items` | Quantity, unit price and final-sale status |
| `refund_requests` | Input, automated decision, eligible amount, review state, final human decision, retry metadata |
| `audit_logs` | Ordered classification, policy and resolution evidence |

Customers have many orders, orders have many items, and requests have many audit entries. `refund_requests.order_id` deliberately has no order foreign key so invalid order submissions can be recorded. A unique key protects idempotency; a partial unique index permits only one pending review per order.

`db/01-schema.sql` defines the base schema, `02-seed.sql` inserts demo records, and `03-requests.sql` adds retry/classification fields and the pending-review index. Docker initializes all three on an empty volume. PGlite initializes them when the customers table is absent. Neither path provides a general migration runner for existing installations.

## Policy and AI authority

Policy version 1.0 is documented in [refund_policy.md](refund_policy.md) and implemented in `backend/src/policy.js`. The Markdown is documentation, not runtime configuration. The model receives the submitted message and classification instructions, not the CRM records or policy document. Customer text can itself contain personal information; that text is transmitted after the ownership check.

The provider request uses the Responses endpoint, `store: false`, a strict output schema, no tools, and a 12-second timeout. Local Zod validation checks the returned reason, confidence, and flags. The schema permits only `standard`, `damaged`, `incorrect`, or `unclear` reasons. Low confidence below 0.8, ambiguity, or injection flags lead to escalation unless a hard denial wins.

A local regex prefilter detects selected manipulation phrases and references to other order IDs. Model safety flags are combined with these flags. With no key, keyword rules provide reproducible offline behavior. Refusals, invalid output, HTTP errors, or timeout produce mode `unavailable` and confidence zero. Customer responses come from templates, not generated prose.

This design makes the model useful for intent triage while keeping money-related eligibility deterministic. It does not guarantee detection of every suspicious message. In particular, the offline classifier can miss negation, nuanced partial requests, and policy-only questions; the form should be used only for actual refund submissions.

## Human review

Only escalated requests are pending. Support resolves them with a note. Approval locks the order and request, checks delivery and positive eligible amount, and reruns hard eligibility checks. High value or suspicious history can be accepted through human review; final-sale exclusions, expiry, and duplicate-refund restrictions remain authoritative.

The original automated result is preserved alongside `final_verdict`. Audit records retain the resolution note, but the shared token provides no individual staff identity. The eligible amount remains the original stored amount; there is no order-editing API or amount reconciliation workflow in this demo. Production handling of mutable order records would need explicit reconciliation.

## Security and reliability boundary

Implemented safeguards include parameterized SQL, strict input validation, Helmet headers, rate limiting, constant-time support-token comparison, database transactions, locks, retry hashes, and restricted AI output. React renders customer text as escaped content. Credentials remain on the backend; the support UI holds its token in memory.

Limitations include demo ownership verification, a shared staff credential, an in-memory limiter, no customer status endpoint, and no retention/deletion workflow. The limiter is not distributed and proxy client-IP behavior requires configuration before hosting. Raw messages remain in the database. Hosted PostgreSQL tables require deliberate database-role and Data API access controls.

Mixed baskets refund eligible items but mark the entire order refunded. There is no item-level refund ledger, payment provider, webhook reconciliation, delivery notification, or persistent chat. The one-business-day response promise is sample policy copy, not an enforced service-level guarantee.

## Maintenance

When changing business rules, update the policy document, engine, policy-version value recorded by `app.js`, scenarios, and meaningful tests together. Keep the classifier’s authority limited to interpretation. Larger features should extract services/routes from `app.js` and UI components from `main.jsx`; the present layout favors a compact assessment-sized application.
