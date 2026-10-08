const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { Case } = require("../dist/models/case.model.js");
const {
  transcribePatientIntakeVoice,
} = require("../dist/controller/voice.controller.js");

const originalFindOne = Case.findOne;
const originalFetch = global.fetch;
const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  Case.findOne = originalFindOne;
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
});

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function voiceRequest() {
  return {
    user: { userId: "64b000000000000000000011", role: "PATIENT" },
    params: { caseId: "64b000000000000000000013" },
    file: {
      buffer: Buffer.from("synthetic audio"),
      mimetype: "audio/webm;codecs=opus",
    },
  };
}

test("requires case consent before sending a voice recording for transcription", async () => {
  process.env.OPENAI_API_KEY = "synthetic-test-key";
  let providerCalled = false;
  global.fetch = async () => {
    providerCalled = true;
    return new Response(JSON.stringify({ text: "should not be reached" }));
  };
  Case.findOne = async () => ({
    consent: { version: "intake-ai-v1", acceptedAt: null },
    intakeLanguage: "english",
    status: "NEW",
  });

  const res = responseRecorder();
  await transcribePatientIntakeVoice(voiceRequest(), res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /consent is required/i);
  assert.equal(providerCalled, false);
});

test("transcribes an owned consented case in its selected language", async () => {
  process.env.OPENAI_API_KEY = "synthetic-test-key";
  Case.findOne = async () => ({
    consent: { version: "intake-ai-v1", acceptedAt: new Date() },
    intakeLanguage: "odia",
    status: "NEW",
  });
  global.fetch = async (_url, options) => {
    assert.equal(options.body.get("language"), "or");
    return new Response(JSON.stringify({ text: "Synthetic Odia transcript" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const res = responseRecorder();
  await transcribePatientIntakeVoice(voiceRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    data: { transcript: "Synthetic Odia transcript" },
  });
});
