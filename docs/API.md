# API reference

## Base URL and conventions

- Local API: `http://localhost:3001/api`
- Docker, through Nginx: `http://localhost:8080/api`
- Browser: relative `/api` URLs through the frontend proxy.

POST bodies use `Content-Type: application/json`. Amounts are USD; `refundAmount` is expressed in dollars, while policy calculations use integer cents. All routes share an in-process limit of 60 requests per minute per detected client IP. Proxy deployments must review client-IP handling; the current app does not configure Express `trust proxy`.

Admin routes require `Authorization: Bearer <ADMIN_TOKEN>`. Public routes do not require a token. There is no customer session or public request-status endpoint.

## GET /health

Checks database availability and reports configured AI mode.

```json
{"ok": true, "aiMode": "offline"}
```

`openai` here means the backend has a key configured. It does not test the provider, schema initialization, or model access. Database failures return an error response.

## POST /refunds

Submit a refund request. This is a state-changing operation, not a policy-question endpoint.

| Field | Validation |
|---|---|
| `email` | Valid email, at most 254 characters; normalized to lowercase |
| `orderId` | Uppercase `MX-` followed by 4–10 digits |
| `message` | Trimmed string, 5–2,000 characters |
| `idempotencyKey` | UUID identifying this submission |

Unknown fields are rejected. The JSON request-body limit is 12 KB.

Example for fresh seeded data:

```sh
curl http://localhost:3001/api/refunds \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "adebayo.ogunleye@example.com",
    "orderId": "MX-1001",
    "message": "Changed my mind, want a refund",
    "idempotencyKey": "358fc992-825d-4ca1-8d04-6c6aab42972f"
  }'
```

A newly stored request returns HTTP 201. Example offline response; the ID is illustrative:

```json
{
  "id": "6d5b7e7e-7dd5-45f2-893d-8d42f9365bb8",
  "verdict": "Approved",
  "refundAmount": 60,
  "ruleIds": ["R2"],
  "reply": "Your refund of $60.00 is approved in this demo. Eligible items are within the 30-day return window. No real payment has been issued.",
  "aiMode": "offline"
}
```

`verdict` is `Approved`, `Denied`, or `Escalated`. An escalated positive amount represents eligible value awaiting review, not an issued payment. Unknown or mismatched email/order pairs return a stored denial with no order details; they are not HTTP authentication errors.

### Safe retries

Generate a new UUID for each new submission. Retry the same payload with the same key after a network failure. The normal replay path returns HTTP 200 with the existing result. A concurrent retry resolved inside the transaction can return 201 with that same result; clients should rely on the request ID, not status alone, for deduplication.

Reusing a key with different normalized email/order/message content returns 409. A different key for an already-refunded order creates a denied request. A different key for an order with a pending review returns 409. A uniqueness race may also return 409; retry the original payload and key.

Replays return the original automated result. They do not expose a subsequent human decision; staff see that decision through admin routes.

## GET /admin/refunds

Returns the latest 100 requests, newest first. No pagination or server-side filter parameters are implemented. The dashboard filters this returned set locally.

Each record includes database fields such as `id`, `customer_email`, `order_id`, `raw_message`, `verdict`, `refund_amount`, `rule_ids`, `customer_reply`, `review_status`, `final_verdict`, `resolution_note`, timestamps, and `ai_mode`. PostgreSQL numeric values in admin records may be serialized as strings; clients should normalize amounts before calculation.

```sh
# Set ADMIN_TOKEN in your shell securely; .env is not automatically loaded by curl.
curl http://localhost:3001/api/admin/refunds \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## GET /admin/refunds/:id/audit

Accepts a request UUID and returns audit entries in insertion order. Steps include:

- `classification`: reason, confidence, safety flags, and actual classifier mode where available.
- `policy`: policy version, verdict, cents, rule IDs, and explanatory notes.
- `resolution`: the human verdict and review note, if resolved.

These are structured application records, not private model chain-of-thought. A valid but nonexistent request UUID currently returns an empty array, not 404.

```sh
curl "http://localhost:3001/api/admin/refunds/$REQUEST_ID/audit" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## POST /admin/refunds/:id/resolve

Resolve a pending request once. Body:

```json
{
  "verdict": "Approved",
  "note": "Reviewed delivery and confirmed refund eligibility."
}
```

`verdict` accepts only `Approved` or `Denied`. The trimmed note must contain 10–1,000 characters. Unknown fields are rejected.

```sh
curl "http://localhost:3001/api/admin/refunds/$REQUEST_ID/resolve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"verdict":"Approved","note":"Reviewed delivery and confirmed refund eligibility."}'
```

Returns HTTP 200 with the updated database record. The original `verdict` remains `Escalated`; `final_verdict` stores the human outcome and `review_status` becomes `resolved`. Approval updates the order to refunded in the same transaction. Support cannot approve an undelivered, already-refunded, expired, or otherwise hard-ineligible order. The route does not accept a custom refund amount.

The initial `customer_reply` and stored eligible amount remain unchanged after resolution. The dashboard prefers `final_verdict` and displays zero for a final denial. No notification is sent to the customer.

## Errors

| Status | Typical cause |
|---|---|
| 400 | Invalid fields, invalid UUID, malformed JSON |
| 401 | Missing or incorrect support token |
| 404 | Resolution target does not exist |
| 409 | Conflicting key, pending review, already-resolved request, or ineligible human approval |
| 413 | JSON body exceeds the parser limit |
| 429 | Rate limit exceeded |
| 500 | Unexpected server/database failure |

Application errors generally use `{"error":"message"}`. The rate limiter uses its default response format, so clients should not assume every error body is JSON. Detailed provider errors are not returned to customers.
