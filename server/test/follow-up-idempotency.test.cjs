const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validFollowUpIdempotencyKey,
  hashFollowUpAnswer,
  hashFollowUpQuestionBatch,
  matchesIdempotentAnswer,
} = require("../dist/utils/followUpIdempotency.js");

test("requires a stable, bounded idempotency key", () => {
  assert.equal(validFollowUpIdempotencyKey("a".repeat(16)), true);
  assert.equal(validFollowUpIdempotencyKey("short"), false);
  assert.equal(validFollowUpIdempotencyKey("bad key with spaces"), false);
  assert.equal(validFollowUpIdempotencyKey("a".repeat(129)), false);
  assert.equal(validFollowUpIdempotencyKey(undefined), false);
});

test("hashes the answer and mode deterministically without storing plaintext in the key", () => {
  const first = hashFollowUpAnswer("fever started yesterday", "TEXT");
  const retry = hashFollowUpAnswer("fever started yesterday", "TEXT");
  const edited = hashFollowUpAnswer("fever started two days ago", "TEXT");
  const voice = hashFollowUpAnswer("fever started yesterday", "VOICE");
  assert.equal(first, retry);
  assert.notEqual(first, edited);
  assert.notEqual(first, voice);
  assert.equal(first.includes("fever"), false);
});

test("accepts exact idempotent replays only", () => {
  const payloadHash = hashFollowUpAnswer("No medication", "TEXT");
  assert.equal(matchesIdempotentAnswer({ idempotencyKey: "answer-key-00000001", payloadHash }, "answer-key-00000001", payloadHash), true);
  assert.equal(matchesIdempotentAnswer({ idempotencyKey: "answer-key-00000001", payloadHash }, "answer-key-00000002", payloadHash), false);
  assert.equal(matchesIdempotentAnswer({ idempotencyKey: "answer-key-00000001", payloadHash }, "answer-key-00000001", "different"), false);
});

test("hashes clinician question bundles deterministically and preserves order", () => {
  const first = hashFollowUpQuestionBatch(["When did it start?", "Has it changed?"]);
  const retry = hashFollowUpQuestionBatch(["When did it start?", "Has it changed?"]);
  const trimmed = hashFollowUpQuestionBatch([" When did it start? ", "Has it changed?"]);
  const reordered = hashFollowUpQuestionBatch(["Has it changed?", "When did it start?"]);
  const changed = hashFollowUpQuestionBatch(["When did it start?", "Is it getting worse?"]);
  assert.equal(first, retry);
  assert.equal(first, trimmed);
  assert.notEqual(first, reordered);
  assert.notEqual(first, changed);
  assert.doesNotMatch(first, /When did it start/);
});
