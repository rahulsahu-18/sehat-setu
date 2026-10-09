const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { createFollowUpRoomToken } = require("../dist/utils/livekitToken.js");

const original = {
  LIVEKIT_URL: process.env.LIVEKIT_URL,
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
  LIVEKIT_AGENT_NAME: process.env.LIVEKIT_AGENT_NAME,
  NODE_ENV: process.env.NODE_ENV,
};
afterEach(() => {
  for (const [name, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("creates a short-lived scoped LiveKit token and explicit agent dispatch", () => {
  process.env.LIVEKIT_URL = "wss://voice.example.test";
  process.env.LIVEKIT_API_KEY = "synthetic-key";
  process.env.LIVEKIT_API_SECRET = "synthetic-secret-which-is-only-for-tests";
  process.env.LIVEKIT_AGENT_NAME = "test-followup-agent";
  process.env.NODE_ENV = "test";
  const now = 1_800_000_000_000;
  const result = createFollowUpRoomToken({
    userId: "64b000000000000000000002",
    questionId: "64b000000000000000000001",
    language: "hindi",
    now,
  });
  const claims = jwt.verify(result.token, process.env.LIVEKIT_API_SECRET, { clockTimestamp: Math.floor(now / 1000) });
  assert.equal(result.url, process.env.LIVEKIT_URL);
  assert.equal(claims.iss, "synthetic-key");
  assert.equal(claims.video.roomJoin, true);
  assert.match(claims.video.room, /^ss-followup-64b000000000000000000001-[a-f0-9]{16}$/);
  assert.equal(result.roomName, claims.video.room);
  assert.deepEqual(claims.video.canPublishSources, ["microphone"]);
  assert.equal(claims.video.canPublishData, false);
  assert.ok(claims.exp - claims.nbf <= 305);
  assert.equal(claims.roomConfig.agents[0].agentName, "test-followup-agent");
  assert.deepEqual(JSON.parse(claims.roomConfig.agents[0].metadata), {
    workflow: "doctor-follow-up",
    questionId: "64b000000000000000000001",
    language: "hindi",
  });
  assert.equal(JSON.stringify(claims).includes("patient name"), false);
});

test("fails closed if LiveKit is not configured", () => {
  delete process.env.LIVEKIT_URL;
  delete process.env.LIVEKIT_API_KEY;
  delete process.env.LIVEKIT_API_SECRET;
  assert.throws(() => createFollowUpRoomToken({
    userId: "user",
    questionId: "question",
    language: "english",
  }), /LiveKit is not configured/);
});

test("requires secure WebSocket transport in production", () => {
  process.env.LIVEKIT_URL = "ws://voice.example.test";
  process.env.LIVEKIT_API_KEY = "synthetic-key";
  process.env.LIVEKIT_API_SECRET = "synthetic-secret";
  process.env.NODE_ENV = "production";
  assert.throws(() => createFollowUpRoomToken({
    userId: "user",
    questionId: "question",
    language: "english",
  }), /wss:\/\//);
});

test("dispatches each voice retry to a fresh room while preserving question metadata", () => {
  process.env.LIVEKIT_URL = "wss://voice.example.test";
  process.env.LIVEKIT_API_KEY = "synthetic-key";
  process.env.LIVEKIT_API_SECRET = "synthetic-secret-which-is-only-for-tests";
  process.env.LIVEKIT_AGENT_NAME = "test-followup-agent";
  process.env.NODE_ENV = "test";

  const input = {
    userId: "64b000000000000000000002",
    questionId: "64b000000000000000000001",
    language: "english",
    now: 1_800_000_000_000,
  };
  const first = createFollowUpRoomToken(input);
  const retry = createFollowUpRoomToken(input);
  const firstClaims = jwt.verify(first.token, process.env.LIVEKIT_API_SECRET, {
    clockTimestamp: Math.floor(input.now / 1000),
  });
  const retryClaims = jwt.verify(retry.token, process.env.LIVEKIT_API_SECRET, {
    clockTimestamp: Math.floor(input.now / 1000),
  });

  assert.notEqual(first.roomName, retry.roomName);
  assert.equal(first.roomName, firstClaims.video.room);
  assert.equal(retry.roomName, retryClaims.video.room);
  assert.equal(JSON.parse(firstClaims.roomConfig.agents[0].metadata).questionId, input.questionId);
  assert.equal(JSON.parse(retryClaims.roomConfig.agents[0].metadata).questionId, input.questionId);
});
