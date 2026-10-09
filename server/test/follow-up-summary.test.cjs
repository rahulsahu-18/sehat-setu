const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { generateEnglishFollowUpSummary } = require("../dist/utils/followUpSummary.js");

const original = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_SUMMARY_MODEL: process.env.OPENAI_SUMMARY_MODEL,
};
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  for (const [name, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("summarizes an Odia answer in English without changing the source answer", async () => {
  process.env.OPENAI_API_KEY = "synthetic-test-key";
  let requestBody;
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        summary: "The patient reports that the cough began three days ago.",
      }) } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const originalAnswer = "ତିନି ଦିନ ହେଲା କାଶ ହେଉଛି।";
  const summary = await generateEnglishFollowUpSummary(
    "ଆପଣଙ୍କୁ କାଶ କେବେ ଆରମ୍ଭ ହେଲା?",
    originalAnswer,
    "odia",
  );

  assert.equal(summary, "The patient reports that the cough began three days ago.");
  assert.equal(requestBody.messages[1].content.includes(originalAnswer), true);
  assert.match(requestBody.messages[0].content, /only in clear, concise English/i);
  assert.match(requestBody.messages[0].content, /Do not add facts/i);
});

test("fails clearly when summary credentials are missing", async () => {
  delete process.env.OPENAI_API_KEY;
  await assert.rejects(
    generateEnglishFollowUpSummary("When did it start?", "Yesterday", "english"),
    /requires OPENAI_API_KEY/i,
  );
});

test("does not accept an empty summary from the provider", async () => {
  process.env.OPENAI_API_KEY = "synthetic-test-key";
  global.fetch = async () => new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({ summary: " " }) } }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  await assert.rejects(
    generateEnglishFollowUpSummary("When did it start?", "Yesterday", "english"),
    /empty summary/i,
  );
});
