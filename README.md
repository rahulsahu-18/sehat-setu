# SehatSetu healthcare triage-support prototype

SehatSetu is an educational prototype using synthetic data only. It organizes patient-provided text and selectable-text PDF/TXT/CSV reports into an AI-drafted brief, missing-information list, source-labelled timeline, follow-up questions, and deterministic prototype warnings for qualified human review. It is not a diagnostic or treatment tool. Do not use it to make real clinical decisions or enter real patient information.

Patients can select English, Hindi, or Odia for the intake assistant and core patient workflow copy. They can type intake or record a voice message of up to 60 seconds. With explicit voice consent, the recording is sent in memory to the configured OpenAI transcription service using the selected language; SehatSetu does not store the audio. Provider data-retention policies still apply. The editable transcript is only sent to the care team after the patient submits it. Assistant replies can be read aloud using available browser/device speech voices; voice availability and quality vary by device. Staff must review AI suggestions and enter patient-visible next steps before completing a case. After recording a referral decision, staff prepare and save a detailed structured referral handoff with source-labelled case information, for staff review and printing only. Staff separately enter clinician-approved patient instructions and explicitly approve/share a concise patient slip containing the case reference, referring and receiving facilities, referral reason, and those instructions. The patient endpoint never returns the detailed AI summary, timeline, report sources, flags, missing details, contradictions, or staff assessment. The handoff and patient slip are not sent to the receiving facility or appointment systems. Keep private assessment notes in the separate “Assessment / reason” field; that field is not returned to patients or included in either referral document.

Report uploads are limited to one PDF/TXT/CSV file at a time, 5 MB, and 10 PDF pages. PDFs must contain selectable text; scanned PDFs and images are rejected. Uploaded files are processed in memory and are not retained as binary files; extracted text and its sanitized filename are saved with the case. The AI prompt is bounded and receives at most the first 4,000 characters from an uploaded report; staff should inspect the full extracted text and original report outside this prototype before relying on any detail. No OCR or image understanding is implemented. Voice transcription requires a valid AI provider API key and a browser that supports microphone capture; text intake remains available without voice support.

The AI prompt extracts a timeline only from explicit dates/times and labels source material. Every timeline, report value, summary, question, and warning is unverified and requires human review. The small English/Hindi/Odia emergency phrase rules are not clinically validated or comprehensive; they do not replace local escalation pathways.

## Local setup

1. Install Node.js 20.19+ (or 22.12+) and pnpm.
2. Copy `server/.env.example` to `server/.env`; set `MONGO_URI`, a long random `JWT_SECRET`, and a valid `OPENAI_API_KEY` for AI intake and voice transcription. `OPENAI_TRANSCRIPTION_MODEL` defaults to `whisper-1`. The server loads `server/.env` regardless of the directory used to start it. Never commit `.env` or send credentials in chat.
3. Copy `client/.env.example` to `client/.env.local` and set `VITE_API_BASE_URL` if the API is not at `http://localhost:5000/api/v1`.
4. Install dependencies with `pnpm --dir server install` and `pnpm --dir client install`.
5. Start MongoDB, then run `pnpm --dir server dev` and `pnpm --dir client dev` in separate terminals.
6. Open the Vite URL printed by the client. `GET /health` reports whether the API can reach MongoDB and whether AI intake is configured; it never returns credentials.

The project uses MongoDB/Mongoose; there are no SQL migrations. Existing `Case` documents receive defaults for embedded audit events when loaded. New consent metadata is recorded on new intakes and when a patient consents while reopening an older case.

## Tests and builds

- `pnpm --dir server test` compiles the server and runs Node's built-in test runner. Provider tests mock `fetch` and do not require an API key.
- `pnpm --dir client build` typechecks and creates a production frontend bundle.
- `pnpm --dir server build` typechecks and compiles the API.

## Doctor follow-ups, voice sessions and notifications

Follow-up questions are tracked independently by question ID. Each patient response is stored against exactly one follow-up question in MongoDB. The answer endpoint requires an `Idempotency-Key`; a repeat with the same key and payload replays the stored result, while a conflicting second answer receives HTTP 409. The question state lifecycle is `PENDING → APPROVED → SENT → IN_PROGRESS → ANSWERED → REVIEWED`, with rejection/cancellation terminal states where permitted. The API checks ownership against the authenticated patient and facility-scoped staff access.

Persistent in-app notifications are exposed under `GET /api/v1/notifications` and `PATCH /api/v1/notifications/:notificationId/read`. Notification preview text is intentionally generic and should not contain symptoms or other clinical details.

### LiveKit setup (optional for local text development)

1. Create a LiveKit project and keep its API secret on the server/worker only.
2. Add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_AGENT_NAME` to `server/.env`.
3. Create a long random `VOICE_AGENT_SECRET` and set the exact same value in `server/.env` and `voice-agent/.env`.
4. Copy `voice-agent/.env.example` to `voice-agent/.env`, configure `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_TRANSCRIPTION_MODEL`. Set `VOICE_AGENT_API_BASE_URL=http://localhost:5000` for local development.
5. Install the new browser SDK with `pnpm --dir client install`; this also refreshes the client lockfile after the dependency change. Install/start the agent in a separate terminal:
   ```bash
   pnpm --dir voice-agent install
   pnpm --dir voice-agent dev
   ```
6. Use the Follow-ups link on the patient case page. The backend issues a short-lived token scoped to the follow-up room. The browser microphone is paused while the agent is speaking. The transcript is shown in the editor and is stored only when the patient submits the answer.

If LiveKit credentials are missing, the voice-token endpoint returns a provider-unavailable response and text follow-up remains available. This repository change cannot verify your LiveKit account, URLs, network/firewall setup, or provider credentials. Speech accuracy and voice quality for English, Hindi and Odia must be tested with qualified language reviewers before a deployment claims support for those languages. No raw audio is written to the application's database by this voice workflow; external speech/LLM providers may apply their own data-retention terms.

### Clinical safety review gate

See [Clinical safety validation and sign-off](docs/clinical-safety-validation.md). The deterministic warning rules remain an unvalidated prototype. Production startup now requires a documented clinical approval attestation through `CLINICAL_SAFETY_POLICY_STATUS`, `CLINICAL_SAFETY_POLICY_APPROVED_BY`, `CLINICAL_SAFETY_POLICY_APPROVED_AT`, and `CLINICAL_SAFETY_POLICY_REVIEW_RECORD`. These values are not independent proof of approval: set them only after a qualified clinical lead has completed and documented review. Automated tests are software checks, not clinical validation.

### Additional checks

A GitHub Actions workflow at `.github/workflows/healthcare-quality.yml` installs each application package, builds the API and frontend/voice worker, and runs synthetic-data server tests. The workflow has been added but has not been observed passing in this execution. For local checks:
```bash
pnpm --dir server test
pnpm --dir client install
pnpm --dir client build
pnpm --dir voice-agent install
pnpm --dir voice-agent build
```

Rate limits in this prototype use an in-memory process-local store. Multi-instance production deployments must replace it with a shared store and complete a load/security review before relying on it as a global rate limit.

## Deployment

- Set `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (at least 32 characters), `OPENAI_API_KEY`, `CLIENT_ORIGINS` (comma-separated exact origins, no paths), and `VITE_API_BASE_URL` in the deployment platform's secret/configuration manager. The API refuses production startup when required settings are missing; values are not logged.
- Build the client and server using the commands above. Serve the client through HTTPS and expose the API behind HTTPS at the configured base URL. The API currently starts after MongoDB connects and exposes `GET /health` for readiness checks.
- Configure MongoDB backups and test restore procedures before demonstrations that need durable records. Back up secrets separately using your deployment provider's secret management.
- `DATA_RETENTION_DAYS` controls automatic permanent deletion of expired cases and their linked inputs, summaries, decisions, questions, answers, and referral notes. It defaults to 90 days and must be set to an integer from 1 to 3650. The cleanup runs at server startup and every 24 hours. Patients can permanently delete individual cases or their account and linked cases from “My Cases”. Deletion is not a guarantee that copies in database backups or external AI-provider systems are immediately erased; configure and test those retention controls separately.
- Do not claim legal or regulatory compliance. Obtain independent security, privacy, and qualified clinical review before any real-world use.

## Safety-rule limitation

The deterministic warning rules use a small set of English, Hindi, and Odia phrase matches for prototype testing; they are not clinically validated. They can miss paraphrases, language variants, context, or negation patterns. A qualified clinical team must review, localize, and validate every rule and facility escalation instruction before real-world deployment. A warning is not a diagnosis, and ordinary queue priority must not suppress it.
