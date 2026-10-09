const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validFollowUpIdempotencyKey,
  hashFollowUpAnswer,
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
