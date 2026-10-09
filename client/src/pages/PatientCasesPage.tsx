import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, FileText, MessageCircleQuestion } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { AppHeader } from "@/components/AppHeader";
import { getPatientCopy,
localeTag, translate, translateStatus, useLocale } from "@/lib/i18n";

type PatientCase = {
  _id: string;
  caseNo: string;
  status: string;
  priority: string;
  intakeLanguage: string;
  retentionExpiresAt?: string;
  facilityId?: { name: string; location: string };
  hasUpdates?: boolean;
};

function PatientCasesPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingCaseId, setDeletingCaseId] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [error, setError] = useState("");
  const locale = useLocale();
  const t = (message: string) => translate(locale, message);
  const copy = getPatientCopy(locale);

  useEffect(() => {
    api
      .get("/patient/cases")
      .then((response) => setCases(response.data.data))
      .catch((requestError) =>
        setError(
          t(requestError.response?.data?.message || "Unable to load your cases."),
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const deleteCase = async (caseId: string) => {
    if (
      !      window.confirm(copy.deleteConfirm)
    ) {
      return;
    }
    setDeletingCaseId(caseId);
    setError("");
    try {
      await api.delete(`/patient/cases/${caseId}`);
      setCases((current) => current.filter((item) => item._id !== caseId));
    } catch (requestError: any) {
      setError(
        t(requestError.response?.data?.message || "Unable to delete this case."),
      );
    } finally {
      setDeletingCaseId("");
    }
  };

  const deleteAccount = async () => {
    if (window.prompt(copy.deleteAccountConfirm) !== "DELETE") return;
    setDeletingAccount(true);
    setError("");
    try {
      await api.delete("/patient/account");
      localStorage.removeItem("token");
      localStorage.removeItem("authUser");
      localStorage.removeItem("activeCase");
      navigate("/auth", { replace: true });
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          t("Unable to delete your account data."),
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <main className="patient-cases-page">
      <AppHeader />
      <div className="patient-cases-inner">
        <header className="patient-cases-heading">
          <div>
            <span className="auth-eyebrow">
              <span className="eyebrow-dot" /> {t("PATIENT WORKSPACE")}
            </span>
            <h1>{copy.casesTitle}</h1>
            <p>{copy.casesBody}</p>
          </div>
          <Link className="button button-primary" to="/patient/setup">
            {copy.startNewCase} <ArrowRight size={15} />
          </Link>
          <Link className="button button-secondary" to="/patient/follow-ups" style={{ marginLeft: 8 }}>
            <MessageCircleQuestion size={15} /> Follow-ups
          </Link>
        </header>

        {error && (
          <p className="dashboard-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="patient-cases-loading">{t("Loading your cases...")}</p>
        ) : cases.length ? (
          <div className="patient-case-list">
            {cases.map((item) => {
              const caseCopy = copy;
              return (
              <article className="patient-case-card" key={item._id}>
                <div className="patient-case-card-heading">
                  <div>
                    <span className="section-label">{item.caseNo}</span>
                    <h2>{item.facilityId?.name || t("Care facility")}</h2>
                    <p>{item.facilityId?.location || t("Location unavailable")}</p>
                  </div>
                  <div className="patient-case-status">
                    <span
                      className={`status-badge status-${item.status.toLowerCase()}`}
                    >
                      {translateStatus(locale, item.status)}
                    </span>
                    {item.hasUpdates && (
                      <span
                        className="case-update-dot"
                        aria-label="New case update"
                        title="New case update"
                      />
                    )}
                  </div>
                </div>
                {item.hasUpdates && (
                  <p className="patient-case-update" role="status">
                    {t("New update from your care team")}
                  </p>
                )}
                {item.priority === "URGENT" && (
                  <section
                    className="patient-priority-guidance patient-priority-urgent"
                    role="alert"
                  >
                    <AlertTriangle size={18} />
                    <div>
                      <strong>{caseCopy.urgentReviewTitle}</strong>
                      <p>{caseCopy.urgentReviewBody}</p>
                    </div>
                  </section>
                )}
                {item.priority === "PRIORITY" && (
                  <section
                    className="patient-priority-guidance"
                    role="status"
                  >
                    <AlertTriangle size={18} />
                    <div>
                      <strong>{caseCopy.priorityReviewTitle}</strong>
                      <p>{caseCopy.priorityReviewBody}</p>
                    </div>
                  </section>
                )}
                {item.status === "WAITING_FOR_PATIENT" && (
                  <p className="patient-case-question-prompt" role="status">
                    {caseCopy.answerQuestions}
                  </p>
                )}
                {item.status === "COMPLETED" && (
                  <p className="patient-case-completed-prompt" role="status">
                    {caseCopy.completedNotice}
                  </p>
                )}
                <div className="patient-case-meta">
                  <span>
                    {t("Priority")}<strong>{translateStatus(locale, item.priority)}</strong>
                  </span>
                  <span>
                    {t("Intake language")}<strong>{translateStatus(locale, item.intakeLanguage)}</strong>
                  </span>
                </div>
                {item.retentionExpiresAt && (
                  <p className="patient-case-retention">
                    {caseCopy.retention.replace(
                      "{date}",
                      new Date(item.retentionExpiresAt).toLocaleDateString(
                        localeTag(locale),
                      ),
                    )}
                  </p>
                )}
                <Link className="text-link" to={`/patient/intake/${item._id}`}>
                  {item.status === "WAITING_FOR_PATIENT"
                    ? caseCopy.answerQuestions
                    : caseCopy.openCase}{" "}
                  <ArrowRight size={15} />
                </Link>
                <button
                  className="patient-case-delete"
                  type="button"
                  onClick={() => void deleteCase(item._id)}
                  disabled={deletingCaseId === item._id}
                >
                  {deletingCaseId === item._id
                    ? t("Deleting case data...")
                    : caseCopy.deleteCase}
                </button>
              </article>
              );
            })}
          </div>
        ) : (
          <section className="patient-cases-empty">
            <FileText size={23} />
            <h2>{copy.noCases}</h2>
            <p>{copy.noCasesBody}</p>
            <Link className="button button-primary" to="/patient/setup">
              {copy.startIntake} <ArrowRight size={15} />
            </Link>
          </section>
        )}
      </div>
      <div className="patient-account-delete">
        <button
          type="button"
          onClick={() => void deleteAccount()}
          disabled={deletingAccount}
        >
          {deletingAccount ? t("Deleting account data...") : copy.deleteAccount}
        </button>
      </div>
    </main>
  );
}

export default PatientCasesPage;
