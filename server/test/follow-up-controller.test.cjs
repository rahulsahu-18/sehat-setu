const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { Types } = require("mongoose");
const followUps = require("../dist/controller/followUp.controller.js");
const { Case, CaseStatus } = require("../dist/models/case.model.js");
const { Question, QuestionStatus } = require("../dist/models/question.model.js");
const { Answer } = require("../dist/models/answer.model.js");
const { Notification } = require("../dist/models/notification.model.js");

const originals = new Map();
const patched = [];
const originalFetch = global.fetch;
const originalOpenAIKey = process.env.OPENAI_API_KEY;

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
    exec() { return Promise.resolve(value); },
    sort() { return this; },
    limit() { return this; },
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

afterEach(() => {
  for (const [target, name] of patched.splice(0)) {
    target[name] = originals.get(target).get(name);
  }
  originals.clear();
  global.fetch = originalFetch;
  if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAIKey;
});

test("stores and replays each doctor follow-up answer independently", async () => {
  const patientId = "64b000000000000000000011";
  const caseId = new Types.ObjectId("64b000000000000000000051");
  const questionA = {
    _id: new Types.ObjectId("64b000000000000000000052"),
    caseId,
    question: "When did the symptom begin?",
    source: "STAFF",
    status: QuestionStatus.SENT,
    submissionKey: undefined,
    submissionStartedAt: undefined,
  };
  const questionB = {
    _id: new Types.ObjectId("64b000000000000000000053"),
    caseId,
    question: "Has it changed since it began?",
    source: "STAFF",
    status: QuestionStatus.SENT,
    submissionKey: undefined,
    submissionStartedAt: undefined,
  };
  const questions = [questionA, questionB];
  const caseRecord = {
    _id: caseId,
    patientId: new Types.ObjectId(patientId),
    facilityId: new Types.ObjectId("64b000000000000000000012"),
    assignedStaffId: new Types.ObjectId("64b000000000000000000014"),
    status: CaseStatus.WAITING_FOR_PATIENT,
    async save() {},
  };
  const answers = new Map();
  const notifications = new Map();

  patch(Question, "findById", (id) => query(questions.find((item) => String(item._id) === String(id)) || null));
  patch(Question, "findOneAndUpdate", async (filter, update) => {
    const item = questions.find((candidate) =>
      String(candidate._id) === String(filter._id) &&
      String(candidate.caseId) === String(filter.caseId),
    );
    if (!item) return null;
    if (filter.status?.$in) {
      const eligible = filter.status.$in.includes(item.status);
      const hasKey = typeof item.submissionKey === "string";
      const leaseExpired = item.submissionStartedAt instanceof Date &&
        item.submissionStartedAt < (filter.$or?.[1]?.submissionStartedAt?.$lt || new Date(0));
      const leaseAvailable = !hasKey || leaseExpired;
      if (!eligible || !leaseAvailable) return null;
    } else if (filter.status === QuestionStatus.IN_PROGRESS) {
      if (item.status !== QuestionStatus.IN_PROGRESS ||
          item.submissionKey !== filter.submissionKey) return null;
    }
    Object.assign(item, update.$set || {});
    return item;
  });
  patch(Question, "countDocuments", async (filter) =>
    questions.filter((item) =>
      String(item.caseId) === String(filter.caseId) &&
      filter.status.$in.includes(item.status),
    ).length,
  );
  patch(Case, "findOne", async (filter) =>
    String(filter._id) === String(caseId) &&
    String(filter.patientId) === patientId ? caseRecord : null,
  );
  patch(Case, "findOneAndUpdate", async (filter, update) => {
    if (String(filter._id) !== String(caseId) || caseRecord.status !== filter.status) return null;
    Object.assign(caseRecord, update.$set || {});
    return caseRecord;
  });
  patch(Case, "updateOne", async () => ({ modifiedCount: 1 }));
  patch(Case, "findById", (id) => query(String(id) === String(caseId) ? caseRecord : null));
  patch(Answer, "findOne", (filter) => query(answers.get(String(filter.questionId)) || null));
  patch(Answer, "create", async (record) => {
    const key = String(record.questionId);
    if (answers.has(key)) {
      const error = new Error("Duplicate answer");
      error.code = 11000;
      throw error;
    }
    const stored = { ...record, _id: new Types.ObjectId(), createdAt: new Date() };
    answers.set(key, stored);
    return stored;
  });
  patch(Notification, "findOneAndUpdate", (filter, update) => ({
    exec: async () => {
      const key = filter.dedupeKey;
      if (!notifications.has(key)) notifications.set(key, update.$setOnInsert);
      return notifications.get(key);
    },
  }));

  async function submit(questionId, answer, key) {
    const res = responseRecorder();
    await followUps.submitPatientFollowUpAnswer(
      {
        user: { userId: patientId, role: "PATIENT" },
        params: { questionId },
        body: { answer, mode: "TEXT" },
        header: (name) => name.toLowerCase() === "idempotency-key" ? key : undefined,
      },
      res,
    );
    return res;
  }

  const firstKey = "follow-up-answer-key-0001";
  const first = await submit(String(questionA._id), "It began yesterday.", firstKey);
  assert.equal(first.statusCode, 201, first.body?.message);
  assert.equal(first.body.data.status, QuestionStatus.ANSWERED);
  assert.equal(answers.size, 1);
  assert.equal(String([...answers.values()][0].questionId), String(questionA._id));
  assert.equal(questionA.status, QuestionStatus.ANSWERED);
  assert.equal(questionB.status, QuestionStatus.SENT);
  assert.equal(caseRecord.status, CaseStatus.WAITING_FOR_PATIENT);

  const second = await submit(String(questionB._id), "It is less severe today.", "follow-up-answer-key-0002");
  assert.equal(second.statusCode, 201, second.body?.message);
  assert.equal(answers.size, 2);
  assert.equal(String(answers.get(String(questionB._id)).questionId), String(questionB._id));
  assert.equal(answers.get(String(questionA._id)).answer, "It began yesterday.");
  assert.equal(answers.get(String(questionB._id)).answer, "It is less severe today.");
  assert.equal(questionA.status, QuestionStatus.ANSWERED);
  assert.equal(questionB.status, QuestionStatus.ANSWERED);
  assert.equal(caseRecord.status, CaseStatus.WAITING_FOR_REVIEW);

  const replay = await submit(String(questionA._id), "It began yesterday.", firstKey);
  assert.equal(replay.statusCode, 200);
  assert.equal(replay.body.replayed, true);
  assert.equal(answers.size, 2);

  const conflict = await submit(String(questionA._id), "A different answer.", firstKey);
  assert.equal(conflict.statusCode, 409);
  assert.equal(answers.size, 2);
});

test("denies a patient access to another patient's follow-up answer", async () => {
  const patientId = "64b000000000000000000031";
  const otherPatientId = "64b000000000000000000032";
  const caseId = new Types.ObjectId("64b000000000000000000061");
  const questionId = new Types.ObjectId("64b000000000000000000062");
  let answerReads = 0;
  let answerWrites = 0;
  patch(Question, "findById", (id) => query(
    String(id) === String(questionId)
      ? { _id: questionId, caseId, status: QuestionStatus.SENT }
      : null,
  ));
  patch(Case, "findOne", async (filter) => {
    assert.equal(String(filter._id), String(caseId));
    assert.equal(String(filter.patientId), patientId);
    // This case belongs to someone else, so ownership-scoped lookup must fail.
    assert.notEqual(patientId, otherPatientId);
    return null;
  });
  patch(Answer, "findOne", () => {
    answerReads += 1;
    return query(null);
  });
  patch(Answer, "create", async () => {
    answerWrites += 1;
    throw new Error("answer must never be created for a foreign case");
  });

  const res = responseRecorder();
  await followUps.getPatientFollowUp(
    {
      user: { userId: patientId, role: "PATIENT" },
      params: { questionId: String(questionId) },
    },
    res,
  );

  assert.equal(res.statusCode, 404);
  assert.equal(answerReads, 0);
  assert.equal(answerWrites, 0);
});

test("saves the original Odia voice transcript and a separate English doctor summary", async () => {
  process.env.OPENAI_API_KEY = "synthetic-summary-test-key";
  const patientId = "64b000000000000000000041";
  const caseId = new Types.ObjectId("64b000000000000000000071");
  const questionId = new Types.ObjectId("64b000000000000000000072");
  const originalAnswer = "ଗତକାଲିଠାରୁ କାଶ ହେଉଛି।";
  const question = {
    _id: questionId,
    caseId,
    question: "ଆପଣଙ୍କୁ କାଶ କେବେ ଆରମ୍ଭ ହେଲା?",
    source: "STAFF",
    status: QuestionStatus.SENT,
    submissionKey: undefined,
    submissionStartedAt: undefined,
  };
  const caseRecord = {
    _id: caseId,
    patientId: new Types.ObjectId(patientId),
    facilityId: new Types.ObjectId("64b000000000000000000042"),
    assignedStaffId: new Types.ObjectId("64b000000000000000000043"),
    intakeLanguage: "english",
    status: CaseStatus.WAITING_FOR_PATIENT,
    async save() {},
  };
  let savedAnswer;
  let summaryRequest;
  const notifications = new Map();

  global.fetch = async (_url, options) => {
    summaryRequest = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            summary: "The patient reports having a cough since yesterday.",
          }),
        },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  patch(Question, "findById", () => query(question));
  patch(Question, "findOneAndUpdate", async (filter, update) => {
    if (String(filter._id) !== String(questionId) || String(filter.caseId) !== String(caseId)) return null;
    if (filter.status?.$in) {
      if (!filter.status.$in.includes(question.status)) return null;
      const hasKey = typeof question.submissionKey === "string";
      const leaseExpired = question.submissionStartedAt instanceof Date &&
        question.submissionStartedAt < (filter.$or?.[1]?.submissionStartedAt?.$lt || new Date(0));
      if (hasKey && !leaseExpired) return null;
    } else if (filter.status === QuestionStatus.IN_PROGRESS) {
      if (question.status !== QuestionStatus.IN_PROGRESS || question.submissionKey !== filter.submissionKey) return null;
    }
    Object.assign(question, update.$set || {});
    return question;
  });
  patch(Question, "countDocuments", async (filter) =>
    filter.status.$in.includes(question.status) && String(filter.caseId) === String(caseId) ? 1 : 0,
  );
  patch(Case, "findOne", async (filter) =>
    String(filter._id) === String(caseId) && String(filter.patientId) === patientId ? caseRecord : null,
  );
  patch(Case, "findById", () => query(caseRecord));
  patch(Case, "findOneAndUpdate", async (filter, update) => {
    if (String(filter._id) !== String(caseId) || caseRecord.status !== filter.status) return null;
    Object.assign(caseRecord, update.$set || {});
    return caseRecord;
  });
  patch(Case, "updateOne", async () => ({ modifiedCount: 1 }));
  patch(Answer, "findOne", () => query(savedAnswer || null));
  patch(Answer, "create", async (record) => {
    savedAnswer = { ...record, _id: new Types.ObjectId(), createdAt: new Date() };
    return savedAnswer;
  });
  patch(Answer, "updateOne", async (filter, update) => {
    assert.equal(String(filter._id), String(savedAnswer._id));
    Object.assign(savedAnswer, update.$set || {});
    return { modifiedCount: 1 };
  });
  patch(Notification, "findOneAndUpdate", (filter, update) => ({
    exec: async () => {
      const key = filter.dedupeKey;
      if (!notifications.has(key)) notifications.set(key, update.$setOnInsert);
      return notifications.get(key);
    },
  }));

  const res = responseRecorder();
  await followUps.submitPatientFollowUpAnswer(
    {
      user: { userId: patientId, role: "PATIENT" },
      params: { questionId: String(questionId) },
      body: { answer: originalAnswer, mode: "VOICE" },
      header: (name) => name.toLowerCase() === "idempotency-key" ? "odia-follow-up-answer-key-001" : undefined,
    },
    res,
  );

  assert.equal(res.statusCode, 201, res.body?.message);
  assert.equal(savedAnswer.answer, originalAnswer);
  assert.equal(savedAnswer.language, "odia");
  assert.equal(savedAnswer.englishSummary, "The patient reports having a cough since yesterday.");
  assert.equal(savedAnswer.englishSummaryStatus, "READY");
  assert.equal(res.body.data.answer, originalAnswer);
  assert.equal(res.body.data.language, "odia");
  assert.equal(res.body.data.englishSummary, "The patient reports having a cough since yesterday.");
  const prompt = JSON.parse(summaryRequest.messages[1].content);
  assert.equal(prompt.patientAnswerLanguage, "odia");
  assert.equal(prompt.originalPatientAnswer, originalAnswer);
  assert.match(summaryRequest.messages[0].content, /only in clear, concise English/i);
  assert.equal(question.status, QuestionStatus.ANSWERED);
});
