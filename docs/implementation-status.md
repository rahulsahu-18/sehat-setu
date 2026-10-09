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

## Added helper utilities

- `intakeBudget.ts` provides a backend-side question-budget utility with duplicate question text counted once.
- `clinicalText.ts` provides bounded input normalization and a same-turn retry comparison helper.
- `intake-budget.test.cjs` exercises these helpers using synthetic test content.

These utilities are deliberately additive. They are not yet wired into the production intake controller; do not assume the question-limit or retry-protection requirement is fully implemented until that integration is completed and verified.
