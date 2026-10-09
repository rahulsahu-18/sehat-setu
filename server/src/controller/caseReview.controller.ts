import type { Response } from "express";
import { Types } from "mongoose";
import type { AuthRequest } from "../middleware/auth.middleware";
import { Answer } from "../models/answer.model";
import { AISummary } from "../models/AISummary.model";
import { Case, CasePriority, CaseStatus } from "../models/case.model";
import { CaseInput, InputMode } from "../models/caseInput.model";
import {
  Decision,
  DecisionAction,
  DecisionPriority,
} from "../models/decision.model";
import {
  Question,
  QuestionSource,
  QuestionStatus,
} from "../models/question.model";
import { ReferralNote } from "../models/referralNote.model";
import { User, UserRole } from "../models/user.model";
import { appendCaseAudit } from "../utils/caseAudit";
import {
  isAllowedStatusTransition,
  isAssignableStaffRole,
  staffCanServeCase,
  statusForDecision,
} from "../utils/caseWorkflow";
import { facilityCaseFilter } from "../utils/caseAccess";
import { notifyPatientFollowUp } from "../utils/notifications";

type StaffActor = {
  _id: Types.ObjectId;
  facilityId: Types.ObjectId;
  name: string;
  role: UserRole;
};

async function getCurrentStaff(userId?: string) {
  if (!userId || !Types.ObjectId.isValid(userId)) return null;
  const user = await User.findById(userId).select("role facilityId name");
  if (
    !user ||
    ![UserRole.DOCTOR, UserRole.NURSE].includes(user.role) ||
    !user.facilityId
  ) {
    return null;
  }
  return user as unknown as StaffActor;
}

function validCaseId(caseId: unknown): caseId is string {
  return typeof caseId === "string" && Types.ObjectId.isValid(caseId);
}

function idString(value: unknown) {
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value ?? "");
}

export const getStaffTeam = async (req: AuthRequest, res: Response) => {
  const staff = await getCurrentStaff(req.user?.userId);
  if (!staff) {
    return res
      .status(403)
      .json({ success: false, message: "Staff access required" });
  }
  const team = (await User.find({
    facilityId: staff.facilityId,
    role: { $in: [UserRole.DOCTOR, UserRole.NURSE] },
  })
    .select("name role")
    .sort({ name: 1 })
    .lean()
    .exec()) as unknown as {
    _id: Types.ObjectId;
    name: string;
    role: UserRole;
  }[];
  return res.status(200).json({
    success: true,
    data: team.map((member) => ({
      id: member._id,
      name: member.name,
      role: member.role,
    })),
  });
};

export const getStaffCaseDetail = async (req: AuthRequest, res: Response) => {
  const staff = await getCurrentStaff(req.user?.userId);
  const { caseId } = req.params;
  if (!staff) {
    return res
      .status(403)
      .json({ success: false, message: "Staff access required" });
  }
  if (!validCaseId(caseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }

  const facilityFilter = facilityCaseFilter(caseId, String(staff.facilityId));
  if (!facilityFilter) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }
  const caseRecord = await Case.findOne(facilityFilter)
    .populate("facilityId", "name location type")
    .populate("patientId", "name patientId language")
    .populate("assignedStaffId", "name role")
    .populate("auditTrail.actorId", "name role")
    .populate("auditTrail.assignedToId", "name role");
  if (!caseRecord) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }
  if (
    caseRecord.assignedStaffId &&
    idString(caseRecord.assignedStaffId) !== String(staff._id)
  ) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }

  const [latestSummary, inputs, decisions, questions, referralNote] = await Promise.all([
    AISummary.findOne({ caseId: caseRecord._id }).sort({ version: -1 }),
    CaseInput.find({
      caseId: caseRecord._id,
      mode: { $in: [InputMode.TEXT, InputMode.DOCUMENT] },
    })
      .select("content language createdAt mode sourceName")
      .sort({ createdAt: 1 }),
    Decision.find({ caseId: caseRecord._id })
      .populate("staffId", "name role")
      .populate("assignedToId", "name role")
      .sort({ createdAt: -1 }),
    Question.find({ caseId: caseRecord._id }).sort({ createdAt: -1 }),
    ReferralNote.findOne({ caseId: caseRecord._id }),
  ]);
  const answers = questions.length
    ? await Answer.find({
        questionId: { $in: questions.map((question) => question._id) },
      })
        .select("questionId answer createdAt")
        .sort({ createdAt: 1 })
    : [];
  const detailReadEvent = {
    action: "STAFF_READ_CASE_DETAIL",
    actorId: staff._id,
    timestamp: new Date(),
  };
  await appendCaseAudit(caseRecord._id, detailReadEvent);
  const detailReadDisplayEvent = {
    ...detailReadEvent,
    actorId: { _id: staff._id, name: staff.name, role: staff.role },
  };

  return res.status(200).json({
    success: true,
    data: {
      case: caseRecord,
      summary: latestSummary?.data ?? null,
      inputs,
      decisions,
      questions,
      answers,
      referralNote,
      auditTrail: [...caseRecord.auditTrail, detailReadDisplayEvent].slice(
        -100,
      ),
    },
  });
};

export const saveStaffReferralNote = async (
  req: AuthRequest,
  res: Response,
) => {
  const staff = await getCurrentStaff(req.user?.userId);
  const { caseId } = req.params;
  if (!staff) {
    return res
      .status(403)
      .json({ success: false, message: "Staff access required" });
  }
  if (!validCaseId(caseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }

  const receivingFacility = req.body?.receivingFacility;
  const clinicalQuestion = req.body?.clinicalQuestion;
  if (
    typeof receivingFacility !== "string" ||
    receivingFacility.trim().length < 2 ||
    receivingFacility.length > 200
  ) {
    return res.status(400).json({
      success: false,
      message: "Receiving facility is required and must be under 200 characters",
    });
  }
  if (
    typeof clinicalQuestion !== "string" ||
    clinicalQuestion.trim().length < 5 ||
    clinicalQuestion.length > 1000
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Clinical question / reason is required and must be under 1,000 characters",
    });
  }

  const facilityFilter = facilityCaseFilter(caseId, String(staff.facilityId));
  if (!facilityFilter) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }
  const caseRecord = await Case.findOne(facilityFilter)
    .populate("facilityId", "name location")
    .populate("patientId", "name patientId");
  if (!caseRecord) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }
  if (
    caseRecord.assignedStaffId &&
    idString(caseRecord.assignedStaffId) !== String(staff._id)
  ) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }
  if (caseRecord.status === CaseStatus.COMPLETED) {
    return res.status(409).json({
      success: false,
      message: "A referral note cannot be changed after case completion",
    });
  }

  const referralDecision = await Decision.findOne({
    caseId: caseRecord._id,
    action: {
      $in: [DecisionAction.REFER_TO_DOCTOR, DecisionAction.REFER_TO_SPECIALIST],
    },
  });
  if (!referralDecision) {
    return res.status(409).json({
      success: false,
      message: "Record a referral decision before preparing its handoff note",
    });
  }

  const [latestSummary, reportInputs] = await Promise.all([
    AISummary.findOne({ caseId: caseRecord._id }).sort({ version: -1 }),
    CaseInput.find({
      caseId: caseRecord._id,
      mode: InputMode.DOCUMENT,
    })
      .select("sourceName")
      .sort({ createdAt: 1 }),
  ]);
  const summary = latestSummary?.data;
  const facility = caseRecord.facilityId as unknown as {
    name?: string;
    location?: string;
  };
  const patient = caseRecord.patientId as unknown as {
    name?: string;
    patientId?: string;
  };
  const noteData = {
    caseId: caseRecord._id,
    preparedById: staff._id,
    caseNo: caseRecord.caseNo,
    patientName: patient.name || "Patient",
    patientId: patient.patientId || "Not recorded",
    caseStatus: caseRecord.status,
    priority: caseRecord.priority,
    referringFacility: facility.name || "Facility name unavailable",
    referringFacilityLocation: facility.location || "",
    receivingFacility: receivingFacility.trim(),
    clinicalQuestion: clinicalQuestion.trim(),
    patientInstructions: "",
    patientSharedAt: null,
    patientSharedById: null,
    patientSummary: typeof summary?.summary === "string" ? summary.summary : "",
    timeline: Array.isArray(summary?.timeline)
      ? summary.timeline.filter(
          (item): item is { when: string; event: string; source: string } =>
            Boolean(
              item &&
                typeof item === "object" &&
                "when" in item &&
                typeof item.when === "string" &&
                "event" in item &&
                typeof item.event === "string" &&
                "source" in item &&
                typeof item.source === "string",
            ),
        )
      : [],
    reportSources: reportInputs
      .map((input) => input.sourceName)
      .filter((name): name is string => Boolean(name)),
    warningFlags: Array.isArray(summary?.deterministicSafetyFlags)
      ? summary.deterministicSafetyFlags
          .map((flag) =>
            flag && typeof flag === "object" && "reason" in flag
              ? String(flag.reason)
              : "",
          )
          .filter(Boolean)
      : [],
    missingInformation: Array.isArray(summary?.missingInformation)
      ? summary.missingInformation.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    contradictions: Array.isArray(summary?.contradictions)
      ? summary.contradictions.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  };
  const referralNote = await ReferralNote.findOneAndUpdate(
    { caseId: caseRecord._id },
    { $set: noteData },
    { new: true, upsert: true, runValidators: true },
  );
  await appendCaseAudit(caseRecord._id, {
    action: "REFERRAL_NOTE_PREPARED",
    actorId: staff._id,
    timestamp: new Date(),
  });

  return res.status(200).json({ success: true, data: referralNote });
};

export const shareStaffReferralSlip = async (
  req: AuthRequest,
  res: Response,
) => {
  const staff = await getCurrentStaff(req.user?.userId);
  const { caseId } = req.params;
  if (!staff) {
    return res
      .status(403)
      .json({ success: false, message: "Staff access required" });
  }
  if (!validCaseId(caseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }

  const patientInstructions = req.body?.patientInstructions;
  if (
    typeof patientInstructions !== "string" ||
    patientInstructions.trim().length < 5 ||
    patientInstructions.length > 1000
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Clinician-approved patient next steps are required and must be under 1,000 characters",
    });
  }

  const facilityFilter = facilityCaseFilter(caseId, String(staff.facilityId));
  if (!facilityFilter) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }
  const caseRecord = await Case.findOne(facilityFilter);
  if (!caseRecord) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }
  if (
    caseRecord.assignedStaffId &&
    idString(caseRecord.assignedStaffId) !== String(staff._id)
  ) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }
  if (caseRecord.status === CaseStatus.COMPLETED) {
    return res.status(409).json({
      success: false,
      message: "A referral slip cannot be shared after case completion",
    });
  }

  const referralDecision = await Decision.findOne({
    caseId: caseRecord._id,
    action: {
      $in: [DecisionAction.REFER_TO_DOCTOR, DecisionAction.REFER_TO_SPECIALIST],
    },
  });
  if (!referralDecision) {
    return res.status(409).json({
      success: false,
      message: "Record a referral decision before sharing a patient referral slip",
    });
  }
  const referralNote = await ReferralNote.findOneAndUpdate(
    { caseId: caseRecord._id },
    {
      $set: {
        patientInstructions: patientInstructions.trim(),
        patientSharedAt: new Date(),
        patientSharedById: staff._id,
      },
    },
    { new: true, runValidators: true },
  );
  if (!referralNote) {
    return res.status(409).json({
      success: false,
      message: "Save the staff referral handoff before sharing a patient slip",
    });
  }
  await appendCaseAudit(caseRecord._id, {
    action: "PATIENT_REFERRAL_SLIP_SHARED",
    actorId: staff._id,
    timestamp: referralNote.patientSharedAt || new Date(),
  });
  return res.status(200).json({
    success: true,
    data: {
      patientInstructions: referralNote.patientInstructions,
      patientSharedAt: referralNote.patientSharedAt,
    },
  });
};

export const assignStaffCase = async (req: AuthRequest, res: Response) => {
  const staff = await getCurrentStaff(req.user?.userId);
  const { caseId } = req.params;
  const requestedAssignee = req.body?.assignedToId;
  if (!staff) {
    return res
      .status(403)
      .json({ success: false, message: "Staff access required" });
  }
  if (!validCaseId(caseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }

  const facilityFilter = facilityCaseFilter(caseId, String(staff.facilityId));
  if (!facilityFilter) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }
  const caseRecord = await Case.findOne(facilityFilter);
  if (!caseRecord) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }
  if (requestedAssignee && String(requestedAssignee) !== String(staff._id)) {
    return res.status(403).json({
      success: false,
      message:
        "Clinicians can claim cases for themselves; facility admins assign cases to others",
    });
  }
  if (
    caseRecord.assignedStaffId &&
    idString(caseRecord.assignedStaffId) !== String(staff._id)
  ) {
    return res.status(409).json({
      success: false,
      message: "This case is already assigned to another clinician",
    });
  }

  const previousAssignee = caseRecord.assignedStaffId;
  caseRecord.assignedStaffId = staff._id;
  await caseRecord.save();
  await appendCaseAudit(caseRecord._id, {
    action: previousAssignee ? "CASE_REASSIGNED" : "CASE_CLAIMED",
    actorId: staff._id,
    timestamp: new Date(),
    assignedToId: staff._id,
  });
  return res.status(200).json({
    success: true,
    data: { assignedToId: staff._id },
  });
};

export const getFacilityCaseAssignments = async (
  req: AuthRequest,
  res: Response,
) => {
  const facilityId = req.user?.facilityId;
  if (!facilityId || req.user?.role !== UserRole.FACILITY_ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Facility administrator access required",
    });
  }
  const [cases, team] = await Promise.all([
    Case.find({ facilityId, status: { $ne: CaseStatus.COMPLETED } })
      .populate("patientId", "name patientId")
      .populate("assignedStaffId", "name role")
      .sort({ createdAt: -1 }),
    User.find({
      facilityId,
      role: { $in: [UserRole.DOCTOR, UserRole.NURSE] },
    })
      .select("name role")
      .sort({ name: 1 }),
  ]);
  return res.status(200).json({
    success: true,
    data: {
      cases,
      team: team.map((member) => ({
        id: member._id,
        name: member.name,
        role: member.role,
      })),
    },
  });
};

export const assignFacilityCase = async (req: AuthRequest, res: Response) => {
  const facilityId = req.user?.facilityId;
  const adminId = req.user?.userId;
  const { caseId } = req.params;
  const assignedToId = req.body?.assignedToId;
  if (!facilityId || !adminId || req.user?.role !== UserRole.FACILITY_ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Facility administrator access required",
    });
  }
  if (
    !validCaseId(caseId) ||
    typeof assignedToId !== "string" ||
    !Types.ObjectId.isValid(assignedToId)
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid case and staff member are required",
    });
  }
  const caseFilter = facilityCaseFilter(caseId, facilityId);
  if (!caseFilter) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }
  const caseRecord = await Case.findOne(caseFilter);
  if (!caseRecord) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }
  const eligible = await User.findById(assignedToId).select("role facilityId");
  if (
    !eligible ||
    !isAssignableStaffRole(eligible.role) ||
    !staffCanServeCase(eligible.facilityId, facilityId)
  ) {
    return res.status(403).json({
      success: false,
      message: "Select an active doctor or nurse at this facility",
    });
  }
  const previousAssignee = caseRecord.assignedStaffId;
  caseRecord.assignedStaffId = eligible._id;
  await caseRecord.save();
  await appendCaseAudit(caseRecord._id, {
    action: previousAssignee
      ? "CASE_REASSIGNED_BY_ADMIN"
      : "CASE_ASSIGNED_BY_ADMIN",
    actorId: new Types.ObjectId(adminId),
    timestamp: new Date(),
    assignedToId: eligible._id,
  });
  return res.status(200).json({
    success: true,
    data: { assignedToId: eligible._id },
  });
};

export const reviewStaffQuestion = async (req: AuthRequest, res: Response) => {
  const staff = await getCurrentStaff(req.user?.userId);
  const { caseId, questionId } = req.params;
  const decision = req.body?.decision;
  if (!staff) {
    return res
      .status(403)
      .json({ success: false, message: "Staff access required" });
  }
  if (!validCaseId(caseId) || !validCaseId(questionId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid question reference" });
  }
  if (decision !== "APPROVE" && decision !== "REJECT") {
    return res
      .status(400)
      .json({ success: false, message: "Choose approve or reject" });
  }

  const caseFilter = facilityCaseFilter(caseId, String(staff.facilityId));
  if (!caseFilter) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }
  const caseRecord = await Case.findOne(caseFilter);
  if (!caseRecord) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }
  if (
    caseRecord.assignedStaffId &&
    idString(caseRecord.assignedStaffId) !== String(staff._id)
  ) {
    return res.status(403).json({
      success: false,
      message: "Only the assigned clinician can review this question",
    });
  }

  const question = await Question.findOne({
    _id: questionId,
    caseId: caseRecord._id,
    source: QuestionSource.AI,
    status: QuestionStatus.PENDING,
  });
  if (!question) {
    return res
      .status(404)
      .json({ success: false, message: "Pending AI question not found" });
  }
  question.status =
    decision === "APPROVE" ? QuestionStatus.APPROVED : QuestionStatus.REJECTED;
  question.reviewedBy = staff._id;
  await question.save();
  await appendCaseAudit(caseRecord._id, {
    action:
      decision === "APPROVE"
        ? "AI_FOLLOW_UP_APPROVED"
        : "AI_FOLLOW_UP_REJECTED",
    actorId: staff._id,
    timestamp: new Date(),
  });
  return res
    .status(200)
    .json({ success: true, data: { status: question.status } });
};

export const createStaffQuestions = async (req: AuthRequest, res: Response) => {
  const staff = await getCurrentStaff(req.user?.userId);
  const { caseId } = req.params;
  const questions = req.body?.questions;
  if (!staff) {
    return res
      .status(403)
      .json({ success: false, message: "Staff access required" });
  }
  if (!validCaseId(caseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }
  if (
    !Array.isArray(questions) ||
    questions.length < 1 ||
    questions.length > 10 ||
    questions.some(
      (question) =>
        typeof question !== "string" ||
        question.trim().length < 5 ||
        question.length > 1000,
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide 1 to 10 questions, each between 5 and 1,000 characters",
    });
  }

  const normalizedQuestions = questions.map((question: string) =>
    question.trim(),
  );
  if (
    new Set(normalizedQuestions.map((question) => question.toLowerCase()))
      .size !== normalizedQuestions.length
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Remove duplicate questions" });
  }
  const caseFilter = facilityCaseFilter(caseId, String(staff.facilityId));
  if (!caseFilter) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }
  const caseRecord = await Case.findOne(caseFilter);
  if (!caseRecord) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }
  if (
    caseRecord.assignedStaffId &&
    idString(caseRecord.assignedStaffId) !== String(staff._id)
  ) {
    return res.status(403).json({
      success: false,
      message: "Only the assigned clinician can add questions",
    });
  }
  const outstandingQuestion = await Question.findOne({
    caseId: caseRecord._id,
    status: QuestionStatus.SENT,
  });
  if (outstandingQuestion) {
    return res.status(409).json({
      success: false,
      message: "Wait for the patient to answer the outstanding questions first",
    });
  }

  const createdQuestions = await Question.insertMany(
    normalizedQuestions.map((question: string) => ({
      caseId: caseRecord._id,
      question,
      source: QuestionSource.STAFF,
      status: QuestionStatus.APPROVED,
      language: caseRecord.intakeLanguage,
      createdBy: staff._id,
      reviewedBy: staff._id,
    })),
  );
  await appendCaseAudit(caseRecord._id, {
    action: "STAFF_FOLLOW_UP_QUESTIONS_CREATED",
    actorId: staff._id,
    timestamp: new Date(),
  });
  return res.status(201).json({
    success: true,
    data: { createdCount: createdQuestions.length },
  });
};

export const sendStaffQuestionBundle = async (
  req: AuthRequest,
  res: Response,
) => {
  const staff = await getCurrentStaff(req.user?.userId);
  const { caseId } = req.params;
  if (!staff) {
    return res
      .status(403)
      .json({ success: false, message: "Staff access required" });
  }
  if (!validCaseId(caseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }

  const caseFilter = facilityCaseFilter(caseId, String(staff.facilityId));
  if (!caseFilter) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }
  const caseRecord = await Case.findOne(caseFilter);
  if (!caseRecord) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }
  if (
    caseRecord.assignedStaffId &&
    String(caseRecord.assignedStaffId) !== String(staff._id)
  ) {
    return res.status(403).json({
      success: false,
      message: "Only the assigned clinician can send this question bundle",
    });
  }

  const outstandingQuestion = await Question.findOne({
    caseId: caseRecord._id,
    status: QuestionStatus.SENT,
  });
  if (outstandingQuestion) {
    return res.status(409).json({
      success: false,
      message: "Wait for the patient to answer the outstanding question first",
    });
  }
  const approvedQuestions = await Question.find({
    caseId: caseRecord._id,
    status: QuestionStatus.APPROVED,
    source: { $in: [QuestionSource.AI, QuestionSource.STAFF] },
  });
  if (!approvedQuestions.length) {
    return res.status(409).json({
      success: false,
      message: "Add or approve at least one follow-up question before sending",
    });
  }
  if (
    !isAllowedStatusTransition(
      caseRecord.status,
      CaseStatus.WAITING_FOR_PATIENT,
    )
  ) {
    return res.status(409).json({
      success: false,
      message: "This case cannot request patient information now",
    });
  }

  const previousStatus = caseRecord.status;
  for (const question of approvedQuestions) {
    question.status = QuestionStatus.SENT;
    question.reviewedBy = staff._id;
    await question.save();
  }
  caseRecord.status = CaseStatus.WAITING_FOR_PATIENT;
  await caseRecord.save();
  await appendCaseAudit(caseRecord._id, {
    action: "STAFF_FOLLOW_UP_BUNDLE_SENT",
    actorId: staff._id,
    timestamp: new Date(),
    fromStatus: previousStatus,
    toStatus: caseRecord.status,
  });
  await Promise.all(approvedQuestions.map((question) =>
    notifyPatientFollowUp(caseRecord._id, question._id, staff._id),
  ));
  return res.status(200).json({
    success: true,
    data: { sentCount: approvedQuestions.length, status: caseRecord.status },
  });
};

export const reviewStaffCase = async (req: AuthRequest, res: Response) => {
  const staff = await getCurrentStaff(req.user?.userId);
  const { caseId } = req.params;
  const { action, priority, reason, guidance, status } = req.body as {
    action?: DecisionAction;
    priority?: DecisionPriority;
    reason?: string;
    guidance?: string;
    status?: CaseStatus;
  };

  if (!staff) {
    return res
      .status(403)
      .json({ success: false, message: "Staff access required" });
  }
  if (!validCaseId(caseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }
  if (!Object.values(DecisionAction).includes(action as DecisionAction)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid review action" });
  }
  if (!Object.values(DecisionPriority).includes(priority as DecisionPriority)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case priority" });
  }
  if (status !== undefined && !Object.values(CaseStatus).includes(status)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case status" });
  }
  if (
    reason !== undefined &&
    (typeof reason !== "string" ||
      reason.trim().length < 3 ||
      reason.length > 2000)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Review notes must be 3–2,000 characters" });
  }
  if (
    guidance !== undefined &&
    (typeof guidance !== "string" || guidance.length > 2000)
  ) {
    return res.status(400).json({
      success: false,
      message: "Guidance must be under 2,000 characters",
    });
  }
  const facilityFilter = facilityCaseFilter(caseId, String(staff.facilityId));
  if (!facilityFilter) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid case reference" });
  }
  const caseRecord = await Case.findOne(facilityFilter);
  if (!caseRecord) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }
  if (
    caseRecord.assignedStaffId &&
    idString(caseRecord.assignedStaffId) !== String(staff._id)
  ) {
    return res.status(404).json({ success: false, message: "Case not found" });
  }

  const targetStatus = status || statusForDecision(action as DecisionAction);
  if (!isAllowedStatusTransition(caseRecord.status, targetStatus)) {
    return res.status(409).json({
      success: false,
      message: `Status transition from ${caseRecord.status} to ${targetStatus} is not allowed`,
    });
  }
  if (targetStatus === CaseStatus.COMPLETED && (guidance?.trim().length ?? 0) < 3) {
    return res.status(400).json({
      success: false,
      message: "Patient-visible guidance is required before completing a case",
    });
  }

  const previousStatus = caseRecord.status;
  const previousPriority = caseRecord.priority;
  const nextPriority = priority as unknown as CasePriority;
  const decision = new Decision({
    caseId: caseRecord._id,
    staffId: staff._id,
    priority: priority as DecisionPriority,
    action: action as DecisionAction,
    ...(typeof reason === "string" ? { reason: reason.trim() } : {}),
    ...(guidance?.trim() ? { guidance: guidance.trim() } : {}),
  });
  await decision.save();

  caseRecord.status = targetStatus;
  caseRecord.priority = nextPriority;
  if (targetStatus === CaseStatus.COMPLETED) caseRecord.closedAt = new Date();
  await caseRecord.save();
  if (
    targetStatus !== previousStatus &&
    targetStatus !== CaseStatus.WAITING_FOR_PATIENT
  ) {
    await Question.updateMany(
      {
        caseId: caseRecord._id,
        status: {
          $in: [
            QuestionStatus.PENDING,
            QuestionStatus.APPROVED,
            QuestionStatus.SENT,
          ],
        },
      },
      { $set: { status: QuestionStatus.CANCELLED } },
    );
  }
  await appendCaseAudit(caseRecord._id, {
    action: "STAFF_REVIEW_RECORDED",
    actorId: staff._id,
    timestamp: new Date(),
    fromStatus: previousStatus,
    toStatus: targetStatus,
    fromPriority: previousPriority,
    toPriority: nextPriority,
  });

  return res.status(201).json({
    success: true,
    data: {
      decisionId: decision._id,
      status: caseRecord.status,
      priority: caseRecord.priority,
    },
  });
};


export const reviewStaffFollowUpAnswer = async (req: AuthRequest, res: Response) => {
  const staff = await getCurrentStaff(req.user?.userId);
  const { caseId, questionId } = req.params;
  if (!staff) return res.status(403).json({ success: false, message: "Staff access required" });
  if (!validCaseId(caseId) || !validCaseId(questionId)) return res.status(400).json({ success: false, message: "Invalid follow-up reference" });

  const caseFilter = facilityCaseFilter(caseId, String(staff.facilityId));
  if (!caseFilter) return res.status(400).json({ success: false, message: "Invalid case reference" });
  const caseRecord = await Case.findOne(caseFilter);
  if (!caseRecord) return res.status(404).json({ success: false, message: "Case not found" });
  if (caseRecord.assignedStaffId && idString(caseRecord.assignedStaffId) !== String(staff._id)) {
    return res.status(403).json({ success: false, message: "Only the assigned clinician can review this answer" });
  }

  const question = await Question.findOne({
    _id: questionId,
    caseId: caseRecord._id,
    status: QuestionStatus.ANSWERED,
  });
  if (!question) {
    const existing = await Question.findOne({ _id: questionId, caseId: caseRecord._id, status: QuestionStatus.REVIEWED });
    if (existing) return res.status(200).json({ success: true, data: { status: existing.status, replayed: true } });
    return res.status(404).json({ success: false, message: "Submitted follow-up answer not found" });
  }
  question.status = QuestionStatus.REVIEWED;
  question.reviewedBy = staff._id;
  await question.save();
  await appendCaseAudit(caseRecord._id, {
    action: "STAFF_REVIEWED_FOLLOW_UP_ANSWER",
    actorId: staff._id,
    timestamp: new Date(),
  });
  return res.status(200).json({ success: true, data: { status: question.status } });
};
