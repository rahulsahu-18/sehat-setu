import type { Response } from "express";
import { Types } from "mongoose";
import { Case, CasePriority, CaseStatus } from "../models/case.model";
import { CaseInput, InputMode } from "../models/caseInput.model";
import { Facility } from "../models/facility.model";
import { AISummary } from "../models/AISummary.model";
import { Decision } from "../models/decision.model";
import { ReferralNote } from "../models/referralNote.model";
import {
  generateIntakeReply,
  IntakeChatMessage,
  isAIIntakeConfigurationError,
} from "../utils/aiIntake";
import { Answer, AnswerMode } from "../models/answer.model";
import {
  Question,
  QuestionSource,
  QuestionStatus,
} from "../models/question.model";
import { evaluateSafetyFlags } from "../utils/triageRules";
import { appendCaseAudit } from "../utils/caseAudit";
import { isAllowedStatusTransition } from "../utils/caseWorkflow";
import { patientOwnedCaseFilter } from "../utils/caseAccess";
import { persistIntakeSummary } from "../utils/intakeConversation";
import { excludeStaffAuthoredQuestions, getIntakeQuestionBudget, MAX_AI_INTAKE_QUESTIONS } from "../utils/intakeBudget";
import { deleteCaseData } from "../utils/caseData";
import { User, UserRole } from "../models/user.model";
import { Notification } from "../models/notification.model";
import type { AuthRequest } from "../middleware/auth.middleware";

const languages = ["english", "hindi", "odia"] as const;
type IntakeLanguage = (typeof languages)[number];

export const getPatientCases = async (req: AuthRequest, res: Response) => {
  try {
    const patientId = req.user?.userId;
    if (!patientId) {
      return res
        .status(401)
        .json({ success: false, message: "Patient authentication required" });
    }

    const cases = await Case.find({ patientId: new Types.ObjectId(patientId) })
      .populate("facilityId", "name type location")
      .sort({ createdAt: -1 });

    const casesWithUpdates = cases.map((caseRecord) => {
      const auditTrail = caseRecord.auditTrail || [];
      const lastPatientRead = [...auditTrail]
        .reverse()
        .find((event) => event.action === "PATIENT_READ_INTAKE")?.timestamp;
      const hasUpdates = auditTrail.some(
        (event) =>
          event.action !== "PATIENT_READ_INTAKE" &&
          (!lastPatientRead || event.timestamp > lastPatientRead),
      );
      const record = caseRecord.toObject();
      const retentionDays = Number(process.env.DATA_RETENTION_DAYS || 90);
      return {
        ...record,
        hasUpdates,
        retentionExpiresAt: new Date(
          record.createdAt.getTime() + retentionDays * 24 * 60 * 60 * 1000,
        ),
      };
    });
    return res.status(200).json({ success: true, data: casesWithUpdates });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to load your cases" });
  }
};

export const deletePatientCase = async (req: AuthRequest, res: Response) => {
  const { caseId } = req.params;
  const patientId = req.user?.userId;
  if (!patientId || typeof caseId !== "string") {
    return res.status(400).json({ success: false, message: "Invalid care case" });
  }
  const ownershipFilter = patientOwnedCaseFilter(caseId, patientId);
  if (!ownershipFilter) {
    return res.status(400).json({ success: false, message: "Invalid care case" });
  }
  const caseRecord = await Case.findOne(ownershipFilter).select("_id");
  if (!caseRecord) {
    return res.status(404).json({ success: false, message: "Care case not found" });
  }
  try {
    await deleteCaseData(caseRecord._id);
    return res.status(200).json({
      success: true,
      message: "Case data and linked intake records were permanently deleted.",
    });
  } catch (error) {
    console.error(
      "Patient case deletion failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return res.status(500).json({
      success: false,
      message: "Unable to delete all case records. Contact the facility administrator.",
    });
  }
};

export const deletePatientAccount = async (req: AuthRequest, res: Response) => {
  const patientId = req.user?.userId;
  if (!patientId || !Types.ObjectId.isValid(patientId)) {
    return res.status(401).json({
      success: false,
      message: "Patient authentication required",
    });
  }
  try {
    const cases = await Case.find({ patientId: new Types.ObjectId(patientId) })
      .select("_id")
      .lean()
      .exec();
    for (const caseRecord of cases) {
      await deleteCaseData(caseRecord._id);
    }
    await Notification.deleteMany({ recipientId: new Types.ObjectId(patientId) });
    const deletion = await User.deleteOne({
      _id: new Types.ObjectId(patientId),
      role: UserRole.PATIENT,
    });
    if (deletion.deletedCount !== 1) {
      throw new Error("The patient account was not deleted.");
    }
    return res.status(200).json({
      success: true,
      message: "Your account and linked case data were permanently deleted.",
    });
  } catch (error) {
    console.error(
      "Patient account deletion failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return res.status(500).json({
      success: false,
      message: "Unable to delete all account data. Please try again.",
    });
  }
};

export const acceptPatientCaseConsent = async (
  req: AuthRequest,
  res: Response,
) => {
  const { caseId } = req.params;
  const patientId = req.user?.userId;
  if (!patientId || typeof caseId !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid care case" });
  }
  const ownershipFilter = patientOwnedCaseFilter(caseId, patientId);
  if (!ownershipFilter) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid care case" });
  }
  const caseRecord = await Case.findOne(ownershipFilter);
  if (!caseRecord) {
    return res
      .status(404)
      .json({ success: false, message: "Care case not found" });
  }
  if (req.body?.consent !== true) {
    return res
      .status(400)
      .json({ success: false, message: "Consent must be accepted" });
  }
  const acceptedAt = new Date();
  caseRecord.consent = { version: "intake-ai-v1", acceptedAt };
  await caseRecord.save();
  await appendCaseAudit(caseRecord._id, {
    action: "PATIENT_ACCEPTED_INTAKE_CONSENT",
    actorId: new Types.ObjectId(patientId),
    timestamp: acceptedAt,
  });
  return res.status(200).json({
    success: true,
    data: { version: caseRecord.consent.version, acceptedAt },
  });
};

export const startPatientIntake = async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId, language, consent } = req.body as {
      facilityId?: string;
      language?: IntakeLanguage;
      consent?: boolean;
    };
    const patientId = req.user?.userId;

    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: "Patient authentication required",
      });
    }

    if (!facilityId || !language || consent !== true) {
      return res.status(400).json({
        success: false,
        message: "Facility, language, and consent are required",
      });
    }

    if (!languages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: "Invalid intake language",
      });
    }

    const facility =
      await Facility.findById(facilityId).select("name type location");
    if (!facility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found",
      });
    }

    const caseRecord = await Case.create({
      caseNo: `CASE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      patientId: new Types.ObjectId(patientId),
      facilityId: facility._id,
      status: CaseStatus.NEW,
      priority: CasePriority.ROUTINE,
      intakeLanguage: language,
      consent: { version: "intake-ai-v1", acceptedAt: new Date() },
      auditTrail: [
        {
          action: "CASE_CREATED_WITH_CONSENT",
          actorId: new Types.ObjectId(patientId),
          timestamp: new Date(),
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "AI intake is ready",
      data: {
        case: {
          id: caseRecord._id,
          caseNo: caseRecord.caseNo,
          status: caseRecord.status,
          priority: caseRecord.priority,
          intakeLanguage: caseRecord.intakeLanguage,
          consentAccepted: Boolean(caseRecord.consent?.acceptedAt),
          facility,
        },
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to start AI intake",
    });
  }
};

export const addPatientIntakeInput = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { caseId } = req.params;
    const { content, mode: requestedMode } = req.body as {
      content?: string;
      mode?: string;
    };
    const inputMode =
      requestedMode === undefined || requestedMode === InputMode.TEXT
        ? InputMode.TEXT
        : requestedMode === InputMode.VOICE
          ? InputMode.VOICE
          : null;
    const patientId = req.user?.userId;

    if (
      typeof caseId !== "string" ||
      !Types.ObjectId.isValid(caseId) ||
      !patientId ||
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 4000
    ) {
      return res.status(400).json({
        success: false,
        message: "A message under 4,000 characters is required",
      });
    }
    if (!inputMode) {
      return res.status(400).json({
        success: false,
        message: "Input mode must be TEXT or VOICE",
      });
    }

    const ownershipFilter = patientOwnedCaseFilter(caseId, patientId);
    if (!ownershipFilter) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid care case" });
    }
    const caseRecord = await Case.findOne(ownershipFilter);
    if (!caseRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Care case not found" });
    }

    if (!caseRecord.consent?.acceptedAt || !caseRecord.consent.version) {
      return res.status(403).json({
        success: false,
        message: "Consent is required before submitting intake text",
      });
    }
    if (
      ![
        CaseStatus.NEW,
        CaseStatus.AI_PROCESSING,
        CaseStatus.WAITING_FOR_PATIENT,
      ].includes(caseRecord.status)
    ) {
      return res.status(409).json({
        success: false,
        message: "This case is not accepting patient intake messages",
      });
    }

    const [latestSummary, savedInputs] = await Promise.all([
      AISummary.findOne({ caseId: caseRecord._id }).sort({ version: -1 }),
      CaseInput.find({ caseId: caseRecord._id, mode: InputMode.TEXT })
        .sort({ createdAt: 1 })
        .select("content"),
    ]);
    const persistedConversation =
      latestSummary?.data.conversationSource === "server-generated-v1" &&
      Array.isArray(latestSummary.data.conversation)
        ? latestSummary.data.conversation
        : savedInputs.map((item) => ({
            role: "user" as const,
            content: item.content,
          }));
    const history: IntakeChatMessage[] = persistedConversation
      .filter(
        (message): message is IntakeChatMessage =>
          !!message &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim().length > 0,
      )
      .slice(-16)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 4000),
      }));
    const pendingQuestions =
      caseRecord.status === CaseStatus.WAITING_FOR_PATIENT
        ? await Question.find({
            caseId: caseRecord._id,
            status: { $in: [QuestionStatus.SENT, QuestionStatus.IN_PROGRESS] },
          }).sort({ createdAt: 1 })
        : [];

    if (pendingQuestions.length) {
      return res.status(409).json({
        success: false,
        message: "Please answer each care-team follow-up separately from the Follow-ups page.",
      });
    }

    // Doctor-authored follow-up turns have their own workflow and do not
    // consume the initial AI intake question budget. Historical transcripts
    // contain their question text, so remove exact staff-authored questions
    // before counting the AI's question turns.
    const staffQuestionRecords = await Question.find({
      caseId: caseRecord._id,
      source: QuestionSource.STAFF,
    }).select("question").lean();
    const intakeQuestionHistory = excludeStaffAuthoredQuestions(
      history,
      staffQuestionRecords.map((question) => question.question),
    );
    const intakeBudget = getIntakeQuestionBudget(intakeQuestionHistory);
    if (!pendingQuestions.length && intakeBudget.exhausted) {
      const lastSummaryData = latestSummary?.data;
      const patientReports = [
        ...history
          .filter((message) => message.role === "user")
          .map((message) => message.content),
        content.trim(),
      ];
      const safetyFlags = evaluateSafetyFlags(patientReports, caseRecord.intakeLanguage);
      const finalMessage = safetyFlags[0]?.instruction ??
        "Thank you. I have saved your information for a qualified healthcare professional to review. This assistant does not diagnose or prescribe.";
      const previousStatus = caseRecord.status;
      const previousPriority = caseRecord.priority;
      const nextStatus = safetyFlags.length
        ? CaseStatus.ESCALATED
        : CaseStatus.WAITING_FOR_REVIEW;

      if (!isAllowedStatusTransition(previousStatus, nextStatus)) {
        return res.status(409).json({
          success: false,
          message: "This case cannot move to the next intake status",
        });
      }

      // Persist the patient's final response even though no more AI questions
      // may be asked. A later summary/provider failure must not discard it.
      const input = await CaseInput.create({
        caseId: caseRecord._id,
        mode: inputMode,
        content: content.trim(),
        language: caseRecord.intakeLanguage,
      });
      await persistIntakeSummary(
        caseRecord._id,
        history,
        content.trim(),
        finalMessage,
        {
          summary: typeof lastSummaryData?.summary === "string" ? lastSummaryData.summary : "",
          missingInformation: Array.isArray(lastSummaryData?.missingInformation)
            ? lastSummaryData.missingInformation
            : [],
          contradictions: Array.isArray(lastSummaryData?.contradictions)
            ? lastSummaryData.contradictions
            : [],
          timeline: Array.isArray(lastSummaryData?.timeline)
            ? lastSummaryData.timeline
            : [],
          urgencySignals: Array.isArray(lastSummaryData?.urgencySignals)
            ? lastSummaryData.urgencySignals
            : [],
          deterministicSafetyFlags: safetyFlags,
          conversationSource: "server-generated-v1",
          followUpQuestions: [],
          complete: true,
          questionBudget: {
            used: MAX_AI_INTAKE_QUESTIONS,
            maxQuestions: MAX_AI_INTAKE_QUESTIONS,
            remaining: 0,
          },
        },
      );

      caseRecord.status = nextStatus;
      if (safetyFlags.length) caseRecord.priority = CasePriority.URGENT;
      await caseRecord.save();
      await appendCaseAudit(caseRecord._id, {
        action: "PATIENT_INTAKE_QUESTION_LIMIT_REACHED",
        actorId: new Types.ObjectId(patientId),
        timestamp: new Date(),
        fromStatus: previousStatus,
        toStatus: caseRecord.status,
        fromPriority: previousPriority,
        toPriority: caseRecord.priority,
      });

      return res.status(201).json({
        success: true,
        message: "Your response was saved and the intake is ready for clinical review.",
        data: {
          inputId: input._id,
          caseNo: caseRecord.caseNo,
          status: caseRecord.status,
          priority: caseRecord.priority,
          reply: finalMessage,
          summary: typeof lastSummaryData?.summary === "string" ? lastSummaryData.summary : "",
          missingInformation: Array.isArray(lastSummaryData?.missingInformation)
            ? lastSummaryData.missingInformation
            : [],
          contradictions: Array.isArray(lastSummaryData?.contradictions)
            ? lastSummaryData.contradictions
            : [],
          timeline: Array.isArray(lastSummaryData?.timeline) ? lastSummaryData.timeline : [],
          urgencySignals: Array.isArray(lastSummaryData?.urgencySignals)
            ? lastSummaryData.urgencySignals
            : [],
          deterministicSafetyFlags: safetyFlags,
          followUpQuestions: [],
          staffReviewPending: false,
          complete: true,
          questionBudget: {
            used: MAX_AI_INTAKE_QUESTIONS,
            maxQuestions: MAX_AI_INTAKE_QUESTIONS,
            remaining: 0,
          },
        },
      });
    }

    if (pendingQuestions.length) {
      return res.status(409).json({
        success: false,
        message: "Please answer each care-team follow-up separately from the Follow-ups page.",
        data: { followUpsPath: "/patient/follow-ups" },
      });
    }
    const conversationForAI = [
      ...history,
      { role: "user" as const, content: content.trim() },
    ];
    const reply = await generateIntakeReply(
      caseRecord.intakeLanguage,
      conversationForAI,
    );
    const safetyFlags = evaluateSafetyFlags(
      [
        ...conversationForAI
          .filter((message) => message.role === "user")
          .map((message) => message.content),
      ],
      caseRecord.intakeLanguage,
    );
    const previousQuestions = await Question.find({
      caseId: caseRecord._id,
    }).select("question");
    const knownQuestions = new Set(
      previousQuestions.map((item) =>
        item.question
          .toLowerCase()
          .replace(/[?.!,،؟]+/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      ),
    );
    const followUpQuestions = reply.followUpQuestions.filter((question) => {
      const normalized = question
        .toLowerCase()
        .replace(/[?.!,،؟]+/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!normalized || knownQuestions.has(normalized)) return false;
      knownQuestions.add(normalized);
      return true;
    });
    const assistantMessage = safetyFlags.length
      ? safetyFlags[0]?.instruction || reply.message
      : reply.followUpQuestions.reduce(
          (message, question) => message.replace(question, "").trim(),
          reply.message,
        );
    const budgetAfterReply = pendingQuestions.length
      ? intakeBudget
      : getIntakeQuestionBudget([
          ...intakeQuestionHistory,
          { role: "user" as const, content: content.trim() },
          { role: "assistant" as const, content: assistantMessage },
        ]);
    // If the model emits more questions than remain in the budget, do not
    // deliver that over-budget response; save the answer and hand the case to
    // the care team instead.
    const questionLimitReached = !pendingQuestions.length && budgetAfterReply.overLimit;
    // Report only delivered questions when an over-budget candidate is withheld.
    const effectiveQuestionBudget = questionLimitReached ? intakeBudget : budgetAfterReply;
    const safeAssistantMessage = safetyFlags.length
      ? safetyFlags[0]?.instruction || assistantMessage
      : questionLimitReached
        ? "Thank you. I have saved your information for a qualified healthcare professional to review. This assistant does not diagnose or prescribe."
        : assistantMessage;
    const safeFollowUpQuestions = questionLimitReached ? [] : followUpQuestions;
    const previousStatus = caseRecord.status;
    const previousPriority = caseRecord.priority;
    const nextStatus = safetyFlags.length
      ? CaseStatus.ESCALATED
      : reply.complete || questionLimitReached
        ? CaseStatus.WAITING_FOR_REVIEW
        : CaseStatus.AI_PROCESSING;
    if (!isAllowedStatusTransition(previousStatus, nextStatus)) {
      return res.status(409).json({
        success: false,
        message: "This case cannot move to the next intake status",
      });
    }

    const input = await CaseInput.create({
      caseId: caseRecord._id,
      mode: inputMode,
      content: content.trim(),
      language: caseRecord.intakeLanguage,
    });
    await persistIntakeSummary(
      caseRecord._id,
      history,
      content.trim(),
      safeAssistantMessage,
      {
        summary: reply.summary,
        missingInformation: reply.missingInformation,
        contradictions: reply.contradictions,
        timeline: reply.timeline,
        urgencySignals: reply.urgencySignals,
        deterministicSafetyFlags: safetyFlags,
        conversationSource: "server-generated-v1",
        followUpQuestions: safeFollowUpQuestions,
        complete: reply.complete || questionLimitReached,
        questionBudget: {
          used: effectiveQuestionBudget.used,
          maxQuestions: MAX_AI_INTAKE_QUESTIONS,
          remaining: effectiveQuestionBudget.remaining,
        },
      },
    );

    if (safeFollowUpQuestions.length && !safetyFlags.length) {
      await Question.insertMany(
        safeFollowUpQuestions.map((question) => ({
          caseId: caseRecord._id,
          question,
          source: QuestionSource.AI,
          status: QuestionStatus.PENDING,
          language: caseRecord.intakeLanguage,
        })),
      );
    }

    caseRecord.status = nextStatus;
    if (safetyFlags.length) caseRecord.priority = CasePriority.URGENT;
    await caseRecord.save();
    await appendCaseAudit(caseRecord._id, {
      action: "PATIENT_INTAKE_MESSAGE",
      actorId: new Types.ObjectId(patientId),
      timestamp: new Date(),
      fromStatus: previousStatus,
      toStatus: caseRecord.status,
      fromPriority: previousPriority,
      toPriority: caseRecord.priority,
    });

    return res.status(201).json({
      success: true,
      message: questionLimitReached
        ? "Your response was saved and the intake is ready for clinical review."
        : "Your intake was submitted for AI processing",
      data: {
        inputId: input._id,
        caseNo: caseRecord.caseNo,
        status: caseRecord.status,
        priority: caseRecord.priority,
        reply: safeAssistantMessage,
        summary: reply.summary,
        missingInformation: reply.missingInformation,
        contradictions: reply.contradictions,
        timeline: reply.timeline,
        urgencySignals: reply.urgencySignals,
        deterministicSafetyFlags: safetyFlags,
        followUpQuestions: safeFollowUpQuestions,
        staffReviewPending: Boolean(
          safeFollowUpQuestions.length && !safetyFlags.length,
        ),
        complete: reply.complete || questionLimitReached,
        questionBudget: {
          used: effectiveQuestionBudget.used,
          maxQuestions: MAX_AI_INTAKE_QUESTIONS,
          remaining: effectiveQuestionBudget.remaining,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const configurationError = isAIIntakeConfigurationError(message);
    const safeMessage = configurationError
      ? "AI intake is not configured on this server."
      : message.startsWith("The AI assistant")
        ? message
        : "Unable to process your intake message. Please try again.";
    return res.status(configurationError ? 503 : 502).json({
      success: false,
      message: safeMessage,
    });
  }
};

export const getPatientIntakeChat = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    const patientId = req.user?.userId;
    if (
      typeof caseId !== "string" ||
      !Types.ObjectId.isValid(caseId) ||
      !patientId
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid care case" });
    }

    const ownershipFilter = patientOwnedCaseFilter(caseId, patientId);
    if (!ownershipFilter) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid care case" });
    }
    const caseRecord = await Case.findOne(ownershipFilter);
    if (!caseRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Care case not found" });
    }

    const [
      latestSummary,
      facility,
      inputHistory,
      sentQuestions,
      guidanceEntries,
      referralNote,
    ] =
      await Promise.all([
        AISummary.findOne({ caseId: caseRecord._id }).sort({ version: -1 }),
        Facility.findById(caseRecord.facilityId).select("name type location"),
        CaseInput.find({
          caseId: caseRecord._id,
          mode: { $in: [InputMode.TEXT, InputMode.DOCUMENT] },
        })
          .sort({ createdAt: 1 })
          .select("content createdAt mode sourceName"),
        Question.find({
          caseId: caseRecord._id,
          status: { $in: [QuestionStatus.SENT, QuestionStatus.ANSWERED] },
        })
          .sort({ createdAt: 1 })
          .select("question createdAt status"),
        Decision.find({
          caseId: caseRecord._id,
          guidance: { $exists: true, $ne: "" },
        })
          .sort({ createdAt: 1 })
          .select("guidance createdAt"),
        ReferralNote.findOne({
          caseId: caseRecord._id,
          patientSharedAt: { $ne: null },
        }).select(
          "caseNo patientName patientId referringFacility referringFacilityLocation receivingFacility clinicalQuestion patientInstructions patientSharedAt",
        ),
      ]);
    await appendCaseAudit(caseRecord._id, {
      action: "PATIENT_READ_INTAKE",
      actorId: new Types.ObjectId(patientId),
      timestamp: new Date(),
    });
    return res.status(200).json({
      success: true,
      data: {
        case: {
          id: caseRecord._id,
          caseNo: caseRecord.caseNo,
          status: caseRecord.status,
          priority: caseRecord.priority,
          intakeLanguage: caseRecord.intakeLanguage,
          consentAccepted: Boolean(caseRecord.consent?.acceptedAt),
          facility,
        },
        summary: latestSummary?.data ?? null,
        inputs: inputHistory.map((input) => ({
          content:
            input.mode === InputMode.DOCUMENT
              ? `Report uploaded${input.sourceName ? ` (${input.sourceName})` : ""}:\n${input.content}`
              : input.content,
          createdAt: input.createdAt,
          mode: input.mode,
          sourceName: input.sourceName,
        })),
        questions: sentQuestions,
        careTeamGuidance: guidanceEntries.map((entry) => ({
          guidance: entry.guidance,
          createdAt: entry.createdAt,
        })),
        referralNote,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load your intake conversation",
    });
  }
};
