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
      setError(error.response?.data?.message || "Failed to load applications");
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
        requestError.response?.data?.message ||
          "Failed to load case assignments",
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
        requestError.response?.data?.message || "Failed to assign this case",
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
      setError(error.response?.data?.message || "Failed to accept application");
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
      setError(error.response?.data?.message || "Failed to reject application");
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
            <span className="section-label">FACILITY WORKSPACE / ADMIN</span>
            <h1>Staff applications</h1>
            <p>
              Review and approve the people joining your connected care team.
            </p>
          </div>
          <div className="dashboard-header-actions">
            <button
              className="dashboard-icon-button"
              onClick={fetchApplications}
              title="Refresh applications"
              aria-label="Refresh applications"
            >
              <RefreshCw size={16} />
            </button>
            <button className="dashboard-signout" onClick={signOut}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </header>

        {error && (
          <p className="dashboard-error" role="alert">
            {error}
          </p>
        )}

        <div className="dashboard-metrics" aria-label="Application summary">
          <div>
            <span>
              <Clock3 size={15} /> NEEDS REVIEW
            </span>
            <strong>{pendingCount}</strong>
          </div>
          <div>
            <span>
              <Check size={15} /> APPROVED
            </span>
            <strong>{acceptedCount}</strong>
          </div>
          <div>
            <span>
              <Users size={15} /> TOTAL APPLICATIONS
            </span>
            <strong>{applications.length}</strong>
          </div>
        </div>

        <section className="facility-assignment-section">
          <div className="dashboard-section-heading">
            <div>
              <span className="section-label">CASE ALLOCATION</span>
              <h2>Assign cases to care staff</h2>
            </div>
            <span className="dashboard-secure">
              Facility administrator only
            </span>
          </div>
          {assignmentLoading ? (
            <p>Loading facility cases...</p>
          ) : assignmentCases.length ? (
            <div className="facility-assignment-list">
              {assignmentCases.map((item) => (
                <article className="facility-assignment-row" key={item._id}>
                  <div>
                    <span className="application-role">{item.caseNo}</span>
                    <strong>{item.patientId.name}</strong>
                    <small>{item.status.replaceAll("_", " ")}</small>
                  </div>
                  <select
                    aria-label={`Assign ${item.caseNo} to staff`}
                    value={selectedAssignees[item._id] || ""}
                    onChange={(event) =>
                      setSelectedAssignees((current) => ({
                        ...current,
                        [item._id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Choose doctor or nurse</option>
                    {team.map((member) => (
                      <option value={member.id} key={member.id}>
                        {member.name} · {member.role}
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
                    {actionId === item._id ? "Saving..." : "Assign case"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p>No open cases need allocation.</p>
          )}
        </section>

        <div className="dashboard-section-heading">
          <div>
            <span className="section-label">APPLICATION QUEUE</span>
            <h2>Pending and recent applications</h2>
          </div>
          <span className="dashboard-secure">
            <ShieldCheck size={15} /> Admin protected
          </span>
        </div>

        {applications.length === 0 ? (
          <p>No applications found.</p>
        ) : (
          <div className="application-list">
            {applications.map((application) => (
              <div className="application-card" key={application._id}>
                <div className="application-card-top">
                  <div>
                    <span className="application-role">{application.role}</span>
                    <h3>{application.name}</h3>
                  </div>
                  <span
                    className={`status-badge status-${application.status.toLowerCase()}`}
                  >
                    {application.status}
                  </span>
                </div>
                <div className="application-details">
                  <span>{application.email || "No email provided"}</span>
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
                        ? "Updating..."
                        : "Accept application"}
                    </button>
                    <button
                      disabled={actionId === application._id}
                      onClick={() => rejectApplication(application._id)}
                    >
                      <X size={14} /> Reject
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
