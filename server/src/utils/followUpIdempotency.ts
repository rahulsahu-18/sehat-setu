import { createHash } from "node:crypto";
import { AnswerMode } from "../models/answer.model";

export function validFollowUpIdempotencyKey(value: string | undefined): value is string {
  return Boolean(value && value.length >= 16 && value.length <= 128 && /^[a-zA-Z0-9._:-]+$/.test(value));
}

export function hashFollowUpAnswer(answer: string, mode: AnswerMode) {
  return createHash("sha256").update(JSON.stringify({ answer, mode })).digest("hex");
}

export function matchesIdempotentAnswer(
  saved: { idempotencyKey?: string; payloadHash?: string },
  key: string,
  payloadHash: string,
) {
  return saved.idempotencyKey === key && saved.payloadHash === payloadHash;
}
