import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  UserRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import api from "@/services/api";
import { AppHeader } from "@/components/AppHeader";
import { FormMessage } from "@/components/AuthShell";
import { localeTag, translate, translateStatus, useLocale } from "@/lib/i18n";

type StaffCaseData = {
  case: {
    _id: string;
    caseNo: string;
    status: string;
    priority: string;
    intakeLanguage: string;
    patientId: { name: string; patientId?: string };
    facilityId: { name: string; location?: string; type?: string } | string;
    assignedStaffId?: { _id: string; name: string; role: string } | string;
  };
  summary?: {
    summary?: string;
    missingInformation?: string[];
    contradictions?: string[];
    timeline?: { when: string; event: string; source: string }[];
    deterministicSafetyFlags?: {
      ruleId: string;
      status: string;
      reportedTerm: string;
      reason: string;
      instruction: string;
    }[];
    conversation?: { role: string; content: string }[];
  } | null;
  inputs: {
    content: string;
    language?: string;
    createdAt: string;
    mode?: string;
    sourceName?: string;
  }[];
  decisions: {
    _id: string;
    action: string;
    priority: string;
    reason?: string;
    guidance?: string;
    assignedToId?: { name: string; role: string } | string;
    createdAt: string;
    staffId: { name: string; role: string } | string;
  }[];
  referralNote?: {
    caseNo: string;
    patientName: string;
    patientId: string;
    caseStatus: string;
    priority: string;
    referringFacility: string;
    referringFacilityLocation: string;
    receivingFacility: string;
    clinicalQuestion: string;
    patientInstructions: string;
    patientSharedAt?: string | null;
    patientSummary: string;
    timeline: { when: string; event: string; source: string }[];
    reportSources: string[];
    warningFlags: string[];
    missingInformation: string[];
    contradictions: string[];
    updatedAt: string;
  } | null;
  questions: {
    _id: string;
    question: string;
    source: string;
    status: string;
    createdAt: string;
  }[];
  answers: {
    questionId: string;
    answer: string;
    mode?: "TEXT" | "VOICE";
    language?: "english" | "hindi" | "odia";
    englishSummary?: string;
    englishSummaryStatus?: "PENDING" | "READY" | "FAILED";
    createdAt: string;
  }[];
  auditTrail: {
    action: string;
    timestamp: string;
    fromStatus?: string;
    toStatus?: string;
    actorId?: { name: string; role: string } | string;
    assignedToId?: { name: string; role: string } | string;
  }[];
};

const decisionActions = [
  ["CONTINUE_EVALUATION", "Continue evaluation"],
  ["SCHEDULE_FOLLOW_UP", "Schedule follow-up"],
  ["REFER_TO_DOCTOR", "Refer to doctor"],
  ["ESCALATE", "Escalate"],
  ["COMPLETE_CASE", "Complete case"],
];
const caseStatuses = [
  "WAITING_FOR_PATIENT",
  "ACTIVE",
  "FOLLOW_UP",
  "REFERRED",
  "ESCALATED",
  "COMPLETED",
];

function StaffCaseDetailPage() {
  const locale = useLocale();
  const t = (message: string) => translate(locale, message);
  const { caseId } = useParams();
  const [data, setData] = useState<StaffCaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [action, setAction] = useState("CONTINUE_EVALUATION");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("ROUTINE");
  const [guidance, setGuidance] = useState("");
  const [questionDraft, setQuestionDraft] = useState("");
  const [questionDrafts, setQuestionDrafts] = useState<string[]>([]);
  const questionBundleKeyRef = useRef<{ payload: string; key: string } | null>(null);
  const [referralDestination, setReferralDestination] = useState("");
  const [referralQuestion, setReferralQuestion] = useState("");
  const [patientInstructions, setPatientInstructions] = useState("");
  const [referralSaved, setReferralSaved] = useState(false);

  const loadCase = async () => {
    if (!caseId) return;
    const response = await api.get(`/staff/cases/${caseId}`);
    const caseData = response.data.data as StaffCaseData;
    setData(caseData);
    setPriority(caseData.case.priority);
    setStatus(caseData.case.status);
    setReferralDestination(caseData.referralNote?.receivingFacility || "");
    setReferralQuestion(caseData.referralNote?.clinicalQuestion || "");
    setPatientInstructions(caseData.referralNote?.patientInstructions || "");
    setReferralSaved(Boolean(caseData.referralNote));
  };

  useEffect(() => {
    loadCase()
      .catch((requestError: any) =>
        setError(
          t(requestError.response?.data?.message || "Unable to load this case."),
        ),
      )
      .finally(() => setLoading(false));
  }, [caseId]);

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caseId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    setReviewFeedback(null);
    try {
      const response = await api.post(`/staff/cases/${caseId}/review`, {
        action,
        status,
        priority,
        ...(guidance.trim() ? { guidance: guidance.trim() } : {}),
      });
      setGuidance("");
      setReviewFeedback({
        type: "success",
        message: t("Review saved. Case status: {status}. Queue priority: {priority}.")
          .replace("{status}", translateStatus(locale, response.data.data.status))
          .replace("{priority}", translateStatus(locale, response.data.data.priority)),
      });
      try {
        await loadCase();
      } catch {
        setReviewFeedback({
          type: "success",
          message: t("Review saved, but the case details could not refresh. Reload the page to see the latest status."),
        });
      }
    } catch (requestError: any) {
      setReviewFeedback({
        type: "error",
        message:
          t(requestError.response?.data?.message || "Unable to save the review."),
      });
    } finally {
      setSaving(false);
    }
  };

  const claimCase = async () => {
    if (!caseId) return;
    setSaving(true);
    setError("");
    try {
      await api.patch(`/staff/cases/${caseId}/assignment`, {});
      await loadCase();
      setSuccess(t("Case claimed by you."));
    } catch (requestError: any) {
      setError(
        t(requestError.response?.data?.message || "Unable to claim this case."),
      );
    } finally {
      setSaving(false);
    }
  };

  const reviewQuestion = async (
    questionId: string,
    decision: "APPROVE" | "REJECT",
  ) => {
    if (!caseId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post(`/staff/cases/${caseId}/questions/${questionId}/review`, {
        decision,
      });
      await loadCase();
      setSuccess(
        t(decision === "APPROVE" ? "AI follow-up approved." : "AI follow-up rejected."),
      );
    } catch (requestError: any) {
      setError(
        t(requestError.response?.data?.message || "Unable to review the question."),
      );
    } finally {
      setSaving(false);
    }
  };

  const reviewFollowUpAnswer = async (questionId: string) => {
    if (!caseId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post(`/staff/cases/${caseId}/questions/${questionId}/answer/review`, {});
      await loadCase();
      setSuccess(t("Patient follow-up answer marked as reviewed."));
    } catch (requestError: any) {
      setError(t(requestError.response?.data?.message || "Unable to review this answer."));
    } finally {
      setSaving(false);
    }
  };

  const sendApprovedQuestions = async () => {
    if (!caseId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(
        `/staff/cases/${caseId}/questions/send-approved`,
      );
      await loadCase();
      setSuccess(
        t("{count} follow-up question(s) sent to the patient.").replace(
          "{count}",
          String(response.data.data.sentCount),
        ),
      );
    } catch (requestError: any) {
      setError(
        t(requestError.response?.data?.message || "Unable to send follow-up questions."),
      );
    } finally {
      setSaving(false);
    }
  };

  const addQuestionDraft = () => {
    const normalized = questionDraft.trim();
    if (normalized.length < 5 || questionDrafts.length >= 10) return;
    setQuestionDrafts((current) => [...current, normalized]);
    setQuestionDraft("");
    setError("");
  };

  const saveReferralNote = async () => {
    if (!caseId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put(`/staff/cases/${caseId}/referral-note`, {
        receivingFacility: referralDestination,
        clinicalQuestion: referralQuestion,
      });
      await loadCase();
      setSuccess(
        t("Staff referral handoff saved. Review it before preparing a patient slip."),
      );
    } catch (requestError: any) {
      setError(
        t(requestError.response?.data?.message || "Unable to save the referral note."),
      );
    } finally {
      setSaving(false);
    }
  };

  const shareReferralSlip = async () => {
    if (!caseId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post(`/staff/cases/${caseId}/referral-note/share`, {
        patientInstructions,
      });
      await loadCase();
      setSuccess(t("Clinician-approved referral slip shared with the patient."));
    } catch (requestError: any) {
      setError(
        t(requestError.response?.data?.message || "Unable to share the patient referral slip."),
      );
    } finally {
      setSaving(false);
    }
  };

  const saveQuestionDrafts = async () => {
    if (!caseId || !questionDrafts.length) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payloadIdentity = JSON.stringify(questionDrafts.map((question) => question.trim()));
      const savedKey = questionBundleKeyRef.current;
      const idempotencyKey =
        savedKey?.payload === payloadIdentity ? savedKey.key : crypto.randomUUID();
      // Keep the same key while retrying the same draft after a timeout/network
      // error. The questions themselves are not persisted in browser storage.
      questionBundleKeyRef.current = { payload: payloadIdentity, key: idempotencyKey };
      const response = await api.post(
        `/staff/cases/${caseId}/questions`,
        { questions: questionDrafts },
        { headers: { "Idempotency-Key": idempotencyKey } },
      );
      questionBundleKeyRef.current = null;
      setQuestionDrafts([]);
      await loadCase();
      setSuccess(
        t("{count} clinician question(s) added to the bundle.").replace(
          "{count}",
          String(response.data.data.createdCount),
        ),
      );
    } catch (requestError: any) {
      setError(
        t(requestError.response?.data?.message || "Unable to add questions. Retry the same draft to safely resume."),
      );
    } finally {
      setSaving(false);
    }
  };

  const flags = data?.summary?.deterministicSafetyFlags || [];
  const hasReferral = Boolean(
    data?.case.status === "REFERRED" ||
      data?.decisions.some((decision) =>
        ["REFER_TO_DOCTOR", "REFER_TO_SPECIALIST"].includes(decision.action),
      ),
  );
  const transcript = data?.summary?.conversation?.length
    ? data.summary.conversation
    : (data?.inputs || []).map((input) => ({
        role: "user",
        content: input.content,
      }));

  return (
    <main className="staff-dashboard-page">
      <AppHeader staff />
      <div className="staff-case-detail-inner">
        <Link className="intake-back" to="/staff/dashboard">
          <ArrowLeft size={15} /> {t("Back to queue")}
        </Link>
        {loading ? (
          <p className="staff-detail-loading">{t("Loading case...")}</p>
        ) : !data ? (
          <p className="dashboard-error" role="alert">
            {t(error || "Case not found or access denied.")}
          </p>
        ) : (
          <>
            <header className="staff-case-detail-header">
              <div>
                <span className="auth-eyebrow">
                  <span className="eyebrow-dot" /> {t("CASE REVIEW")} /{" "}
                  {data.case.caseNo}
                </span>
                <h1>{data.case.patientId.name}</h1>
                <p>
                  {data.case.patientId.patientId || "Patient"} ·{" "}
                  {translateStatus(locale, data.case.intakeLanguage)} {t("patient intake")}
                </p>
              </div>
              <div className="staff-case-state">
                <span>{translateStatus(locale, data.case.status)}</span>
                <strong>{translateStatus(locale, data.case.priority)} {t("PRIORITY LABEL")}</strong>
              </div>
            </header>

            <FormMessage error={t(error)} success={t(success)} />

            {flags.length > 0 && (
              <section className="staff-emergency-warning" role="alert">
                <AlertTriangle size={19} />
                <div>
                  <strong>{t("Possible emergency warning · Immediate review")}</strong>
                  {flags.map((flag) => (
                    <p key={flag.ruleId}>
                      {flag.reason} {t("Mention:")} “{flag.reportedTerm}”.{" "}
                      {flag.instruction}
                    </p>
                  ))}
                  <small>
                    {t("Rules are educational prototype rules and require qualified clinical review before real-world use.")}
                  </small>
                </div>
              </section>
            )}

            <div className="staff-case-detail-grid">
              <div className="staff-case-main-column">
                <section className="staff-review-panel">
                  <span className="section-label">{t("AI-GENERATED BRIEF")}</span>
                  <h2>{t("Intake summary")}</h2>
                  <p>
                    {data.summary?.summary ||
                      t("No AI summary has been saved yet.")}
                  </p>
                  {!!data.summary?.missingInformation?.length && (
                    <div className="staff-missing-info">
                      <strong>{t("Missing information to clarify")}</strong>
                      {data.summary.missingInformation.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  )}
                  {!!data.summary?.contradictions?.length && (
                    <div className="staff-missing-info">
                      <strong>{t("Patient-reported conflicting details")}</strong>
                      {data.summary.contradictions.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  )}
                </section>

                {!!data.summary?.timeline?.length && (
                  <section className="staff-review-panel">
                    <span className="section-label">{t("SOURCE-BASED TIMELINE")}</span>
                    <h2>{t("Reported sequence of events")}</h2>
                    <p className="staff-internal-note">
                      {t("AI-extracted from patient text and uploaded selectable-text reports. Verify dates and events with the patient.")}
                    </p>
                    {data.summary.timeline.map((item, index) => (
                      <article
                        className="staff-timeline-item"
                        key={`${item.when}-${index}`}
                      >
                        <strong>{item.when}</strong>
                        <p>{item.event}</p>
                        <small>Source: {item.source}</small>
                      </article>
                    ))}
                  </section>
                )}

                {hasReferral && (
                  <section className="staff-review-panel staff-referral-print">
                    <span className="section-label">{t("REFERRAL HANDOFF")}</span>
                    <h2>{t("Referral summary · clinician review required")}</h2>
                    <p className="staff-internal-note">
                      {t("Complete the destination and clinical question, then save to create a persistent handoff snapshot for this case.")}
                    </p>
                    <dl>
                      <div>
                        <dt>{t("Patient / case")}</dt>
                        <dd>
                          {data.referralNote?.patientName ||
                            data.case.patientId.name}{" "}
                          · {data.referralNote?.caseNo || data.case.caseNo}
                          {data.referralNote?.patientId &&
                            ` · ${data.referralNote.patientId}`}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Current status / queue priority")}</dt>
                        <dd>
                          {translateStatus(locale, data.referralNote?.caseStatus || data.case.status)}{" "}
                          · {translateStatus(locale, data.referralNote?.priority || data.case.priority)}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Referring facility")}</dt>
                        <dd>
                          {data.referralNote
                            ? `${data.referralNote.referringFacility}${data.referralNote.referringFacilityLocation ? ` · ${data.referralNote.referringFacilityLocation}` : ""}`
                            : typeof data.case.facilityId === "object"
                              ? `${data.case.facilityId.name}${data.case.facilityId.location ? ` · ${data.case.facilityId.location}` : ""}`
                              : t("Facility name unavailable")}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Receiving facility / unit")}</dt>
                        <dd className="staff-referral-screen-only">
                          <input
                            id="referralDestination"
                            value={referralDestination}
                            onChange={(event) => {
                              setReferralDestination(event.target.value)
                              setReferralSaved(false);
                            }}
                            maxLength={200}
                            placeholder={t("Enter destination after confirming it")}
                            required
                          />
                        </dd>
                        <dd className="staff-referral-print-only">
                          {data.referralNote?.receivingFacility || t("Not entered")}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Clinical question / reason for referral")}</dt>
                        <dd className="staff-referral-screen-only">
                          <textarea
                            id="referralQuestion"
                            value={referralQuestion}
                            onChange={(event) => {
                              setReferralQuestion(event.target.value)
                              setReferralSaved(false);
                            }}
                            maxLength={1000}
                            placeholder={t("Describe the specific question for the receiving clinician")}
                            required
                          />
                        </dd>
                        <dd className="staff-referral-print-only">
                          {data.referralNote?.clinicalQuestion || t("Not entered")}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Patient-reported summary (AI draft)")}</dt>
                        <dd>
                          {data.referralNote?.patientSummary ||
                            "No summary recorded."}
                        </dd>
                      </div>
                      {!!data.referralNote?.timeline.length && (
                        <div>
                          <dt>{t("Reported timeline (verify)")}</dt>
                          <dd>
                            {data.referralNote.timeline
                              .map(
                                (item) =>
                                  `${item.when}: ${item.event} (Source: ${item.source})`,
                              )
                              .join("\n")}
                          </dd>
                        </div>
                      )}
                      {!!data.referralNote?.reportSources.length && (
                        <div>
                          <dt>{t("Uploaded report files (verify originals)")}</dt>
                          <dd>{data.referralNote.reportSources.join("\n")}</dd>
                        </div>
                      )}
                      {!!data.referralNote?.warningFlags.length && (
                        <div>
                          <dt>{t("Prototype warning flags · verify immediately")}</dt>
                          <dd>{data.referralNote.warningFlags.join("\n")}</dd>
                        </div>
                      )}
                      {!!data.referralNote?.missingInformation.length && (
                        <div>
                          <dt>{t("Information still to clarify")}</dt>
                          <dd>
                            {data.referralNote.missingInformation.join("\n")}
                          </dd>
                        </div>
                      )}
                      {!!data.referralNote?.contradictions.length && (
                        <div>
                          <dt>{t("Reported contradictions")}</dt>
                          <dd>{data.referralNote.contradictions.join("\n")}</dd>
                        </div>
                      )}
                      {data.referralNote && (
                        <div>
                          <dt>{t("Last saved")}</dt>
                          <dd>
                            {new Date(data.referralNote.updatedAt).toLocaleString(
                              localeTag(locale),
                            )}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <p>
                      {t("Non-diagnostic information handoff prepared from patient-provided content. Confirm source documents, values, units, identity, and destination before referral. Do not use this draft as a substitute for clinical assessment.")}
                    </p>
                    <button
                      className="button button-primary staff-referral-save"
                      type="button"
                      onClick={saveReferralNote}
                      disabled={saving}
                    >
                      {saving ? t("Saving referral note...") : t("Save referral note")}
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => window.print()}
                      disabled={!referralSaved || saving}
                    >
                      {t("Print saved referral handoff")}
                    </button>
                    {data.referralNote && (
                      <div className="staff-referral-patient-share">
                        <span className="section-label">
                          {t("PATIENT-FACING REFERRAL SLIP")}
                        </span>
                        <h3>
                          {data.referralNote.patientSharedAt
                            ? t("A slip has been shared with the patient")
                            : t("Review and share patient next steps")}
                        </h3>
                        {data.referralNote.patientSharedAt && (
                          <p className="staff-internal-note">
                            Shared{" "}
                            {new Date(
                              data.referralNote.patientSharedAt,
                            ).toLocaleString(localeTag(locale))}
                            . Saving changes to the staff handoff withdraws the
                            current patient slip until it is shared again.
                          </p>
                        )}
                        <label htmlFor="patientReferralInstructions">
                          {t("Clinician-approved instructions for the patient")}
                        </label>
                        <textarea
                          id="patientReferralInstructions"
                          value={patientInstructions}
                          onChange={(event) =>
                            setPatientInstructions(event.target.value)
                          }
                          minLength={5}
                          maxLength={1000}
                          placeholder="State the next steps the patient should follow. Do not include unverified AI advice."
                          required
                        />
                        <p className="staff-internal-note">
                          The patient slip includes the confirmed destination,
                          referral reason, case reference, and only the
                          instructions entered here. It excludes the AI
                          summary, timeline, warning flags, report list, and
                          internal assessment.
                        </p>
                        <button
                          className="button button-primary"
                          type="button"
                          onClick={shareReferralSlip}
                          disabled={
                            saving ||
                            !referralSaved ||
                            patientInstructions.trim().length < 5
                          }
                        >
                          {saving
                            ? "Sharing referral slip..."
                            : data.referralNote.patientSharedAt
                              ? t("Update and share patient slip")
                              : t("Approve and share patient slip")}
                        </button>
                      </div>
                    )}
                  </section>
                )}

                <details className="staff-case-history">
                  <summary>
                    {t("View conversation and timeline")} ({data.inputs.length} {t("patient messages")})
                  </summary>
                  <section className="staff-review-panel">
                    <span className="section-label">
                      {t("PATIENT-REPORTED INTAKE")}
                    </span>
                    <h2>{t("Conversation and timeline")}</h2>
                    <div className="staff-transcript">
                      {transcript.length ? (
                        transcript.map((message, index) => (
                          <article key={`${index}-${message.role}`}>
                            <span>
                              {message.role === "assistant"
                                ? t("AI INTAKE ASSISTANT")
                                : t("PATIENT")}
                            </span>
                            <p>{message.content}</p>
                          </article>
                        ))
                      ) : (
                        <p>{t("No intake messages have been submitted.")}</p>
                      )}
                    </div>
                    <details className="staff-input-timeline">
                      <summary>
                        {t("Saved patient text inputs")} ({data.inputs.length})
                      </summary>
                      {data.inputs.map((input, index) => (
                        <p key={`${input.createdAt}-${index}`}>
                          <time>
                            {new Date(input.createdAt).toLocaleString(
                              localeTag(locale),
                            )}
                          </time>
                          {input.mode === "DOCUMENT" && (
                            <strong>
                              {t("Report")}: {input.sourceName || t("Uploaded document")}
                              {"\n"}
                            </strong>
                          )}
                          {input.content}
                        </p>
                      ))}
                    </details>
                  </section>
                </details>

                <section className="staff-review-panel">
                  <span className="section-label">{t("REVIEW HISTORY")}</span>
                  <h2>{t("Recorded decisions")}</h2>
                  {data.decisions.length ? (
                    data.decisions.map((decision) => (
                      <article
                        className="staff-decision-row"
                        key={decision._id}
                      >
                        <span>
                          {t(decision.action)} ·{" "}
                                {translateStatus(locale, decision.priority)}
                        </span>
                        <strong>
                          {typeof decision.staffId === "object"
                            ? decision.staffId.name
                            : t("Care-team staff")}
                        </strong>
                        {decision.reason && <p>{decision.reason}</p>}
                        {decision.guidance && (
                          <small>{decision.guidance}</small>
                        )}
                        {decision.assignedToId && (
                          <small>
                            Assigned to:{" "}
                            {typeof decision.assignedToId === "object"
                              ? decision.assignedToId.name
                              : t("Care-team staff")}
                          </small>
                        )}
                        <time>
                          {new Date(decision.createdAt).toLocaleString(
                            localeTag(locale),
                          )}
                        </time>
                      </article>
                    ))
                  ) : (
                    <p>{t("No staff decisions have been recorded.")}</p>
                  )}
                  {!!data.auditTrail.length && (
                    <details className="staff-input-timeline">
                      <summary>{t("Audit events")} ({data.auditTrail.length})</summary>
                      {data.auditTrail.map((event, index) => (
                        <p key={`${event.timestamp}-${index}`}>
                          {new Date(event.timestamp).toLocaleString(
                            localeTag(locale),
                          )}{" "}
                          ·{" "}
                          {event.action.replaceAll("_", " ")}
                          {event.actorId &&
                            ` · by ${typeof event.actorId === "object" ? event.actorId.name : "care-team staff"}`}
                          {event.assignedToId &&
                            ` · assigned to ${typeof event.assignedToId === "object" ? event.assignedToId.name : "care-team staff"}`}
                          {event.toStatus
                            ? ` · ${event.fromStatus || ""} → ${event.toStatus}`
                            : ""}
                        </p>
                      ))}
                    </details>
                  )}
                </section>

                <section className="staff-review-panel staff-question-panel">
                  <span className="section-label">{t("FOLLOW-UP QUESTIONS")}</span>
                  <h2>{t("Questions for the patient")}</h2>
                  <p className="staff-question-guidance">
                    {t("AI suggestions need your approval. Questions you write are already approved, but neither type reaches the patient until you send the bundle.")}
                  </p>
                  <label htmlFor="questionDraft">{t("Create a question")}</label>
                  <textarea
                    id="questionDraft"
                    value={questionDraft}
                    onChange={(event) => setQuestionDraft(event.target.value)}
                    minLength={5}
                    maxLength={1000}
                    placeholder={t("Write a clear, focused question...")}
                  />
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={addQuestionDraft}
                    disabled={
                      questionDraft.trim().length < 5 ||
                      questionDrafts.length >= 10
                    }
                  >
                    {t("Add question")}
                  </button>
                  {!!questionDrafts.length && (
                    <>
                      <ol className="staff-question-drafts">
                        {questionDrafts.map((draft, index) => (
                          <li key={`${draft}-${index}`}>
                            <span>{draft}</span>
                            <button
                              className="text-link"
                              type="button"
                              onClick={() =>
                                setQuestionDrafts((current) =>
                                  current.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                )
                              }
                              aria-label={`${t("Remove question")} ${index + 1}`}
                            >
                              {t("Remove")}
                            </button>
                          </li>
                        ))}
                      </ol>
                      <button
                        className="button button-primary"
                        type="button"
                        onClick={saveQuestionDrafts}
                        disabled={saving}
                      >
                        {saving
                          ? t("Saving questions...")
                          : t("Save {count} questions for review").replace("{count}", String(questionDrafts.length))}
                      </button>
                    </>
                  )}
                  {data.questions.some((item) => item.status === "APPROVED") && (
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={sendApprovedQuestions}
                      disabled={
                        saving ||
                        data.questions.some((item) => item.status === "SENT")
                      }
                    >
                      {saving
                        ? t("Sending to patient...")
                        : t("Send {count} approved questions to patient").replace("{count}", String(data.questions.filter((item) => item.status === "APPROVED").length))}
                    </button>
                  )}
                  {data.questions.some((item) => item.status === "SENT") && (
                    <p className="staff-question-delivery-note" role="status">
                      {t("Follow-up sent. The patient can read and answer it in their case intake.")}
                    </p>
                  )}
                  {!!data.questions.length && (
                    <div className="staff-question-history">
                      <strong>{t("Question and delivery history")}</strong>
                      {data.questions.map((item) => {
                        const answer = data.answers.find(
                          (entry) => entry.questionId === item._id,
                        );
                        return (
                          <article
                            className="staff-decision-row"
                            key={item._id}
                          >
                            <span>
                              {t(item.source)} · {translateStatus(locale, item.status)}
                            </span>
                            <p>{item.question}</p>
                            {item.source === "AI" &&
                              item.status === "PENDING" && (
                                <div className="staff-question-actions">
                                  <button
                                    className="button button-secondary"
                                    type="button"
                                    onClick={() =>
                                      reviewQuestion(item._id, "APPROVE")
                                    }
                                    disabled={saving}
                                  >
                                    {t("Approve")}
                                  </button>
                                  <button
                                    className="button button-secondary"
                                    type="button"
                                    onClick={() =>
                                      reviewQuestion(item._id, "REJECT")
                                    }
                                    disabled={saving}
                                  >
                                    {t("Reject")}
                                  </button>
                                </div>
                              )}
                            {answer && (
                              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                                {answer.englishSummary && (
                                  <div style={{ borderLeft: "3px solid #19816f", background: "#f1faf7", borderRadius: "0 8px 8px 0", padding: "10px 12px" }}>
                                    <strong>{t("English summary for clinician")}</strong>
                                    <p style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", lineHeight: 1.55 }}>{answer.englishSummary}</p>
                                  </div>
                                )}
                                {!answer.englishSummary && (
                                  <small style={{ color: "#795b28" }}>
                                    {answer.englishSummaryStatus === "FAILED"
                                      ? t("English summary unavailable. The original patient response is preserved below.")
                                      : t("English summary pending. The original patient response is preserved below.")}
                                  </small>
                                )}
                                <div>
                                  <strong>{t("Original patient response")} ({answer.language === "odia" ? "Odia" : answer.language === "hindi" ? "Hindi" : "English"})</strong>
                                  <p style={{ whiteSpace: "pre-wrap", margin: "5px 0 0", lineHeight: 1.55 }}>{answer.answer}</p>
                                  <small>{answer.mode === "VOICE" ? t("Transcribed voice answer") : t("Text answer")}</small>
                                </div>
                                {item.status === "ANSWERED" && (
                                  <button
                                    className="button button-secondary"
                                    type="button"
                                    onClick={() => void reviewFollowUpAnswer(item._id)}
                                    disabled={saving}
                                  >
                                    {t("Mark answer reviewed")}
                                  </button>
                                )}
                              </div>
                            )}
                            <time>
                              {new Date(item.createdAt).toLocaleString(
                                localeTag(locale),
                              )}
                            </time>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <aside className="staff-review-sidebar">
                <section className="staff-review-panel">
                  <span className="section-label">{t("CASE OWNER")}</span>
                  <h2>
                    <UserRound size={17} /> {t("Assignment")}
                  </h2>
                  <p>
                    {typeof data.case.assignedStaffId === "object"
                      ? data.case.assignedStaffId.name
                      : data.case.assignedStaffId
                        ? t("Assigned clinician")
                        : t("Unassigned")}
                  </p>
                  {!data.case.assignedStaffId && (
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={claimCase}
                      disabled={saving}
                    >
                      {t("Claim case for me")}
                    </button>
                  )}
                  <small className="staff-internal-note">
                    {t("Case allocation is managed by your facility administrator.")}
                  </small>
                </section>

                <form
                  className="staff-review-panel staff-review-form"
                  onSubmit={submitReview}
                >
                  <span className="section-label">{t("CLINICIAN REVIEW")}</span>
                  <h2>
                    <ClipboardCheck size={17} /> {t("Record review")}
                  </h2>
                  <label htmlFor="reviewAction">{t("Decision action")}</label>
                  <select
                    id="reviewAction"
                    value={action}
                    onChange={(event) => {
                      setAction(event.target.value);
                      if (event.target.value === "COMPLETE_CASE") {
                        setStatus("COMPLETED");
                      }
                    }}
                  >
                    {decisionActions.map(([value, label]) => (
                      <option value={value} key={value}>
                        {t(label)}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="reviewStatus">{t("Case status")}</label>
                  <select
                    id="reviewStatus"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {!caseStatuses.includes(data.case.status) && (
                      <option value={data.case.status}>
                        {translateStatus(locale, data.case.status)}
                      </option>
                    )}
                    {caseStatuses.map((value) => (
                      <option value={value} key={value}>
                        {translateStatus(locale, value)}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="reviewPriority">{t("Queue priority")}</label>
                  <select
                    id="reviewPriority"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                  >
                    <option value="ROUTINE">{translateStatus(locale, "ROUTINE")}</option>
                    <option value="PRIORITY">{translateStatus(locale, "PRIORITY")}</option>
                    <option value="URGENT">{translateStatus(locale, "URGENT")}</option>
                  </select>
                  <label htmlFor="reviewGuidance">
                    {t("Patient-visible care-team guidance / next steps")}
                    {status === "COMPLETED" && ` (${t("required")})`}
                  </label>
                  <textarea
                    id="reviewGuidance"
                    value={guidance}
                    onChange={(event) => setGuidance(event.target.value)}
                    required={status === "COMPLETED"}
                    minLength={status === "COMPLETED" ? 3 : undefined}
                    maxLength={2000}
                  />
                  <p className="staff-internal-note">
                    {t("This guidance is shown to the patient in their case view.")}
                    {status === "COMPLETED" &&
                      ` ${t("Add clear next steps before completing this case.")}`}
                  </p>
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? t("Saving review...") : t("Save review")}
                  </button>
                  {reviewFeedback && (
                    <p
                      className={`staff-review-feedback staff-review-feedback-${reviewFeedback.type}`}
                      role={reviewFeedback.type === "error" ? "alert" : "status"}
                    >
                      {reviewFeedback.type === "success" ? (
                        <CheckCircle2 size={16} aria-hidden="true" />
                      ) : (
                        <AlertTriangle size={16} aria-hidden="true" />
                      )}
                      <span>{reviewFeedback.message}</span>
                    </p>
                  )}
                </form>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default StaffCaseDetailPage;
