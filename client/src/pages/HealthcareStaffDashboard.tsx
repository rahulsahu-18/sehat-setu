import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import api from "@/services/api";

type CareCase = {
  _id: string;
  caseNo: string;
  status: string;
  priority: string;
  intakeLanguage: string;
  createdAt?: string;
  assignedStaffId?: { name: string; role: string } | string | null;
  patientId: { name: string; patientId?: string } | null;
};

type QueueFilter = "ALL" | "REVIEW" | "WAITING_FOR_PATIENT" | "IN_PROGRESS";

const queueFilters: { value: QueueFilter; label: string }[] = [
  { value: "ALL", label: "All cases" },
  { value: "REVIEW", label: "Needs review" },
  { value: "WAITING_FOR_PATIENT", label: "Waiting for patient" },
  { value: "IN_PROGRESS", label: "In progress" },
];

const reviewStatuses = new Set([
  "NEW",
  "WAITING_FOR_REVIEW",
  "FINAL_REVIEW",
  "ESCALATED",
]);
const incomingStatuses = new Set(["NEW", "AI_PROCESSING", "WAITING_FOR_REVIEW"]);

function readRole() {
  try {
    const user = JSON.parse(localStorage.getItem("authUser") || "{}");
    return user.role === "DOCTOR" || user.role === "NURSE"
      ? user.role
      : "HEALTHCARE STAFF";
  } catch {
    return "HEALTHCARE STAFF";
  }
}

function getReviewCount(cases: CareCase[]) {
  return cases.filter((item) => reviewStatuses.has(item.status)).length;
}

function matchesFilter(item: CareCase, filter: QueueFilter) {
  switch (filter) {
    case "REVIEW":
      return reviewStatuses.has(item.status);
    case "WAITING_FOR_PATIENT":
      return item.status === "WAITING_FOR_PATIENT";
    case "IN_PROGRESS":
      return ["AI_PROCESSING", "ACTIVE", "FOLLOW_UP", "REFERRED"].includes(
        item.status,
      );
    default:
      return true;
  }
}

function queueRank(item: CareCase) {
  if (item.priority === "URGENT" || item.status === "ESCALATED") return 0;
  if (incomingStatuses.has(item.status)) return 1;
  return item.priority === "PRIORITY" ? 2 : 3;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

function HealthcareStaffDashboard() {
  const role = readRole();
  const [cases, setCases] = useState<CareCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<QueueFilter>("ALL");
  const [search, setSearch] = useState("");

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/staff/cases");
      setCases(response.data.data);
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message || "Unable to load care queue.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  const visibleCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    return cases
      .filter((item) => matchesFilter(item, filter))
      .filter((item) => {
        if (!term) return true;
        return [
          item.caseNo,
          item.patientId?.name,
          item.patientId?.patientId,
          item.status,
          item.priority,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(term));
      })
      .sort((left, right) => {
        const queueOrder = queueRank(left) - queueRank(right);
        if (queueOrder) return queueOrder;
        const reviewOrder =
          Number(!reviewStatuses.has(left.status)) -
          Number(!reviewStatuses.has(right.status));
        if (reviewOrder) return reviewOrder;
        return (
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime()
        );
      });
  }, [cases, filter, search]);

  const waitingCount = cases.filter(
    (item) => item.status === "WAITING_FOR_PATIENT",
  ).length;
  const urgentCount = cases.filter(
    (item) =>
      item.priority === "URGENT" ||
      item.status === "ESCALATED",
  ).length;

  return (
    <main className="staff-dashboard-page">
      <AppHeader staff />
      <div className="staff-dashboard-inner">
        <section className="staff-dashboard-hero">
          <div>
            <span className="auth-eyebrow">
              <span className="eyebrow-dot" /> CARE TEAM WORKSPACE
            </span>
            <h1>{role.toLowerCase()} dashboard</h1>
            <p>
              Review patient-provided information, follow up, and record
              decisions for qualified care-team review.
            </p>
          </div>
          <div className="staff-role-mark">
            <Stethoscope size={24} />
            <span>{role}</span>
          </div>
        </section>

        <section className="staff-metrics" aria-label="Care queue overview">
          <article>
            <span>
              <ClipboardList size={15} /> ACTIVE CASES
            </span>
            <strong>{loading ? "..." : cases.length}</strong>
            <small>Assigned to you or unassigned</small>
          </article>
          <article className={urgentCount ? "staff-metric-alert" : ""}>
            <span>
              <AlertTriangle size={15} /> PRIORITY ATTENTION
            </span>
            <strong>{loading ? "..." : urgentCount}</strong>
            <small>Review escalated and urgent cases first</small>
          </article>
          <article>
            <span>
              <Clock3 size={15} /> AWAITING PATIENT
            </span>
            <strong>{loading ? "..." : waitingCount}</strong>
            <small>Follow-up questions have been sent</small>
          </article>
        </section>

        <section className="staff-queue-section">
          <div className="staff-queue-heading">
            <div>
              <span className="section-label">FACILITY CARE QUEUE</span>
              <h2>Cases for your review</h2>
              <p>
                AI summaries and risk signals support review; they are not a
                diagnosis or a substitute for clinical judgment.
              </p>
            </div>
            <button
              className="button button-secondary staff-refresh-button"
              type="button"
              onClick={() => void loadCases()}
              disabled={loading}
            >
              <Activity size={15} />
              {loading ? "Refreshing..." : "Refresh queue"}
            </button>
          </div>

          <div className="staff-queue-controls">
            <div className="staff-queue-filters" aria-label="Filter cases">
              {queueFilters.map((item) => (
                <button
                  className={filter === item.value ? "is-active" : ""}
                  type="button"
                  key={item.value}
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                  {item.value === "REVIEW" && !loading && (
                    <span>{getReviewCount(cases)}</span>
                  )}
                </button>
              ))}
            </div>
            <label className="staff-queue-search">
              <Search size={16} />
              <span className="sr-only">Search cases</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patient or case ID"
              />
            </label>
          </div>

          {error && (
            <div className="dashboard-error" role="alert">
              <p>{error}</p>
              <button
                className="text-link"
                type="button"
                onClick={() => void loadCases()}
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <p className="staff-queue-message" role="status">
              Loading cases for your facility...
            </p>
          ) : visibleCases.length ? (
            <div className="staff-case-grid">
              {visibleCases.map((item) => (
                <article
                  className={`staff-case-card ${item.priority === "URGENT" || item.status === "ESCALATED" ? "staff-case-card-urgent" : ""}`}
                  key={item._id}
                >
                  <div className="staff-case-card-top">
                    <div>
                      <span className="application-role">{item.caseNo}</span>
                      <h3>{item.patientId?.name || "Patient"}</h3>
                      {item.patientId?.patientId && (
                        <small>{item.patientId.patientId}</small>
                      )}
                    </div>
                    <span className={`staff-priority priority-${item.priority.toLowerCase()}`}>
                      {item.priority.toLowerCase()}
                    </span>
                  </div>
                  <div className="staff-case-tags">
                    <span
                      className={`staff-status status-${item.status.toLowerCase()}`}
                    >
                      {item.status === "ESCALATED" && (
                        <AlertTriangle size={13} />
                      )}
                      {statusLabel(item.status)}
                    </span>
                    <span>{item.intakeLanguage} intake</span>
                  </div>
                  <p className="staff-case-next-step">
                    {item.status === "WAITING_FOR_PATIENT"
                      ? "Waiting for a patient response to sent follow-up questions."
                      : item.status === "ESCALATED"
                        ? "Escalated for prompt qualified review."
                        : reviewStatuses.has(item.status)
                          ? "Review the patient intake and record a staff assessment."
                          : "Open the case to review its current progress."}
                  </p>
                  <div className="staff-case-card-footer">
                    <span>
                      {item.assignedStaffId
                        ? `Assigned to ${typeof item.assignedStaffId === "object" ? item.assignedStaffId.name : "you"}`
                        : "Available to claim"}
                    </span>
                    <Link
                      className="text-link"
                      to={`/staff/cases/${item._id}`}
                    >
                      Review case <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : cases.length ? (
            <section className="staff-queue-message">
              <CheckCircle2 size={22} />
              <h3>No cases match this view</h3>
              <p>Change the filter or search term to see other cases.</p>
            </section>
          ) : (
            <section className="staff-empty-state">
              <div className="staff-empty-icon">
                <Users size={24} />
              </div>
              <span className="section-label">CLINICAL QUEUE</span>
              <h2>Your care queue is clear.</h2>
              <p>
                Cases submitted to your facility will appear here. Review
                synthetic demo cases only and keep a qualified human in the
                decision loop.
              </p>
              <div className="staff-secure">
                <ShieldCheck size={15} />
                Human review remains part of every decision
              </div>
            </section>
          )}
        </section>

        <aside className="staff-dashboard-disclaimer">
          <ShieldCheck size={17} />
          <p>
            Educational triage-support prototype. AI-generated summaries and
            flags are advisory only, may be incomplete, and must be reviewed by
            qualified staff. No diagnosis or treatment is provided.
          </p>
        </aside>
      </div>
    </main>
  );
}

export default HealthcareStaffDashboard;
