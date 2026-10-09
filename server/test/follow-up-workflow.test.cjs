const { test } = require("node:test");
const assert = require("node:assert/strict");
const { QuestionStatus } = require("../dist/models/question.model.js");
const { isAllowedFollowUpTransition } = require("../dist/utils/followUpWorkflow.js");

test("allows the explicit follow-up lifecycle", () => {
  assert.equal(isAllowedFollowUpTransition(QuestionStatus.PENDING, QuestionStatus.APPROVED), true);
  assert.equal(isAllowedFollowUpTransition(QuestionStatus.APPROVED, QuestionStatus.SENT), true);
  assert.equal(isAllowedFollowUpTransition(QuestionStatus.SENT, QuestionStatus.IN_PROGRESS), true);
  assert.equal(isAllowedFollowUpTransition(QuestionStatus.IN_PROGRESS, QuestionStatus.ANSWERED), true);
  assert.equal(isAllowedFollowUpTransition(QuestionStatus.ANSWERED, QuestionStatus.REVIEWED), true);
});

test("rejects invalid terminal and backwards transitions", () => {
  assert.equal(isAllowedFollowUpTransition(QuestionStatus.REVIEWED, QuestionStatus.SENT), false);
  assert.equal(isAllowedFollowUpTransition(QuestionStatus.REJECTED, QuestionStatus.APPROVED), false);
  assert.equal(isAllowedFollowUpTransition(QuestionStatus.CANCELLED, QuestionStatus.IN_PROGRESS), false);
  assert.equal(isAllowedFollowUpTransition(QuestionStatus.ANSWERED, QuestionStatus.SENT), false);
});

test("allows repeated in-progress state only for idempotent session resume", () => {
  assert.equal(isAllowedFollowUpTransition(QuestionStatus.IN_PROGRESS, QuestionStatus.IN_PROGRESS), true);
  assert.equal(isAllowedFollowUpTransition(QuestionStatus.PENDING, QuestionStatus.PENDING), false);
});
