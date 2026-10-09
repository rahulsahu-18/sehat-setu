# SehatSetu implementation status

This document records the current integration boundary against the AI-powered triage platform requirements.

## Existing repository baseline

The current application is a React/Vite client and Express/TypeScript server backed by MongoDB/Mongoose. The existing implementation includes patient intake, structured AI summaries, patient report text extraction, English/Hindi/Odia intake selection, audio transcription through a configured OpenAI API key, staff/facility workflows, case assignment, referral handoff, audit events, retention cleanup, and Node test-runner tests.

## Important differences from the requested target

- Persistence is MongoDB/Mongoose, not PostgreSQL/Prisma. This change is not a drop-in schema migration and must be planned separately.
- Authentication uses bearer JWTs; secure cookie-backed sessions and Better Auth/OAuth are not configured in the checked-in implementation.
- LiveKit/WebRTC and a server-side voice worker are not present. Existing patient voice input is a recording-to-transcript flow, with text fallback and device speech output.
- Doctor follow-up questions are supported as reviewed/sent text questions. The current question-answer model needs a dedicated voice-follow-up experience and a richer, explicitly modeled lifecycle before it meets the full specification.
- The deterministic warning rules are prototype-only and are not clinically validated. They are not a medical emergency classifier and must not be represented as one.
- This is an educational prototype using synthetic data. It has not undergone a clinical validation, privacy impact, penetration-test, or regulatory compliance assessment.

## Changes on `ai-healthcare-gap-fixes`

- `intakeBudget.ts` counts assistant turns that contain a question mark, capped at ten. Its fingerprint includes the preceding patient response so an identical answer/question pair is counted once, while repeated wording after a different answer counts again.
- The patient intake controller now checks the budget before requesting another AI response. After ten distinct question turns, it saves the latest patient response, preserves the prior summary fields and conversation, records an audit event, and moves the case to clinician review (or escalation if the existing warning rules flag the response). The initial intake question budget does not count doctor-authored follow-up requests.
- `clinicalText.ts` provides bounded input normalization and a same-turn retry comparison helper. These helpers are not a complete request-idempotency implementation and are not currently wired into every mutation endpoint.
- `intake-budget.test.cjs` exercises the question-budget utility and text helpers with synthetic data.

The backend cap is implemented, but its verification is still pending because repository dependencies could not be installed in this execution environment. The counter relies on persisted conversation text rather than immutable question-turn IDs; concurrent duplicate submissions should be covered by a future end-to-end idempotency pass.
