# Verification — 29 September 2026

Passed in the local development environment:

- npm install: successful, zero reported vulnerabilities at installation.
- npm test: 9 passing tests, including all 15 supplied scenario rows and expected amounts, 14 injection/target combinations, exact $500/$500.01 and day 30/31 boundaries, ownership redaction, protected admin endpoints, oversized messages, idempotency, persisted duplicate protection, audit logs, and one-time human resolution.
- Mocked OpenAI response contract and provider failure handling tested. No real OpenAI request made.
- npm run build: Vite production build successful.
- Browser: standard customer submission Approved $60; laptop submission Escalated $720; authenticated dashboard loaded both requests; human approval saved with resolution note and audit entry.
- Browser: customer layout inspected at 390px width, document width also 390px (no horizontal overflow).

Not yet verified:

- Docker image build / Compose startup: Docker executable is not installed here. GitHub CI is configured to test Compose once published, but has not run.
- Live OpenAI integration: requires API key.
- Hosted PostgreSQL / Supabase, Vercel and production security configuration.
- Public GitHub repository publication and narrated demo video.

The running local database contains the two browser verification requests. A freshly initialized Docker volume receives the original dataset. The source archive excludes runtime data and secrets.
