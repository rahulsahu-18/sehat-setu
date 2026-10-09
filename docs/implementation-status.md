# SehatSetu implementation status

This document records the current integration boundary against the AI-powered triage platform requirements.

## Existing repository baseline

The current application is a React/Vite client and Express/TypeScript server backed by MongoDB/Mongoose. The existing implementation includes patient intake, structured AI summaries, patient report text extraction, English/Hindi/Odia intake selection, audio transcription through a configured OpenAI API key, staff/facility workflows, case assignment, referral handoff, audit events, retention cleanup, and Node test-runner tests.

## Important differences from the requested target

- Persistence is MongoDB/Mongoose, not PostgreSQL/Prisma. This change is not a drop-in schema migration and must be planned separately.
- Authentication uses bearer JWTs; secure cookie-backed sessions and Better Auth/OAuth are not configured in the checked-in implementation.
- LiveKit/WebRTC follow-up infrastructure is present on this branch: the server issues short-lived room-scoped tokens, the LiveKit agent retrieves the exact clinician-authored question through a shared-secret API, and the browser receives transcript/state events and lets the patient review the transcript before submission. A real credentialed LiveKit/OpenAI session has not been verified in this environment.
- Doctor follow-up questions are persisted individually with the lifecycle `PENDING → APPROVED → SENT → IN_PROGRESS → ANSWERED → REVIEWED`, plus rejection/cancellation states. Each question has its own answer record; the answer endpoint uses an Idempotency-Key, payload hash, a submission lease and a unique partial MongoDB index to handle retries. Doctor question-bundle creation now also validates an idempotency key and uses a compound unique index to avoid duplicate records for the same batch key and question position.
- Persistent in-app notifications exist for follow-up requests, answer submission and case-review updates. Notification reads and mark-as-read operations are recipient-scoped. Rate limiting currently uses a process-local store; production multi-instance deployments need a shared store.
- The deterministic warning rules are prototype-only and are not clinically validated. They are not a medical emergency classifier and must not be represented as one.
- This is an educational prototype using synthetic data. It has not undergone a clinical validation, privacy impact, penetration-test, or regulatory compliance assessment.

## Changes on `ai-healthcare-gap-fixes`

- `intakeBudget.ts` counts assistant turns that contain a question mark, capped at ten. Its fingerprint includes the preceding patient response so an identical answer/question pair is counted once, while repeated wording after a different answer counts again.
- The patient intake controller now checks the budget before requesting another AI response. After ten distinct question turns, it saves the latest patient response, preserves the prior summary fields and conversation, records an audit event, and moves the case to clinician review (or escalation if the existing warning rules flag the response). The initial intake question budget does not count doctor-authored follow-up requests.
- `clinicalText.ts` provides bounded input normalization and a same-turn retry comparison helper. Intake text submissions are still not fully idempotent end-to-end; the question counter also relies on persisted text rather than immutable intake turn IDs.
- `intake-budget.test.cjs` covers the backend question budget and bounded text helpers.
- `follow-up-controller.test.cjs` verifies per-question answer storage, safe retries and cross-patient access denial using synthetic records.
- `notification-controller.test.cjs` verifies notification recipient isolation and read-state authorization using synthetic records.
- The clinician question creation API now uses MongoDB unique indexes plus payload hashes for retry-safe bundle writes.

The GitHub Actions workflow has passed for the previous integrated checkpoint: server typecheck/tests, frontend production build, and voice-agent build/typecheck all succeeded. After the latest additions, a new workflow run is still required before calling this branch green. Real provider connectivity, network interruptions against a deployed LiveKit room, MongoDB replica/cluster index deployment, concurrency/load testing, penetration testing and operational recovery have not been independently verified.
