const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { Types } = require("mongoose");
const { getVoiceAgentFollowUp } = require("../dist/controller/voiceAgent.controller.js");
const { Question, QuestionStatus } = require("../dist/models/question.model.js");
const { Case } = require("../dist/models/case.model.js");

const originals = new Map();
const patched = [];
const originalSecret = process.env.VOICE_AGENT_SECRET;

function patch(target, name, implementation) {
  if (!originals.has(target)) originals.set(target, new Map());
  const methods = originals.get(target);
  if (!methods.has(name)) methods.set(name, target[name]);
  target[name] = implementation;
  patched.push([target, name]);
}

function query(value) {
  return {
    select() { return this; },
    lean() { return Promise.resolve(value); },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function request(questionId, secret = "test-shared-secret") {
  return {
    params: { questionId },
    header: (name) => name.toLowerCase() === "x-voice-agent-secret" ? secret : undefined,
  };
}

afterEach(() => {
  for (const [target, name] of patched.splice(0)) {
    target[name] = originals.get(target).get(name);
  }
  originals.clear();
  if (originalSecret === undefined) delete process.env.VOICE_AGENT_SECRET;
  else process.env.VOICE_AGENT_SECRET = originalSecret;
});

test("rejects the wrong voice-agent secret without querying MongoDB", async () => {
  process.env.VOICE_AGENT_SECRET = "test-shared-secret";
  let queried = false;
  patch(Question, "findById", () => { queried = true; return query(null); });
  const res = responseRecorder();

  await getVoiceAgentFollowUp(request("64b000000000000000000001", "wrong-secret"), res);

  assert.equal(res.statusCode, 401);
  assert.equal(queried, false);
});

test("identifies a question ID absent from the API's MongoDB database", async () => {
  process.env.VOICE_AGENT_SECRET = "test-shared-secret";
  patch(Question, "findById", () => query(null));
  const res = responseRecorder();

  await getVoiceAgentFollowUp(request("64b000000000000000000001"), res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, "VOICE_QUESTION_NOT_FOUND");
});

test("reports an inactive question status instead of returning a generic 404", async () => {
  process.env.VOICE_AGENT_SECRET = "test-shared-secret";
  patch(Question, "findById", () => query({
    _id: new Types.ObjectId("64b000000000000000000001"),
    caseId: new Types.ObjectId("64b000000000000000000002"),
    question: "When did it start?",
    status: QuestionStatus.APPROVED,
  }));
  const res = responseRecorder();

  await getVoiceAgentFollowUp(request("64b000000000000000000001"), res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, "VOICE_QUESTION_STATUS_UNAVAILABLE");
  assert.match(res.body.message, /APPROVED/);
});

test("identifies a missing case record separately", async () => {
  process.env.VOICE_AGENT_SECRET = "test-shared-secret";
  patch(Question, "findById", () => query({
    _id: new Types.ObjectId("64b000000000000000000001"),
    caseId: new Types.ObjectId("64b000000000000000000002"),
    question: "ଆପଣଙ୍କୁ କେବେ ଆରମ୍ଭ ହେଲା?",
    status: QuestionStatus.IN_PROGRESS,
  }));
  patch(Case, "findById", () => query(null));
  const res = responseRecorder();

  await getVoiceAgentFollowUp(request("64b000000000000000000001"), res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, "VOICE_CASE_NOT_FOUND");
});

test("returns the exact question and detects its language while in progress", async () => {
  process.env.VOICE_AGENT_SECRET = "test-shared-secret";
  const questionId = new Types.ObjectId("64b000000000000000000001");
  const question = {
    _id: questionId,
    caseId: new Types.ObjectId("64b000000000000000000002"),
    question: "ଆପଣଙ୍କୁ କାଶ କେବେ ଆରମ୍ଭ ହେଲା?",
    status: QuestionStatus.IN_PROGRESS,
  };
  patch(Question, "findById", () => query(question));
  patch(Case, "findById", () => query({ intakeLanguage: "english" }));
  const res = responseRecorder();

  await getVoiceAgentFollowUp(request(String(questionId)), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.question, question.question);
  assert.equal(res.body.data.language, "odia");
  assert.equal(res.body.data.status, "IN_PROGRESS");
});
