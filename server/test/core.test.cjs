const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  evaluateSafetyFlags,
} = require("../dist/utils/triageRules.js");
const {
  isAllowedStatusTransition,
  isAssignableStaffRole,
  staffCanServeCase,
} = require("../dist/utils/caseWorkflow.js");
const {
  CaseStatus,
} = require("../dist/models/case.model.js");
const {
  parseIntakeReply,
  generateIntakeReply,
  isAIIntakeConfigurationError,
} = require("../dist/utils/aiIntake.js");
const {
  patientOwnedCaseFilter,
  facilityCaseFilter,
} = require("../dist/utils/caseAccess.js");
const { appendIntakeTurn } = require("../dist/utils/intakeConversation.js");

const originalFetch = global.fetch;
const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
});

test("flags explicitly reported emergency wording", () => {
  const flags = evaluateSafetyFlags(["I am having severe trouble breathing now"]);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].status, "POSSIBLY_PRESENT");
  assert.equal(flags[0].ruleId, "breathing-emergency-words");
});

test("does not flag clearly negated emergency wording", () => {
  assert.deepEqual(
    evaluateSafetyFlags(["I do not have difficulty breathing"]),
    [],
  );
});

test("marks uncertain wording for clarification", () => {
  const flags = evaluateSafetyFlags(["I might have difficulty breathing"]);
  assert.equal(flags[0].status, "UNCERTAIN");
  assert.match(flags[0].reason, /uncertainty/);
});

test("marks contradictory reports without inferring absence", () => {
  const flags = evaluateSafetyFlags([
    "I have difficulty breathing",
    "I do not have difficulty breathing",
  ]);
  assert.equal(flags[0].status, "CONFLICTING_REPORTS");
});

test("does not create a flag for unmentioned warning signs", () => {
  assert.deepEqual(evaluateSafetyFlags(["I have a mild headache"]), []);
});

test("handles Hindi negation and uncertainty without treating missing as absent", () => {
  assert.deepEqual(evaluateSafetyFlags(["मुझे सांस लेने में दिक्कत नहीं है"], "hindi"), []);
  assert.equal(
    evaluateSafetyFlags(["शायद मुझे सांस लेने में दिक्कत है"], "hindi")[0].status,
    "UNCERTAIN",
  );
  assert.deepEqual(evaluateSafetyFlags(["I have a headache"]), []);
});

test("validates case transitions and terminal completion", () => {
  assert.equal(
    isAllowedStatusTransition(CaseStatus.WAITING_FOR_REVIEW, CaseStatus.ACTIVE),
    true,
  );
  assert.equal(
    isAllowedStatusTransition(CaseStatus.COMPLETED, CaseStatus.ACTIVE),
    false,
  );
  assert.equal(
    isAllowedStatusTransition(CaseStatus.WAITING_FOR_PATIENT, CaseStatus.FINAL_REVIEW),
    true,
  );
});

test("limits assignments to eligible same-facility staff", () => {
  assert.equal(staffCanServeCase("facility-a", "facility-a"), true);
  assert.equal(staffCanServeCase("facility-a", "facility-b"), false);
  assert.equal(isAssignableStaffRole("DOCTOR"), true);
  assert.equal(isAssignableStaffRole("FACILITY_ADMIN"), false);
});

test("patient-owned case filters scope by both case and patient", () => {
  const filter = patientOwnedCaseFilter(
    "64b000000000000000000001",
    "64b000000000000000000002",
  );
  assert.equal(String(filter._id), "64b000000000000000000001");
  assert.equal(String(filter.patientId), "64b000000000000000000002");
  assert.equal(patientOwnedCaseFilter("bad", "64b000000000000000000002"), null);
});

test("facility case filters are facility scoped", () => {
  const filter = facilityCaseFilter(
    "64b000000000000000000001",
    "64b000000000000000000003",
  );
  assert.equal(String(filter.facilityId), "64b000000000000000000003");
  assert.equal(facilityCaseFilter("64b000000000000000000001", "bad"), null);
});

test("rejects malformed AI JSON and safely normalizes partial JSON", () => {
  assert.throws(() => parseIntakeReply("not json"), /invalid response/i);
  const partial = parseIntakeReply('Here is the response: ```json\n{"summary":"facts"}\n```');
  assert.equal(partial.summary, "facts");
  assert.equal(partial.complete, false);
  assert.deepEqual(partial.followUpQuestions, []);
});

test("keeps source labels on explicitly reported timeline events", () => {
  const parsed = parseIntakeReply(JSON.stringify({
    timeline: [
      { when: "three days ago", event: "Patient reports fever began", source: "patient text" },
      { when: 42, event: "invalid date type", source: "unknown" },
    ],
  }));
  assert.deepEqual(parsed.timeline, [
    {
      when: "three days ago",
      event: "Patient reports fever began",
      source: "patient text",
    },
  ]);
});

test("uses a mocked provider response and bounds returned content", async () => {
  process.env.OPENAI_API_KEY = "synthetic-test-key";
  let requestBody;
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({
      message: "Please describe when this started.",
      summary: "Patient reports headache.",
      missingInformation: ["onset"],
      contradictions: [],
      urgencySignals: [],
      followUpQuestion: "When did it begin?",
      complete: false,
    }) } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const reply = await generateIntakeReply("english", [
    { role: "user", content: "I have a headache" },
  ]);
  assert.equal(reply.summary, "Patient reports headache.");
  assert.equal(reply.complete, false);
  assert.equal(requestBody.response_format.type, "json_schema");
});

test("maps mocked provider rate limits to a safe error", async () => {
  process.env.OPENAI_API_KEY = "synthetic-test-key";
  global.fetch = async () => new Response("secret provider body", { status: 429 });
  await assert.rejects(
    generateIntakeReply("english", []),
    /rate-limited or out of quota/i,
  );
});

test("maps provider configuration errors without exposing provider bodies", async () => {
  process.env.OPENAI_API_KEY = "synthetic-test-key";
  const cases = [
    [400, /rejected the request/i],
    [401, /rejected the server API key/i],
    [403, /does not have access/i],
    [404, /could not find the configured model/i],
  ];

  for (const [status, expectedMessage] of cases) {
    global.fetch = async () =>
      new Response("provider-secret diagnostic", { status });
    await assert.rejects(
      generateIntakeReply("english", []),
      (error) => {
        assert.match(error.message, expectedMessage);
        assert.match(error.message, /^The AI assistant/i);
        assert.doesNotMatch(error.message, /provider-secret/);
        return true;
      },
    );
  }
});

test("distinguishes missing AI configuration from a rejected API key", () => {
  assert.equal(
    isAIIntakeConfigurationError(
      "AI intake is not configured. Set OPENAI_API_KEY on the server.",
    ),
    true,
  );
  assert.equal(
    isAIIntakeConfigurationError(
      "The AI assistant rejected the server API key. Check OPENAI_API_KEY.",
    ),
    false,
  );
});

test("appends transcript turns without mixing two case histories", () => {
  const caseOne = appendIntakeTurn([], "synthetic case one symptom", "follow-up one");
  const caseTwo = appendIntakeTurn([], "synthetic case two symptom", "follow-up two");
  const continuedCaseOne = appendIntakeTurn(caseOne, "case one answer", "case one summary");
  assert.equal(continuedCaseOne.length, 4);
  assert.equal(caseTwo.length, 2);
  assert.equal(continuedCaseOne.some((message) => message.content.includes("case two")), false);
});

test("maps mocked provider failures and timeouts to safe messages", async () => {
  process.env.OPENAI_API_KEY = "synthetic-test-key";
  global.fetch = async () => new Response("provider-secret", { status: 500 });
  await assert.rejects(
    generateIntakeReply("english", []),
    /temporarily unavailable/i,
  );

  global.fetch = async () => {
    const timeout = new Error("internal timeout details");
    timeout.name = "TimeoutError";
    throw timeout;
  };
  await assert.rejects(generateIntakeReply("english", []), /timed out/i);
});