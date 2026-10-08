import React, { useEffect, useState } from "react";
import {
  Check,
  Clock3,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import api from "@/services/api";
import { AppHeader } from "@/components/AppHeader";
import { translate, translateStatus, useLocale } from "@/lib/i18n";

type Application = {
  _id: string;
  name: string;
  email?: string;
  phoneNo: string;
  role: "DOCTOR" | "NURSE";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  facilityId: {
    name: string;
    type: string;
    location: string;
  };
};

type AssignmentCase = {
  _id: string;
  caseNo: string;
  status: string;
  patientId: { name: string; patientId?: string };
  assignedStaffId?: { _id: string; name: string; role: string } | string;
};
type AssignableStaff = { id: string; name: string; role: string };

function FacilityAdminDashboard() {
  const locale = useLocale();
  const t = (message: string) => translate(locale, message);
  const [applications, setApplications] = useState<Application[]>([]);
  const [assignmentCases, setAssignmentCases] = useState<AssignmentCase[]>([]);
  const [team, setTeam] = useState<AssignableStaff[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<
    Record<string, string>
  >({});
  const [assignmentLoading, setAssignmentLoading] = useState(true);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/staff/applications");

      setApplications(response.data.data);
    } catch (error: any) {
      setError(t(error.response?.data?.message || "Failed to load applications"));
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentQueue = async () => {
    try {
      setAssignmentLoading(true);
      const response = await api.get("/staff/facility/case-assignments");
      const data = response.data.data;
      setAssignmentCases(data.cases);
      setTeam(data.team);
      setSelectedAssignees(
        Object.fromEntries(
          data.cases.map((item: AssignmentCase) => [
            item._id,
            typeof item.assignedStaffId === "object"
              ? item.assignedStaffId._id
              : item.assignedStaffId || "",
          ]),
        ),
      );
    } catch (requestError: any) {
      setError(
        t(requestError.response?.data?.message || "Failed to load case assignments"),
      );
    } finally {
      setAssignmentLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchAssignmentQueue();
  }, []);

  const assignCase = async (caseId: string) => {
    const assignedToId = selectedAssignees[caseId];
    if (!assignedToId) return;
    try {
      setActionId(caseId);
      setError("");
      await api.patch(`/staff/facility/cases/${caseId}/assignment`, {
        assignedToId,
      });
      await fetchAssignmentQueue();
    } catch (requestError: any) {
      setError(
        t(requestError.response?.data?.message || "Failed to assign this case"),
      );
    } finally {
      setActionId("");
    }
  };

  const acceptApplication = async (id: string) => {
    try {
      setActionId(id);
      await api.patch(`/staff/applications/${id}/accept`);

      await fetchApplications();
    } catch (error: any) {
      setError(t(error.response?.data?.message || "Failed to accept application"));
    } finally {
      setActionId("");
    }
  };

  const rejectApplication = async (id: string) => {
    try {
      setActionId(id);
      await api.patch(`/staff/applications/${id}/reject`);

      await fetchApplications();
    } catch (error: any) {
      setError(t(error.response?.data?.message || "Failed to reject application"));
    } finally {
      setActionId("");
    }
  };

  const pendingCount = applications.filter(
    (application) => application.status === "PENDING",
  ).length;
  const acceptedCount = applications.filter(
    (application) => application.status === "ACCEPTED",
  ).length;

  const signOut = () => {
    localStorage.removeItem("token");
    window.location.assign("/auth");
  };

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-inner">
          <div className="dashboard-loading">
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <AppHeader />
      <div className="dashboard-inner">
        <header className="dashboard-header">
          <div>
            <span className="section-label">{t("FACILITY WORKSPACE / ADMIN")}</span>
            <h1>{t("Staff applications")}</h1>
            <p>
              {t("Review and approve the people joining your connected care team.")}
            </p>
          </div>
          <div className="dashboard-header-actions">
            <button
              className="dashboard-icon-button"
              onClick={fetchApplications}
              title={t("Refresh applications")}
              aria-label={t("Refresh applications")}
            >
              <RefreshCw size={16} />
            </button>
            <button className="dashboard-signout" onClick={signOut}>
              <LogOut size={15} /> {t("Sign out")}
            </button>
          </div>
        </header>

        {error && (
          <p className="dashboard-error" role="alert">
            {error}
          </p>
        )}

        <div className="dashboard-metrics" aria-label={t("Application summary")}>
          <div>
            <span>
              <Clock3 size={15} /> {t("NEEDS REVIEW")}
            </span>
            <strong>{pendingCount}</strong>
          </div>
          <div>
            <span>
              <Check size={15} /> {t("APPROVED")}
            </span>
            <strong>{acceptedCount}</strong>
          </div>
          <div>
            <span>
              <Users size={15} /> {t("TOTAL APPLICATIONS")}
            </span>
            <strong>{applications.length}</strong>
          </div>
        </div>

        <section className="facility-assignment-section">
          <div className="dashboard-section-heading">
            <div>
              <span className="section-label">{t("CASE ALLOCATION")}</span>
              <h2>{t("Assign cases to care staff")}</h2>
            </div>
            <span className="dashboard-secure">
              {t("Facility administrator only")}
            </span>
          </div>
          {assignmentLoading ? (
            <p>{t("Loading facility cases...")}</p>
          ) : assignmentCases.length ? (
            <div className="facility-assignment-list">
              {assignmentCases.map((item) => (
                <article className="facility-assignment-row" key={item._id}>
                  <div>
                    <span className="application-role">{item.caseNo}</span>
                    <strong>{item.patientId.name}</strong>
                    <small>{translateStatus(locale, item.status)}</small>
                  </div>
                  <select
                    aria-label={t(`Assign ${item.caseNo} to staff`)}
                    value={selectedAssignees[item._id] || ""}
                    onChange={(event) =>
                      setSelectedAssignees((current) => ({
                        ...current,
                        [item._id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">{t("Choose doctor or nurse")}</option>
                    {team.map((member) => (
                      <option value={member.id} key={member.id}>
                        {member.name} · {t(member.role)}
                      </option>
                    ))}
                  </select>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => assignCase(item._id)}
                    disabled={
                      actionId === item._id || !selectedAssignees[item._id]
                    }
                  >
                    {actionId === item._id ? t("Saving...") : t("Assign case")}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p>{t("No open cases need allocation.")}</p>
          )}
        </section>

        <div className="dashboard-section-heading">
          <div>
            <span className="section-label">{t("APPLICATION QUEUE")}</span>
            <h2>{t("Pending and recent applications")}</h2>
          </div>
          <span className="dashboard-secure">
            <ShieldCheck size={15} /> {t("Admin protected")}
          </span>
        </div>

        {applications.length === 0 ? (
          <p>{t("No applications found.")}</p>
        ) : (
          <div className="application-list">
            {applications.map((application) => (
              <div className="application-card" key={application._id}>
                <div className="application-card-top">
                  <div>
                    <span className="application-role">{t(application.role)}</span>
                    <h3>{application.name}</h3>
                  </div>
                  <span
                    className={`status-badge status-${application.status.toLowerCase()}`}
                  >
                    {translateStatus(locale, application.status)}
                  </span>
                </div>
                <div className="application-details">
                  <span>{application.email || t("No email provided")}</span>
                  <span>{application.phoneNo}</span>
                </div>
                {application.status === "PENDING" && (
                  <div className="application-actions">
                    <button
                      disabled={actionId === application._id}
                      onClick={() => acceptApplication(application._id)}
                    >
                      <Check size={14} />{" "}
                      {actionId === application._id
                        ? t("Updating...")
                        : t("Accept application")}
                    </button>
                    <button
                      disabled={actionId === application._id}
                      onClick={() => rejectApplication(application._id)}
                    >
                      <X size={14} /> {t("Reject")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default FacilityAdminDashboard;
