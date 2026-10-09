const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  getIntakeQuestionBudget,
  excludeStaffAuthoredQuestions,
  MAX_AI_INTAKE_QUESTIONS,
} = require("../dist/utils/intakeBudget.js");
const { normalizePatientText, isRepeatedTurn } = require("../dist/utils/clinicalText.js");

test("counts distinct assistant questions only", () => {
  const conversation = [
    { role: "assistant", content: "When did it start?" },
    { role: "user", content: "Yesterday" },
    { role: "assistant", content: "How severe is it?" },
    { role: "assistant", content: "How severe is it?" },
    { role: "assistant", content: "I have saved your answer." },
  ];
  assert.deepEqual(getIntakeQuestionBudget(conversation), {
    used: 2,
    remaining: 8,
    exhausted: false,
    overLimit: false,
  });
});

test("counts a repeated question again after a different patient answer", () => {
  const conversation = [
    { role: "user", content: "I have a fever" },
    { role: "assistant", content: "When did it start?" },
    { role: "user", content: "Yesterday" },
    { role: "assistant", content: "What is your temperature?" },
    { role: "user", content: "I have not measured it" },
    { role: "assistant", content: "When did it start?" },
  ];
  assert.equal(getIntakeQuestionBudget(conversation).used, 3);
});

test("stops at the configured ten-question maximum", () => {
  const conversation = Array.from({ length: 12 }, (_, index) => ({
    role: "assistant",
    content: `Question number ${index + 1}?`,
  }));
  assert.equal(MAX_AI_INTAKE_QUESTIONS, 10);
  assert.deepEqual(getIntakeQuestionBudget(conversation), {
    used: 10,
    remaining: 0,
    exhausted: true,
    overLimit: true,
  });
});

test("counts multiple questions in one assistant turn and detects overflow", () => {
  const conversation = [
    { role: "user", content: "I have a fever" },
    { role: "assistant", content: "When did it start? Have you measured it?" },
    ...Array.from({ length: 9 }, (_, index) => [
      { role: "user", content: `answer ${index}` },
      { role: "assistant", content: `Question ${index}?` },
    ]).flat(),
  ];
  const budget = getIntakeQuestionBudget(conversation);
  assert.equal(budget.used, 10);
  assert.equal(budget.remaining, 0);
  assert.equal(budget.exhausted, true);
  assert.equal(budget.overLimit, true);
});

test("excludes exact staff-authored questions from the AI question budget", () => {
  const conversation = [
    { role: "user", content: "I have a fever" },
    { role: "assistant", content: "When did it start?" },
    { role: "assistant", content: "Have you taken any medicine for the fever?" },
    { role: "user", content: "No medicine so far" },
    { role: "assistant", content: "How long has the fever lasted?" },
  ];
  const filtered = excludeStaffAuthoredQuestions(conversation, [
    "Have you taken any medicine for the fever?",
  ]);
  assert.equal(filtered.length, 4);
  assert.equal(getIntakeQuestionBudget(filtered).used, 2);
});

test("normalizes bounded patient text without inventing content", () => {
  assert.equal(normalizePatientText("  fever\u0000 since yesterday "), "fever since yesterday");
  assert.equal(normalizePatientText("   "), null);
  assert.equal(normalizePatientText("x".repeat(5), 4), null);
  assert.equal(normalizePatientText(null), null);
});

test("detects identical prior turns for retry protection", () => {
  const conversation = [{ role: "user", content: "I have a fever" }];
  assert.equal(isRepeatedTurn(conversation, "user", " I have   a fever "), true);
  assert.equal(isRepeatedTurn(conversation, "assistant", "I have a fever"), false);
});
