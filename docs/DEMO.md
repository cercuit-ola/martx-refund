# Assessment walkthrough and submission checklist

## Prepare

Use a fresh disposable demo dataset so example orders have not already been refunded and the dates match expected outcomes. Start the chosen environment and verify database health. Enable a real provider key for the AI portion and confirm a refund response has `aiMode: "openai"`; a header badge alone is insufficient.

Have the support token available without exposing it in the recording. Do not show `.env`, database connection strings, provider keys, or authorization headers. Use only synthetic customer examples.

## Suggested 3–4 minute video

| Time | Show | Explain |
|---|---|---|
| 0:00–0:30 | Running Compose services and localhost:8080 | React frontend, Express API, PostgreSQL; simulated refunds |
| 0:30–1:00 | Standard return: MX-1001, Approved $60 | Stored item prices determine the amount; rule IDs explain eligibility |
| 1:00–1:30 | Final sale: MX-1002, Denied | Hard policy restrictions win; retry with an instruction to ignore policy and show no unauthorized approval |
| 1:30–2:00 | Human review: MX-1004, Escalated $720 | Amounts above $500 require a staff decision |
| 2:00–2:45 | Support workspace, request details, classification and policy logs | Show actual classifier mode and confidence; distinguish model interpretation from policy authority |
| 2:45–3:15 | Add a review note, approve laptop request, show resolution log | Human resolution persists separately from the initial automated result |
| 3:15–4:00 | README, source map, Compose file, verification results | Explain transactions, retries, safe AI failure, and demo limitations |

Example review note: “Reviewed delivery and confirmed refund eligibility.” The support token must match the running backend. If live classification escalates an additional request, show and explain the actual outcome rather than claiming a predefined model result.

## Architecture talking points

- Customer messages are untrusted input.
- Ownership is checked before transmitting the message to the model.
- AI extracts intent and flags; code sets the verdict and amount.
- Order locks and transactions keep the request, order change, and audit consistent.
- Idempotency keys make network retries safe.
- Template replies cannot promise a model-invented payment.
- Offline mode is keyword matching, not live AI.
- The demo has no payment processor and uses simplified customer/staff authentication.

## Submission checklist

- [ ] Public repository contains the latest source, lockfile, SQL, Dockerfiles, Compose file, and documentation.
- [ ] No credentials or runtime database files are committed.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] A clean Docker environment runs the stack with `docker compose up --build`.
- [ ] Customer approval, denial, escalation, and staff resolution work through the containerized frontend.
- [ ] A real AI response is demonstrated; offline/mocked tests are not presented as live evidence.
- [ ] The GitHub Actions run is checked and its result recorded.
- [ ] Video is uploaded and its link is included with the submission.
- [ ] Verification documentation states actual results and remaining limitations.

Suggested submission text, after completing the checklist:

> MartX Care processes simulated refund requests using stored order data and deterministic policy rules, with an LLM assisting message classification. The repository includes the React interface, Express API, PostgreSQL seed data, Docker Compose setup, tests, and API documentation. See the README for startup instructions and the walkthrough video for the customer and support flows.

Attach the repository URL, actual video URL, and any environment-specific notes. Do not claim pending verification has been completed.
