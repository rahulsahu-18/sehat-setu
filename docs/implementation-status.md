# SehatSetu implementation status

This document records the current integration boundary against the AI-powered triage platform requirements.

## Existing repository baseline

The current application is a React/Vite client and Express/TypeScript server backed by MongoDB/Mongoose. The existing implementation includes patient intake, structured AI summaries, patient report text extraction, English/Hindi/Odia intake selection, audio transcription through a configured OpenAI API key, staff/facility workflows, case assignment, referral handoff, audit events, retention cleanup, and Node test-runner tests.

## Important differences from the requested target

- Persistence is MongoDB/Mongoose, not PostgreSQL/Prisma. This change is not a drop-in schema migration and must be planned separately.
- Authentication uses bearer JWTs; secure cookie-backed sessions and Better Auth/OAuth are not configured in the checked-in implementation.
- LiveKit/WebRTC follow-up infrastructure uses question-script detection: English questions use English OpenAI STT/TTS; Hindi and Odia questions use Sarvam STT/TTS with explicit language codes. The worker exports the required default agent, connects to assigned rooms, and loads its environment from the worker package. Every voice attempt gets a fresh room and explicit agent dispatch. The agent fetches the clinician's exact question from the server, reads it without translation, and returns the transcript in the question's language for the patient to review. Browser cleanup releases microphone resources after manual stop or unexpected disconnect. Live credentials and physical-device audio still need an end-to-end deployment test.
- Doctor follow-up questions are persisted individually with the lifecycle `PENDING → APPROVED → SENT → IN_PROGRESS → ANSWERED → REVIEWED`, plus rejection/cancellation states. Each question has its own answer record. The original transcript is stored in its detected source language (including Odia/Hindi native script) and is never overwritten by the summary. After submission, an English-only, bounded summary is generated and stored separately for the doctor using OpenAI, with explicit rules not to infer or diagnose. If summarization fails, the original response remains saved and visible; an idempotent retry can retry summary generation. The answer endpoint uses an Idempotency-Key, payload hash, a submission lease and a unique partial MongoDB index. Doctor question-bundle creation also uses idempotency keys and a compound unique index.
- Persistent in-app notifications exist for follow-up requests, answer submission and case-review updates. Notification reads and mark-as-read operations are recipient-scoped. Rate limiting currently uses a process-local store; production multi-instance deployments need a shared store.
- The deterministic warning rules are prototype-only and are not clinically validated. They are not a medical emergency classifier and must not be represented as one.
- This is an educational prototype using synthetic data. It has not undergone a clinical validation, privacy impact, penetration-test, or regulatory compliance assessment.

## Changes on `ai-healthcare-gap-fixes`

- `intakeBudget.ts` counts assistant turns that contain a question mark, capped at ten. Its fingerprint includes the preceding patient response so an identical answer/question pair is counted once, while repeated wording after a different answer counts again.
- The patient intake controller now checks the budget before requesting another AI response. After ten distinct question turns, it saves the latest patient response, preserves the prior summary fields and conversation, records an audit event, and moves the case to clinician review (or escalation if the existing warning rules flag the response). The initial intake question budget does not count doctor-authored follow-up requests.
- `clinicalText.ts` provides bounded input normalization and a same-turn retry comparison helper. Intake text submissions are still not fully idempotent end-to-end; the question counter also relies on persisted text rather than immutable intake turn IDs.
- `intake-budget.test.cjs` covers the backend question budget and bounded text helpers.
- `follow-up-controller.test.cjs` verifies per-question answer storage, safe retries, cross-patient access denial, and an integration path that preserves an Odia answer while storing a separate English summary.
- `follow-up-language.test.cjs` verifies script-based English/Hindi/Odia question detection.
- `follow-up-summary.test.cjs` verifies English-only output handling, missing-credential behavior and empty-summary rejection.
- `notification-controller.test.cjs` verifies notification recipient isolation and read-state authorization using synthetic records.
- The clinician question creation API now uses MongoDB unique indexes plus payload hashes for retry-safe bundle writes.

The latest GitHub Actions run passed all three jobs: server typecheck/tests, frontend production build, and voice-agent build/typecheck. CI does not test provider credentials, actual room dispatch on the user's LiveKit project, voice quality on physical devices, or network behavior. MongoDB index rollout, multi-instance rate limiting, concurrency/load testing, penetration testing, backup/restore, and operational recovery still require deployment verification. Clinical rules remain unvalidated and require qualified clinical review.
