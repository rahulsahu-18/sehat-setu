const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { Types } = require("mongoose");
const { Answer } = require("../dist/models/answer.model.js");
const { AISummary } = require("../dist/models/AISummary.model.js");
const { Case } = require("../dist/models/case.model.js");
const { CaseInput } = require("../dist/models/caseInput.model.js");
const { Decision } = require("../dist/models/decision.model.js");
const { Question } = require("../dist/models/question.model.js");
const { ReferralNote } = require("../dist/models/referralNote.model.js");
const { deleteCaseData, purgeExpiredCases } = require("../dist/utils/caseData.js");

const originals = new Map();
const patched = [];

function patch(target, name, implementation) {
  if (!originals.has(target)) originals.set(target, new Map());
  const methods = originals.get(target);
  if (!methods.has(name)) methods.set(name, target[name]);
  target[name] = implementation;
  patched.push([target, name]);
}

afterEach(() => {
  for (const [target, name] of patched.splice(0)) {
    target[name] = originals.get(target).get(name);
  }
  originals.clear();
});

test("deletes linked patient data before removing the case record", async () => {
  const caseId = new Types.ObjectId();
  const questionId = new Types.ObjectId();
  const deleted = [];
  patch(Question, "find", (filter) => ({
    distinct: async (field) => {
    assert.equal(field, "_id");
    assert.equal(String(filter.caseId), String(caseId));
    return [questionId];
    },
  }));
  patch(Answer, "deleteMany", async (filter) => {
    assert.deepEqual(filter.questionId.$in, [questionId]);
    deleted.push("answers");
  });
  patch(CaseInput, "deleteMany", async () => deleted.push("inputs"));
  patch(AISummary, "deleteMany", async () => deleted.push("summaries"));
  patch(Decision, "deleteMany", async () => deleted.push("decisions"));
  patch(Question, "deleteMany", async () => deleted.push("questions"));
  patch(ReferralNote, "deleteMany", async () => deleted.push("referral-notes"));
  patch(Case, "deleteOne", async () => {
    assert.deepEqual(
      new Set(deleted),
      new Set([
        "answers",
        "inputs",
        "summaries",
        "decisions",
        "questions",
        "referral-notes",
      ]),
    );
    deleted.push("case");
    return { deletedCount: 1 };
  });

  await deleteCaseData(caseId);
  assert.equal(deleted.at(-1), "case");
});

test("refuses unsafe retention settings", async () => {
  await assert.rejects(purgeExpiredCases(0), /positive integer/i);
  await assert.rejects(purgeExpiredCases(1.5), /positive integer/i);
});
