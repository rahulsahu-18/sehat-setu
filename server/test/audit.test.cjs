const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { Types } = require("mongoose");
const { Case } = require("../dist/models/case.model.js");
const { appendCaseAudit } = require("../dist/utils/caseAudit.js");

const originalUpdateOne = Case.updateOne;
afterEach(() => {
  Case.updateOne = originalUpdateOne;
});

test("audit records metadata only and never receives chat or credential fields", async () => {
  let update;
  Case.updateOne = async (_filter, value) => {
    update = value;
    return { modifiedCount: 1 };
  };
  await appendCaseAudit(new Types.ObjectId(), {
    action: "STAFF_REVIEW_RECORDED",
    actorId: new Types.ObjectId(),
    timestamp: new Date(),
    fromStatus: "WAITING_FOR_REVIEW",
    toStatus: "ACTIVE",
  });
  const event = update.$push.auditTrail.$each[0];
  assert.equal(event.action, "STAFF_REVIEW_RECORDED");
  assert.equal(Object.hasOwn(event, "content"), false);
  assert.equal(Object.hasOwn(event, "password"), false);
  assert.equal(Object.hasOwn(event, "token"), false);
});