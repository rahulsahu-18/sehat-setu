const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { Types } = require("mongoose");
const reportController = require("../dist/controller/report.controller.js");
const { AISummary } = require("../dist/models/AISummary.model.js");
const { Case } = require("../dist/models/case.model.js");
const { CaseInput } = require("../dist/models/caseInput.model.js");
const { Question } = require("../dist/models/question.model.js");

const originals = new Map();
const patched = [];
const originalFetch = global.fetch;
const originalApiKey = process.env.OPENAI_API_KEY;

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
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
});

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("extracts a consented patient report into a sourced human-review brief", async () => {
  process.env.OPENAI_API_KEY = "synthetic-test-key";
  const patientId = "64b000000000000000000091";
  const caseId = "64b000000000000000000092";
  const caseRecord = {
    _id: new Types.ObjectId(caseId),
    status: "NEW",
    priority: "ROUTINE",
    intakeLanguage: "english",
    consent: { version: "intake-ai-v1", acceptedAt: new Date() },
    async save() {},
  };
  let savedInput;
  let savedSummary;
  let requestBody;

  patch(Case, "findOne", async (filter) => {
    assert.equal(String(filter._id), caseId);
    assert.equal(String(filter.patientId), patientId);
    return caseRecord;
  });
  patch(Case, "updateOne", async () => ({ modifiedCount: 1 }));
  patch(AISummary, "findOne", () => ({
    sort() { return Promise.resolve(null); },
  }));
  patch(AISummary, "create", async (record) => {
    savedSummary = record;
    return record;
  });
  patch(CaseInput, "find", () => ({
    sort() { return this; },
    select() { return this; },
    then(resolve, reject) { return Promise.resolve([]).then(resolve, reject); },
  }));
  patch(CaseInput, "create", async (record) => {
    savedInput = record;
    return record;
  });
  patch(Question, "find", () => ({
    select() { return Promise.resolve([]); },
  }));
  patch(Question, "updateMany", async () => ({ modifiedCount: 0 }));

  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            message: "The report was added for care-team review.",
            summary: "Report lists hemoglobin 12.4 g/dL; no interpretation made.",
            missingInformation: [],
            contradictions: [],
            timeline: [{
              when: "2026-10-07",
              event: "Report date stated on the document",
              source: "sample.txt",
            }],
            urgencySignals: [],
            followUpQuestions: [],
            complete: true,
          }),
        },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const res = responseRecorder();
  await reportController.processPatientReport(
    {
      user: { userId: patientId, role: "PATIENT" },
      params: { caseId },
      file: {
        buffer: Buffer.from("Report date: 2026-10-07\nHemoglobin: 12.4 g/dL"),
        mimetype: "text/plain",
        originalname: "sample.txt",
      },
    },
    res,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(caseRecord.status, "WAITING_FOR_REVIEW");
  assert.equal(savedInput.mode, "DOCUMENT");
  assert.match(savedInput.content, /Hemoglobin: 12\.4 g\/dL/);
  assert.equal(savedSummary.data.timeline[0].source, "sample.txt");
  assert.match(requestBody.messages.at(-1).content, /unverified source material/);
  assert.equal(res.body.data.summary.timeline[0].event, "Report date stated on the document");
});
