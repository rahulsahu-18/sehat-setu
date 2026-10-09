const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { Types } = require("mongoose");
const controller = require("../dist/controller/notification.controller.js");
const { Notification } = require("../dist/models/notification.model.js");

const originals = new Map();
const patched = [];

function patch(target, name, implementation) {
  if (!originals.has(target)) originals.set(target, new Map());
  const methods = originals.get(target);
  if (!methods.has(name)) methods.set(name, target[name]);
  target[name] = implementation;
  patched.push([target, name]);
}

function queryResult(value) {
  return {
    sort() { return this; },
    limit(value) { this.limitValue = value; return this; },
    select() { return this; },
    lean() { return this; },
    exec() { return Promise.resolve(value); },
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
});

test("rejects unauthenticated notification reads before database access", async () => {
  let queried = false;
  patch(Notification, "find", () => { queried = true; return queryResult([]); });
  const res = responseRecorder();
  await controller.listNotifications({ user: undefined, query: {} }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(queried, false);
});

test("lists only the authenticated recipient's notifications and caps pagination", async () => {
  const userId = "64b000000000000000000011";
  let capturedFilter;
  let capturedLimit;
  const items = [
    { _id: new Types.ObjectId(), recipientId: new Types.ObjectId(userId), readAt: null },
    { _id: new Types.ObjectId(), recipientId: new Types.ObjectId(userId), readAt: new Date() },
  ];
  patch(Notification, "find", (filter) => {
    capturedFilter = filter;
    const result = queryResult(items);
    const originalLimit = result.limit.bind(result);
    result.limit = (limit) => { capturedLimit = limit; return originalLimit(limit); };
    return result;
  });

  const res = responseRecorder();
  await controller.listNotifications(
    { user: { userId, role: "PATIENT" }, query: { limit: "999" } },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(String(capturedFilter.recipientId), userId);
  assert.equal(capturedLimit, 100);
  assert.equal(res.body.data.items.length, 2);
  assert.equal(res.body.data.unreadCount, 1);
});

test("cannot mark another user's notification as read", async () => {
  const userId = "64b000000000000000000011";
  const notificationId = "64b000000000000000000012";
  let capturedFilter;
  patch(Notification, "findOneAndUpdate", (filter) => {
    capturedFilter = filter;
    return queryResult(null);
  });

  const res = responseRecorder();
  await controller.markNotificationRead(
    { user: { userId, role: "PATIENT" }, params: { notificationId } },
    res,
  );

  assert.equal(res.statusCode, 404);
  assert.equal(String(capturedFilter._id), notificationId);
  assert.equal(String(capturedFilter.recipientId), userId);
});

test("marks only the authenticated user's notification as read", async () => {
  const userId = "64b000000000000000000021";
  const notificationId = "64b000000000000000000022";
  const readAt = new Date("2026-10-09T04:00:00.000Z");
  let capturedUpdate;
  patch(Notification, "findOneAndUpdate", (filter, update) => {
    assert.equal(String(filter.recipientId), userId);
    capturedUpdate = update;
    return queryResult({ readAt });
  });

  const res = responseRecorder();
  await controller.markNotificationRead(
    { user: { userId, role: "DOCTOR" }, params: { notificationId } },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(capturedUpdate.$set.readAt instanceof Date, true);
  assert.equal(res.body.data.readAt, readAt);
});
