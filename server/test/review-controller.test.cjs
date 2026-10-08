const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { Types } = require("mongoose");
const reviewController = require("../dist/controller/caseReview.controller.js");
const { Case } = require("../dist/models/case.model.js");
const { CaseInput } = require("../dist/models/caseInput.model.js");
const { AISummary } = require("../dist/models/AISummary.model.js");
const { User } = require("../dist/models/user.model.js");
const { Question } = require("../dist/models/question.model.js");
const { Decision } = require("../dist/models/decision.model.js");
const { ReferralNote } = require("../dist/models/referralNote.model.js");

const originals = new Map();
const patched = [];

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
});

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function staff(id, facilityId) {
  return {
    _id: new Types.ObjectId(id),
    role: "DOCTOR",
    facilityId: new Types.ObjectId(facilityId),
  };
}

function queryResult(value) {
  return {
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
}

test("denies staff case details across facilities", async () => {
  const staffId = "64b000000000000000000021";
  const facilityId = "64b000000000000000000022";
  const caseId = "64b000000000000000000023";
  patch(User, "findById", () => ({ select: async () => staff(staffId, facilityId) }));
  patch(Case, "findOne", (filter) => {
    assert.equal(String(filter.facilityId), facilityId);
    assert.equal(String(filter._id), caseId);
    return queryResult(null);
  });

  const res = responseRecorder();
  await reviewController.getStaffCaseDetail(
    { user: { userId: staffId, role: "DOCTOR", facilityId }, params: { caseId } },
    res,
  );
  assert.equal(res.statusCode, 404);
});

test("rejects assignment to staff from another facility", async () => {
  const staffId = "64b000000000000000000031";
  const foreignStaffId = "64b000000000000000000032";
  const facilityId = "64b000000000000000000033";
  const foreignFacilityId = "64b000000000000000000034";
  const caseId = "64b000000000000000000035";
  let userLookups = 0;
  patch(User, "findById", () => ({
    select: async () => userLookups++ === 0
      ? staff(staffId, facilityId)
      : staff(foreignStaffId, foreignFacilityId),
  }));
  patch(Case, "findOne", async (filter) => {
    assert.equal(String(filter.facilityId), facilityId);
    return {
      _id: new Types.ObjectId(caseId),
      facilityId: new Types.ObjectId(facilityId),
      assignedStaffId: undefined,
      async save() {},
    };
  });

  const res = responseRecorder();
  await reviewController.assignStaffCase(
    {
      user: { userId: staffId, role: "DOCTOR", facilityId },
      params: { caseId },
      body: { assignedToId: foreignStaffId },
    },
    res,
  );
  assert.equal(res.statusCode, 403);
});

test("facility admins assign cases to eligible staff in their facility", async () => {
  const adminId = "64b000000000000000000081";
  const staffId = "64b000000000000000000082";
  const facilityId = "64b000000000000000000083";
  const caseId = "64b000000000000000000084";
  const caseRecord = {
    _id: new Types.ObjectId(caseId),
    facilityId: new Types.ObjectId(facilityId),
    assignedStaffId: undefined,
    async save() {},
  };
  patch(User, "findById", () => ({
    select: async () => staff(staffId, facilityId),
  }));
  patch(Case, "findOne", async () => caseRecord);
  patch(Case, "updateOne", async () => ({ modifiedCount: 1 }));

  const res = responseRecorder();
  await reviewController.assignFacilityCase(
    {
      user: { userId: adminId, role: "FACILITY_ADMIN", facilityId },
      params: { caseId },
      body: { assignedToId: staffId },
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(String(caseRecord.assignedStaffId), staffId);
});

test("rejects review transitions from completed cases", async () => {
  const staffId = "64b000000000000000000041";
  const facilityId = "64b000000000000000000042";
  const caseId = "64b000000000000000000043";
  patch(User, "findById", () => ({ select: async () => staff(staffId, facilityId) }));
  patch(Case, "findOne", async () => ({
    _id: new Types.ObjectId(caseId),
    facilityId: new Types.ObjectId(facilityId),
    status: "COMPLETED",
    priority: "ROUTINE",
    assignedStaffId: new Types.ObjectId(staffId),
  }));

  const res = responseRecorder();
  await reviewController.reviewStaffCase(
    {
      user: { userId: staffId, role: "DOCTOR", facilityId },
      params: { caseId },
      body: {
        action: "CONTINUE_EVALUATION",
        priority: "ROUTINE",
        reason: "Synthetic review assessment",
        status: "ACTIVE",
      },
    },
    res,
  );
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /not allowed/i);
});

test("requires patient guidance before completing a case", async () => {
  const staffId = "64b000000000000000000051";
  const facilityId = "64b000000000000000000052";
  const caseId = "64b000000000000000000053";
  const caseRecord = {
    _id: new Types.ObjectId(caseId),
    facilityId: new Types.ObjectId(facilityId),
    status: "WAITING_FOR_REVIEW",
    priority: "ROUTINE",
    assignedStaffId: new Types.ObjectId(staffId),
  };
  let decisionSaved = false;
  patch(User, "findById", () => ({ select: async () => staff(staffId, facilityId) }));
  patch(Case, "findOne", async () => caseRecord);
  patch(Decision.prototype, "save", async function save() {
    decisionSaved = true;
    return this;
  });

  const res = responseRecorder();
  await reviewController.reviewStaffCase(
    {
      user: { userId: staffId, role: "DOCTOR", facilityId },
      params: { caseId },
      body: {
        action: "COMPLETE_CASE",
        priority: "ROUTINE",
        reason: "Synthetic clinician review complete",
        status: "COMPLETED",
      },
    },
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /patient-visible guidance is required/i);
  assert.equal(decisionSaved, false);
  assert.equal(caseRecord.status, "WAITING_FOR_REVIEW");
});

test("records a review without requiring internal assessment notes", async () => {
  const staffId = "64b000000000000000000061";
  const facilityId = "64b000000000000000000062";
  const caseId = "64b000000000000000000063";
  const caseRecord = {
    _id: new Types.ObjectId(caseId),
    facilityId: new Types.ObjectId(facilityId),
    status: "WAITING_FOR_REVIEW",
    priority: "ROUTINE",
    assignedStaffId: new Types.ObjectId(staffId),
    async save() {},
  };
  let savedDecision;
  patch(User, "findById", () => ({ select: async () => staff(staffId, facilityId) }));
  patch(Case, "findOne", async () => caseRecord);
  patch(Case, "updateOne", async () => ({ modifiedCount: 1 }));
  patch(Question, "updateMany", async () => ({ modifiedCount: 0 }));
  patch(Decision.prototype, "save", async function save() {
    savedDecision = this;
    return this;
  });

  const res = responseRecorder();
  await reviewController.reviewStaffCase(
    {
      user: { userId: staffId, role: "DOCTOR", facilityId },
      params: { caseId },
      body: {
        action: "CONTINUE_EVALUATION",
        priority: "ROUTINE",
        status: "ACTIVE",
      },
    },
    res,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(caseRecord.status, "ACTIVE");
  assert.equal(savedDecision.reason, undefined);
});

test("queues clinician-authored questions and sends the approved bundle", async () => {
  const staffId = "64b000000000000000000061";
  const facilityId = "64b000000000000000000062";
  const caseId = "64b000000000000000000063";
  const staffRecord = staff(staffId, facilityId);
  const caseRecord = {
    _id: new Types.ObjectId(caseId),
    facilityId: new Types.ObjectId(facilityId),
    assignedStaffId: new Types.ObjectId(staffId),
    status: "WAITING_FOR_REVIEW",
    async save() {},
  };
  const queuedQuestions = [];
  patch(User, "findById", () => ({ select: async () => staffRecord }));
  patch(Case, "findOne", async () => caseRecord);
  patch(Case, "updateOne", async () => ({ modifiedCount: 1 }));
  patch(Question, "findOne", async () => null);
  patch(Question, "insertMany", async (records) => {
    const created = records.map((record) => ({ ...record, async save() {} }));
    queuedQuestions.push(...created);
    return created;
  });

  const createResponse = responseRecorder();
  await reviewController.createStaffQuestions(
    {
      user: { userId: staffId, role: "DOCTOR", facilityId },
      params: { caseId },
      body: { questions: ["When did this symptom start?", "Has it changed since then?"] },
    },
    createResponse,
  );
  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.data.createdCount, 2);
  assert.ok(queuedQuestions.every((question) => question.status === "APPROVED"));
  queuedQuestions.push({
    caseId: new Types.ObjectId(caseId),
    question: "Do you have any other symptoms?",
    source: "AI",
    status: "APPROVED",
    async save() {},
  });

  patch(Question, "find", async (filter) => {
    assert.equal(filter.status, "APPROVED");
    assert.deepEqual(filter.source.$in, ["AI", "STAFF"]);
    return queuedQuestions;
  });
  const sendResponse = responseRecorder();
  await reviewController.sendStaffQuestionBundle(
    {
      user: { userId: staffId, role: "DOCTOR", facilityId },
      params: { caseId },
    },
    sendResponse,
  );
  assert.equal(sendResponse.statusCode, 200);
  assert.equal(sendResponse.body.data.sentCount, 3);
  assert.ok(queuedQuestions.every((question) => question.status === "SENT"));
  assert.equal(caseRecord.status, "WAITING_FOR_PATIENT");
});

test("moving a waiting case to final review cancels outstanding questions", async () => {
  const staffId = "64b000000000000000000071";
  const facilityId = "64b000000000000000000072";
  const caseId = "64b000000000000000000073";
  const caseRecord = {
    _id: new Types.ObjectId(caseId),
    facilityId: new Types.ObjectId(facilityId),
    assignedStaffId: new Types.ObjectId(staffId),
    status: "WAITING_FOR_PATIENT",
    priority: "ROUTINE",
    async save() {},
  };
  let questionUpdate;
  patch(User, "findById", () => ({ select: async () => staff(staffId, facilityId) }));
  patch(Case, "findOne", async () => caseRecord);
  patch(Case, "updateOne", async () => ({ modifiedCount: 1 }));
  patch(Question, "updateMany", async (filter, update) => {
    questionUpdate = { filter, update };
    return { modifiedCount: 2 };
  });
  patch(Decision.prototype, "save", async function save() { return this; });

  const res = responseRecorder();
  await reviewController.reviewStaffCase(
    {
      user: { userId: staffId, role: "DOCTOR", facilityId },
      params: { caseId },
      body: {
        action: "CONTINUE_EVALUATION",
        status: "FINAL_REVIEW",
        priority: "ROUTINE",
        reason: "Synthetic clinician review complete",
      },
    },
    res,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(caseRecord.status, "FINAL_REVIEW");
  assert.deepEqual(questionUpdate.update, {
    $set: { status: "CANCELLED" },
  });
});

test("prepares and persists a structured referral handoff snapshot", async () => {
  const staffId = "64b000000000000000000091";
  const facilityId = "64b000000000000000000092";
  const caseId = "64b000000000000000000093";
  const caseRecord = {
    _id: new Types.ObjectId(caseId),
    caseNo: "SS-REF-001",
    facilityId: { _id: new Types.ObjectId(facilityId), name: "Demo PHC", location: "District" },
    patientId: {
      _id: new Types.ObjectId("64b000000000000000000094"),
      name: "Synthetic Patient",
      patientId: "PT-001",
    },
    assignedStaffId: new Types.ObjectId(staffId),
    status: "REFERRED",
    priority: "URGENT",
  };
  let persistedNote;
  patch(User, "findById", () => ({ select: async () => staff(staffId, facilityId) }));
  patch(Case, "findOne", () => ({
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve(caseRecord).then(resolve, reject); },
  }));
  patch(Case, "updateOne", async () => ({ modifiedCount: 1 }));
  patch(Decision, "findOne", async () => ({ action: "REFER_TO_SPECIALIST" }));
  patch(AISummary, "findOne", () => ({
    sort: async () => ({
      data: {
        summary: "Synthetic patient-reported summary",
        timeline: [{ when: "Yesterday", event: "Symptom began", source: "Patient intake" }],
        deterministicSafetyFlags: [{ reason: "Synthetic warning flag" }],
        missingInformation: ["Duration to confirm"],
        contradictions: ["Conflicting onset times"],
      },
    }),
  }));
  patch(CaseInput, "find", () => ({
    select() { return this; },
    sort: async () => [{ sourceName: "sample-report.pdf" }],
  }));
  patch(ReferralNote, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(String(filter.caseId), caseId);
    assert.equal(options.upsert, true);
    persistedNote = update.$set;
    return persistedNote;
  });

  const res = responseRecorder();
  await reviewController.saveStaffReferralNote(
    {
      user: { userId: staffId, role: "DOCTOR", facilityId },
      params: { caseId },
      body: {
        receivingFacility: "District Hospital",
        clinicalQuestion: "Please assess the reported symptoms and advise next steps.",
      },
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(persistedNote.receivingFacility, "District Hospital");
  assert.equal(persistedNote.clinicalQuestion, "Please assess the reported symptoms and advise next steps.");
  assert.equal(persistedNote.referringFacility, "Demo PHC");
  assert.equal(persistedNote.patientSummary, "Synthetic patient-reported summary");
  assert.equal(persistedNote.timeline[0].source, "Patient intake");
  assert.deepEqual(persistedNote.reportSources, ["sample-report.pdf"]);
  assert.deepEqual(persistedNote.warningFlags, ["Synthetic warning flag"]);
  assert.deepEqual(persistedNote.missingInformation, ["Duration to confirm"]);
  assert.deepEqual(persistedNote.contradictions, ["Conflicting onset times"]);
});

test("requires referral action and complete destination details before saving a referral note", async () => {
  const staffId = "64b000000000000000000101";
  const facilityId = "64b000000000000000000102";
  const caseId = "64b000000000000000000103";
  patch(User, "findById", () => ({ select: async () => staff(staffId, facilityId) }));
  patch(Case, "findOne", () => ({
    populate() { return this; },
    then(resolve, reject) {
      return Promise.resolve({
        _id: new Types.ObjectId(caseId),
        facilityId: new Types.ObjectId(facilityId),
        assignedStaffId: new Types.ObjectId(staffId),
        status: "REFERRED",
      }).then(resolve, reject);
    },
  }));
  let referralLookup = false;
  patch(Decision, "findOne", async () => {
    referralLookup = true;
    return null;
  });

  const incompleteResponse = responseRecorder();
  await reviewController.saveStaffReferralNote(
    {
      user: { userId: staffId, role: "DOCTOR", facilityId },
      params: { caseId },
      body: { receivingFacility: "", clinicalQuestion: "No" },
    },
    incompleteResponse,
  );
  assert.equal(incompleteResponse.statusCode, 400);
  assert.equal(referralLookup, false);

  const missingReferralResponse = responseRecorder();
  await reviewController.saveStaffReferralNote(
    {
      user: { userId: staffId, role: "DOCTOR", facilityId },
      params: { caseId },
      body: {
        receivingFacility: "District Hospital",
        clinicalQuestion: "Please review and advise next steps.",
      },
    },
    missingReferralResponse,
  );
  assert.equal(missingReferralResponse.statusCode, 409);
  assert.match(missingReferralResponse.body.message, /referral decision/i);
});

test("shares only clinician-approved patient instructions after saving a referral handoff", async () => {
  const staffId = "64b000000000000000000111";
  const facilityId = "64b000000000000000000112";
  const caseId = "64b000000000000000000113";
  patch(User, "findById", () => ({ select: async () => staff(staffId, facilityId) }));
  patch(Case, "findOne", async () => ({
    _id: new Types.ObjectId(caseId),
    facilityId: new Types.ObjectId(facilityId),
    assignedStaffId: new Types.ObjectId(staffId),
    status: "REFERRED",
  }));
  patch(Case, "updateOne", async () => ({ modifiedCount: 1 }));
  patch(Decision, "findOne", async () => ({ action: "REFER_TO_DOCTOR" }));
  let savedSlip;
  patch(ReferralNote, "findOneAndUpdate", async (filter, update) => {
    assert.equal(String(filter.caseId), caseId);
    savedSlip = update.$set;
    return { ...savedSlip, patientSharedAt: new Date("2026-10-07T12:00:00Z") };
  });

  const res = responseRecorder();
  await reviewController.shareStaffReferralSlip(
    {
      user: { userId: staffId, role: "DOCTOR", facilityId },
      params: { caseId },
      body: {
        patientInstructions: "Please contact the receiving facility to confirm availability.",
        patientSummary: "This must not be accepted from patient input.",
      },
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(
    savedSlip.patientInstructions,
    "Please contact the receiving facility to confirm availability.",
  );
  assert.equal(savedSlip.patientSharedById.toString(), staffId);
  assert.ok(savedSlip.patientSharedAt instanceof Date);
  assert.deepEqual(Object.keys(res.body.data).sort(), [
    "patientInstructions",
    "patientSharedAt",
  ]);
  assert.equal(
    "patientSummary" in res.body.data,
    false,
  );
});

test("does not share a patient referral slip without a saved handoff or clinician instructions", async () => {
  const staffId = "64b000000000000000000121";
  const facilityId = "64b000000000000000000122";
  const caseId = "64b000000000000000000123";
  patch(User, "findById", () => ({ select: async () => staff(staffId, facilityId) }));
  patch(Case, "findOne", async () => ({
    _id: new Types.ObjectId(caseId),
    facilityId: new Types.ObjectId(facilityId),
    assignedStaffId: new Types.ObjectId(staffId),
    status: "REFERRED",
  }));
  patch(Decision, "findOne", async () => ({ action: "REFER_TO_SPECIALIST" }));
  patch(ReferralNote, "findOneAndUpdate", async () => null);

  const res = responseRecorder();
  await reviewController.shareStaffReferralSlip(
    {
      user: { userId: staffId, role: "DOCTOR", facilityId },
      params: { caseId },
      body: { patientInstructions: "Next step." },
    },
    res,
  );
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /save the staff referral handoff/i);
});