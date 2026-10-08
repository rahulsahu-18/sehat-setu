import { FormEvent, useEffect, useState } from "react";
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
  ["REFER_TO_SPECIALIST", "Refer to specialist"],
  ["ESCALATE", "Escalate"],
  ["COMPLETE_CASE", "Complete case"],
];
const caseStatuses = [
  "WAITING_FOR_REVIEW",
  "WAITING_FOR_PATIENT",
  "FINAL_REVIEW",
  "ACTIVE",
  "FOLLOW_UP",
  "REFERRED",
  "ESCALATED",
  "COMPLETED",
];

function StaffCaseDetailPage() {
  const { caseId } = useParams();
  const [data, setData] = useState<StaffCaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [action, setAction] = useState("CONTINUE_EVALUATION");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("ROUTINE");
  const [reason, setReason] = useState("");
  const [guidance, setGuidance] = useState("");
  const [questionDraft, setQuestionDraft] = useState("");
  const [questionDrafts, setQuestionDrafts] = useState<string[]>([]);
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
          requestError.response?.data?.message || "Unable to load this case.",
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
    try {
      await api.post(`/staff/cases/${caseId}/review`, {
        action,
        status,
        priority,
        reason,
        ...(guidance.trim() ? { guidance: guidance.trim() } : {}),
      });
      setReason("");
      setGuidance("");
      await loadCase();
      setSuccess("Review decision saved.");
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message || "Unable to save the review.",
      );
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
      setSuccess("Case claimed by you.");
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message || "Unable to claim this case.",
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
        decision === "APPROVE"
          ? "AI follow-up approved."
          : "AI follow-up rejected.",
      );
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          "Unable to review the question.",
      );
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
        `${response.data.data.sentCount} follow-up question(s) sent to the patient.`,
      );
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          "Unable to send follow-up questions.",
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
        "Staff referral handoff saved. Review it before preparing a patient slip.",
      );
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          "Unable to save the referral note.",
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
      setSuccess("Clinician-approved referral slip shared with the patient.");
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          "Unable to share the patient referral slip.",
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
      const response = await api.post(`/staff/cases/${caseId}/questions`, {
        questions: questionDrafts,
      });
      setQuestionDrafts([]);
      await loadCase();
      setSuccess(
        `${response.data.data.createdCount} clinician question(s) added to the bundle.`,
      );
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message || "Unable to add questions.",
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
          <ArrowLeft size={15} /> Back to queue
        </Link>
        {loading ? (
          <p className="staff-detail-loading">Loading case...</p>
        ) : !data ? (
          <p className="dashboard-error" role="alert">
            {error || "Case not found or access denied."}
          </p>
        ) : (
          <>
            <header className="staff-case-detail-header">
              <div>
                <span className="auth-eyebrow">
                  <span className="eyebrow-dot" /> CASE REVIEW /{" "}
                  {data.case.caseNo}
                </span>
                <h1>{data.case.patientId.name}</h1>
                <p>
                  {data.case.patientId.patientId || "Patient"} ·{" "}
                  {data.case.intakeLanguage} intake
                </p>
              </div>
              <div className="staff-case-state">
                <span>{data.case.status.replaceAll("_", " ")}</span>
                <strong>{data.case.priority} PRIORITY</strong>
              </div>
            </header>

            <FormMessage error={error} success={success} />

            {flags.length > 0 && (
              <section className="staff-emergency-warning" role="alert">
                <AlertTriangle size={19} />
                <div>
                  <strong>Possible emergency warning · Immediate review</strong>
                  {flags.map((flag) => (
                    <p key={flag.ruleId}>
                      {flag.reason} Mention: “{flag.reportedTerm}”.{" "}
                      {flag.instruction}
                    </p>
                  ))}
                  <small>
                    Rules are educational prototype rules and require qualified
                    clinical review before real-world use.
                  </small>
                </div>
              </section>
            )}

            <div className="staff-case-detail-grid">
              <div className="staff-case-main-column">
                <section className="staff-review-panel">
                  <span className="section-label">AI-GENERATED BRIEF</span>
                  <h2>Intake summary</h2>
                  <p>
                    {data.summary?.summary ||
                      "No AI summary has been saved yet."}
                  </p>
                  {!!data.summary?.missingInformation?.length && (
                    <div className="staff-missing-info">
                      <strong>Missing information to clarify</strong>
                      {data.summary.missingInformation.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  )}
                  {!!data.summary?.contradictions?.length && (
                    <div className="staff-missing-info">
                      <strong>Patient-reported conflicting details</strong>
                      {data.summary.contradictions.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  )}
                </section>

                {!!data.summary?.timeline?.length && (
                  <section className="staff-review-panel">
                    <span className="section-label">SOURCE-BASED TIMELINE</span>
                    <h2>Reported sequence of events</h2>
                    <p className="staff-internal-note">
                      AI-extracted from patient text and uploaded selectable-text
                      reports. Verify dates and events with the patient.
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
                    <span className="section-label">REFERRAL HANDOFF</span>
                    <h2>Referral summary · clinician review required</h2>
                    <p className="staff-internal-note">
                      Complete the destination and clinical question, then save
                      to create a persistent handoff snapshot for this case.
                    </p>
                    <dl>
                      <div>
                        <dt>Patient / case</dt>
                        <dd>
                          {data.referralNote?.patientName ||
                            data.case.patientId.name}{" "}
                          · {data.referralNote?.caseNo || data.case.caseNo}
                          {data.referralNote?.patientId &&
                            ` · ${data.referralNote.patientId}`}
                        </dd>
                      </div>
                      <div>
                        <dt>Current status / queue priority</dt>
                        <dd>
                          {(data.referralNote?.caseStatus || data.case.status)
                            .replaceAll("_", " ")}{" "}
                          · {data.referralNote?.priority || data.case.priority}
                        </dd>
                      </div>
                      <div>
                        <dt>Referring facility</dt>
                        <dd>
                          {data.referralNote
                            ? `${data.referralNote.referringFacility}${data.referralNote.referringFacilityLocation ? ` · ${data.referralNote.referringFacilityLocation}` : ""}`
                            : typeof data.case.facilityId === "object"
                              ? `${data.case.facilityId.name}${data.case.facilityId.location ? ` · ${data.case.facilityId.location}` : ""}`
                              : "Facility name unavailable"}
                        </dd>
                      </div>
                      <div>
                        <dt>Receiving facility / unit</dt>
                        <dd className="staff-referral-screen-only">
                          <input
                            id="referralDestination"
                            value={referralDestination}
                            onChange={(event) => {
                              setReferralDestination(event.target.value)
                              setReferralSaved(false);
                            }}
                            maxLength={200}
                            placeholder="Enter destination after confirming it"
                            required
                          />
                        </dd>
                        <dd className="staff-referral-print-only">
                          {data.referralNote?.receivingFacility || "Not entered"}
                        </dd>
                      </div>
                      <div>
                        <dt>Clinical question / reason for referral</dt>
                        <dd className="staff-referral-screen-only">
                          <textarea
                            id="referralQuestion"
                            value={referralQuestion}
                            onChange={(event) => {
                              setReferralQuestion(event.target.value)
                              setReferralSaved(false);
                            }}
                            maxLength={1000}
                            placeholder="Describe the specific question for the receiving clinician"
                            required
                          />
                        </dd>
                        <dd className="staff-referral-print-only">
                          {data.referralNote?.clinicalQuestion || "Not entered"}
                        </dd>
                      </div>
                      <div>
                        <dt>Patient-reported summary (AI draft)</dt>
                        <dd>
                          {data.referralNote?.patientSummary ||
                            "No summary recorded."}
                        </dd>
                      </div>
                      {!!data.referralNote?.timeline.length && (
                        <div>
                          <dt>Reported timeline (verify)</dt>
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
                          <dt>Uploaded report files (verify originals)</dt>
                          <dd>{data.referralNote.reportSources.join("\n")}</dd>
                        </div>
                      )}
                      {!!data.referralNote?.warningFlags.length && (
                        <div>
                          <dt>Prototype warning flags · verify immediately</dt>
                          <dd>{data.referralNote.warningFlags.join("\n")}</dd>
                        </div>
                      )}
                      {!!data.referralNote?.missingInformation.length && (
                        <div>
                          <dt>Information still to clarify</dt>
                          <dd>
                            {data.referralNote.missingInformation.join("\n")}
                          </dd>
                        </div>
                      )}
                      {!!data.referralNote?.contradictions.length && (
                        <div>
                          <dt>Reported contradictions</dt>
                          <dd>{data.referralNote.contradictions.join("\n")}</dd>
                        </div>
                      )}
                      {data.referralNote && (
                        <div>
                          <dt>Last saved</dt>
                          <dd>
                            {new Date(data.referralNote.updatedAt).toLocaleString()}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <p>
                      Non-diagnostic information handoff prepared from
                      patient-provided content. Confirm source documents,
                      values, units, identity, and destination before referral.
                      Do not use this draft as a substitute for clinical
                      assessment.
                    </p>
                    <button
                      className="button button-primary staff-referral-save"
                      type="button"
                      onClick={saveReferralNote}
                      disabled={saving}
                    >
                      {saving ? "Saving referral note..." : "Save referral note"}
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => window.print()}
                      disabled={!referralSaved || saving}
                    >
                      Print saved referral handoff
                    </button>
                    {data.referralNote && (
                      <div className="staff-referral-patient-share">
                        <span className="section-label">
                          PATIENT-FACING REFERRAL SLIP
                        </span>
                        <h3>
                          {data.referralNote.patientSharedAt
                            ? "A slip has been shared with the patient"
                            : "Review and share patient next steps"}
                        </h3>
                        {data.referralNote.patientSharedAt && (
                          <p className="staff-internal-note">
                            Shared{" "}
                            {new Date(
                              data.referralNote.patientSharedAt,
                            ).toLocaleString()}
                            . Saving changes to the staff handoff withdraws the
                            current patient slip until it is shared again.
                          </p>
                        )}
                        <label htmlFor="patientReferralInstructions">
                          Clinician-approved instructions for the patient
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
                              ? "Update and share patient slip"
                              : "Approve and share patient slip"}
                        </button>
                      </div>
                    )}
                  </section>
                )}

                <details className="staff-case-history">
                  <summary>
                    View conversation and timeline ({data.inputs.length} patient
                    messages)
                  </summary>
                  <section className="staff-review-panel">
                    <span className="section-label">
                      PATIENT-REPORTED INTAKE
                    </span>
                    <h2>Conversation and timeline</h2>
                    <div className="staff-transcript">
                      {transcript.length ? (
                        transcript.map((message, index) => (
                          <article key={`${index}-${message.role}`}>
                            <span>
                              {message.role === "assistant"
                                ? "AI INTAKE ASSISTANT"
                                : "PATIENT"}
                            </span>
                            <p>{message.content}</p>
                          </article>
                        ))
                      ) : (
                        <p>No intake messages have been submitted.</p>
                      )}
                    </div>
                    <details className="staff-input-timeline">
                      <summary>
                        Saved patient text inputs ({data.inputs.length})
                      </summary>
                      {data.inputs.map((input, index) => (
                        <p key={`${input.createdAt}-${index}`}>
                          <time>
                            {new Date(input.createdAt).toLocaleString()}
                          </time>
                          {input.mode === "DOCUMENT" && (
                            <strong>
                              Report: {input.sourceName || "Uploaded document"}
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
                  <span className="section-label">REVIEW HISTORY</span>
                  <h2>Recorded decisions</h2>
                  {data.decisions.length ? (
                    data.decisions.map((decision) => (
                      <article
                        className="staff-decision-row"
                        key={decision._id}
                      >
                        <span>
                          {decision.action.replaceAll("_", " ")} ·{" "}
                          {decision.priority}
                        </span>
                        <strong>
                          {typeof decision.staffId === "object"
                            ? decision.staffId.name
                            : "Care-team staff"}
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
                              : "Care-team staff"}
                          </small>
                        )}
                        <time>
                          {new Date(decision.createdAt).toLocaleString()}
                        </time>
                      </article>
                    ))
                  ) : (
                    <p>No staff decisions have been recorded.</p>
                  )}
                  {!!data.auditTrail.length && (
                    <details className="staff-input-timeline">
                      <summary>Audit events ({data.auditTrail.length})</summary>
                      {data.auditTrail.map((event, index) => (
                        <p key={`${event.timestamp}-${index}`}>
                          {new Date(event.timestamp).toLocaleString()} ·{" "}
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
                  <span className="section-label">FOLLOW-UP QUESTIONS</span>
                  <h2>Questions for the patient</h2>
                  <p className="staff-question-guidance">
                    AI suggestions need your approval. Questions you write are
                    already approved, but neither type reaches the patient
                    until you send the bundle.
                  </p>
                  <label htmlFor="questionDraft">Create a question</label>
                  <textarea
                    id="questionDraft"
                    value={questionDraft}
                    onChange={(event) => setQuestionDraft(event.target.value)}
                    minLength={5}
                    maxLength={1000}
                    placeholder="Write a clear, focused question..."
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
                    Add question
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
                              aria-label={`Remove question ${index + 1}`}
                            >
                              Remove
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
                          ? "Saving questions..."
                          : `Save ${questionDrafts.length} question${questionDrafts.length === 1 ? "" : "s"} for review`}
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
                        ? "Sending to patient..."
                        : `Send ${data.questions.filter((item) => item.status === "APPROVED").length} approved question${data.questions.filter((item) => item.status === "APPROVED").length === 1 ? "" : "s"} to patient`}
                    </button>
                  )}
                  {data.questions.some((item) => item.status === "SENT") && (
                    <p className="staff-question-delivery-note" role="status">
                      Follow-up sent. The patient can read and answer it in
                      their case intake.
                    </p>
                  )}
                  {!!data.questions.length && (
                    <div className="staff-question-history">
                      <strong>Question and delivery history</strong>
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
                              {item.source} · {item.status.replaceAll("_", " ")}
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
                                    Approve
                                  </button>
                                  <button
                                    className="button button-secondary"
                                    type="button"
                                    onClick={() =>
                                      reviewQuestion(item._id, "REJECT")
                                    }
                                    disabled={saving}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            {answer && (
                              <small>Patient response: {answer.answer}</small>
                            )}
                            <time>
                              {new Date(item.createdAt).toLocaleString()}
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
                  <span className="section-label">CASE OWNER</span>
                  <h2>
                    <UserRound size={17} /> Assignment
                  </h2>
                  <p>
                    {typeof data.case.assignedStaffId === "object"
                      ? data.case.assignedStaffId.name
                      : data.case.assignedStaffId
                        ? "Assigned clinician"
                        : "Unassigned"}
                  </p>
                  {!data.case.assignedStaffId && (
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={claimCase}
                      disabled={saving}
                    >
                      Claim case for me
                    </button>
                  )}
                  <small className="staff-internal-note">
                    Case allocation is managed by your facility administrator.
                  </small>
                </section>

                <form
                  className="staff-review-panel staff-review-form"
                  onSubmit={submitReview}
                >
                  <span className="section-label">CLINICIAN REVIEW</span>
                  <h2>
                    <ClipboardCheck size={17} /> Record assessment
                  </h2>
                  <label htmlFor="reviewReason">Assessment / reason</label>
                  <textarea
                    id="reviewReason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    required
                    minLength={3}
                    maxLength={2000}
                  />
                  <label htmlFor="reviewAction">Decision action</label>
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
                        {label}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="reviewStatus">Case status</label>
                  <select
                    id="reviewStatus"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {!caseStatuses.includes(data.case.status) && (
                      <option value={data.case.status}>
                        {data.case.status.replaceAll("_", " ")}
                      </option>
                    )}
                    {caseStatuses.map((value) => (
                      <option value={value} key={value}>
                        {value.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="reviewPriority">Queue priority</label>
                  <select
                    id="reviewPriority"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="PRIORITY">Priority</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  <label htmlFor="reviewGuidance">
                    Patient-visible care-team guidance / next steps
                    {status === "COMPLETED" && " (required)"}
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
                    This guidance is shown to the patient in their case view.
                    Keep internal assessment notes in the assessment field.
                    {status === "COMPLETED" &&
                      " Add clear next steps before completing this case."}
                  </p>
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Saving review..." : "Save review"}
                  </button>
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
