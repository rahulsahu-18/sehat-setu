const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { Types } = require("mongoose");
const { AISummary } = require("../dist/models/AISummary.model.js");
const { persistIntakeSummary } = require("../dist/utils/intakeConversation.js");

const originalFindOne = AISummary.findOne;
const originalCreate = AISummary.create;
afterEach(() => {
  AISummary.findOne = originalFindOne;
  AISummary.create = originalCreate;
});

test("rebases a summary turn after a concurrent version collision", async () => {
  const caseId = new Types.ObjectId();
  const versions = [
    {
      version: 1,
      data: {
        conversationSource: "server-generated-v1",
        conversation: [{ role: "user", content: "prior synthetic concern" }],
      },
    },
    {
      version: 2,
      data: {
        conversationSource: "server-generated-v1",
        conversation: [
          { role: "user", content: "prior synthetic concern" },
          { role: "assistant", content: "other concurrent response" },
        ],
      },
    },
  ];
  let reads = 0;
  let writes = 0;
  AISummary.findOne = () => ({ sort: async () => versions[Math.min(reads++, 1)] });
  AISummary.create = async (record) => {
    writes += 1;
    if (writes === 1) {
      const conflict = new Error("duplicate synthetic test version");
      conflict.code = 11000;
      throw conflict;
    }
    return record;
  };

  const saved = await persistIntakeSummary(
    caseId,
    [{ role: "user", content: "fallback" }],
    "new synthetic reply",
    "new assistant follow-up",
    { summary: "synthetic summary" },
  );
  assert.equal(saved.version, 3);
  assert.equal(saved.data.conversation[1].content, "other concurrent response");
  assert.equal(saved.data.conversation[2].content, "new synthetic reply");
  assert.equal(writes, 2);
});

test("persists every prompt from an answered follow-up bundle", async () => {
  const caseId = new Types.ObjectId();
  const latest = {
    version: 1,
    data: {
      conversationSource: "server-generated-v1",
      conversation: [{ role: "user", content: "synthetic concern" }],
    },
  };
  AISummary.findOne = () => ({ sort: async () => latest });
  AISummary.create = async (record) => record;

  const saved = await persistIntakeSummary(
    caseId,
    [
      { role: "user", content: "synthetic concern" },
      { role: "assistant", content: "When did it start?" },
      { role: "assistant", content: "Has it changed?" },
    ],
    "It started yesterday",
    "Thank you for clarifying.",
    { summary: "Updated synthetic summary" },
  );

  assert.deepEqual(
    saved.data.conversation.map((message) => message.content),
    [
      "synthetic concern",
      "When did it start?",
      "Has it changed?",
      "It started yesterday",
      "Thank you for clarifying.",
    ],
  );
});