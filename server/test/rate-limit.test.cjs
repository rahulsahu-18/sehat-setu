const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRateLimiter } = require("../dist/middleware/rateLimit.middleware.js");

function runRequest(limiter, ip = "203.0.113.10") {
  const headers = {};
  const response = {
    statusCode: 200,
    body: null,
    setHeader(name, value) { headers[name] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
  let nextCalled = false;
  limiter({ ip, socket: {} }, response, () => { nextCalled = true; });
  return { response, headers, nextCalled };
}

test("rate limits after the configured request count and provides retry metadata", () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
  assert.equal(runRequest(limiter).nextCalled, true);
  assert.equal(runRequest(limiter).nextCalled, true);
  const limited = runRequest(limiter);
  assert.equal(limited.nextCalled, false);
  assert.equal(limited.response.statusCode, 429);
  assert.equal(limited.headers["Retry-After"] > 0, true);
});
