# Clinical safety policy: validation and sign-off required

## Current status

**Status: NOT CLINICALLY VALIDATED. Do not use this prototype to triage real patients or to make clinical decisions.**

The rule set in `server/src/utils/triageRules.ts` is a small English/Hindi/Odia phrase-matching prototype. It is not a validated emergency detector, is not comprehensive, and may miss paraphrases, negations, code-switching, transcription errors, and context. A flag is not a diagnosis; no flag must not be interpreted as evidence that a patient is safe.

This repository change adds a production-startup gate for a clinical review record. It does not perform clinical validation, verify a clinician's credentials, or create a genuine approval.

## Required qualified review before production

A suitably qualified clinical lead for the target facilities and care pathways must own and sign off on the policy. The reviewer should involve local emergency/triage stakeholders and language reviewers for every supported language.

1. Inventory each rule, its intended use, limitations, trigger phrases, negation handling, and patient-facing instruction.
2. Confirm local escalation language, facility workflow, emergency numbers and referral procedures from authoritative local sources. Do not adopt a guessed threshold or unverified emergency instruction.
3. Build a clinically authored, de-identified test set for English, Hindi, Odia, and representative code-switching, speech-recognition errors, misspellings, abbreviations, paraphrases, negations, uncertainty, and contradictions.
4. Measure missed urgent reports and false escalations separately; review every miss with the clinical lead. A small manually selected sample alone is not sufficient.
5. Test that flags are visible regardless of queue priority, that notification failure never blocks immediate emergency guidance, and that the software never diagnoses or prescribes.
6. Test patient disclosure, accessibility, low-bandwidth behavior, staff hand-off, and PHC/clinic/camp-specific escalation procedures.
7. Version the policy and test set. Record approver name and credentials, facility/jurisdiction scope, version, approval timestamp, test results, known limitations, and re-review date. Keep the approval record in a controlled system.
8. Re-review after any rule, prompt, model, STT/TTS provider, language, workflow, or escalation-path change. Establish ongoing incident monitoring and a rollback process.

## Production startup gate

The API refuses to start with `NODE_ENV=production` unless all of these environment fields are set:

- `CLINICAL_SAFETY_POLICY_STATUS=approved`
- `CLINICAL_SAFETY_POLICY_APPROVED_BY`
- `CLINICAL_SAFETY_POLICY_APPROVED_AT` (valid ISO date)
- `CLINICAL_SAFETY_POLICY_REVIEW_RECORD` (reference to the controlled review evidence)
- `CLINICAL_SAFETY_MESSAGE_ENGLISH`, `CLINICAL_SAFETY_MESSAGE_HINDI`, and `CLINICAL_SAFETY_MESSAGE_ODIA` (localized emergency instructions approved for the exact deployment facilities/jurisdiction)

These fields are attestations, not proof. Do not set the status to approved until a qualified clinician has actually completed the review and the evidence is independently retained. Never put patient data or full transcripts in the environment values.

## Prototype testing

Automated tests use synthetic data and check deterministic software behavior only. Passing software tests does not establish sensitivity, specificity, clinical validity, or regulatory compliance.
