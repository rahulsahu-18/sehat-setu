import { HeartPulse, LogOut, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/services/api";

type AuthUser = {
  name?: string;
  email?: string;
  phoneNo?: string;
  patientId?: string;
  role?: string;
};

function getUser(): AuthUser {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}");
  } catch {
    return {};
  }
}

export function ProfileMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hasPatientUpdates, setHasPatientUpdates] = useState(false);
  const user = getUser();
  const role =
    user.role === "DOCTOR" || user.role === "NURSE"
      ? user.role
      : user.role === "PATIENT"
        ? "PATIENT"
        : "FACILITY ADMIN";
  const identifier =
    user.patientId || user.email || user.phoneNo || "Authenticated user";
  const dashboardPath =
    user.role === "PATIENT"
      ? "/patient/cases"
      : user.role === "FACILITY_ADMIN"
        ? "/facility/dashboard"
        : "/staff/dashboard";

  useEffect(() => {
    if (user.role !== "PATIENT") return;
    api
      .get("/patient/cases")
      .then((response) =>
        setHasPatientUpdates(
          response.data.data.some(
            (item: { hasUpdates?: boolean }) => item.hasUpdates,
          ),
        ),
      )
      .catch(() => setHasPatientUpdates(false));
  }, [user.role]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authUser");
    localStorage.removeItem("activeCase");
    navigate("/auth", { replace: true });
  };

  return (
    <div className="profile-wrap">
      <button
        className="profile-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <span className="profile-avatar">
          <UserRound size={16} />
          {hasPatientUpdates && (
            <i className="profile-update-dot" aria-label="New case update" />
          )}
        </span>
        <span className="profile-trigger-copy">
          <strong>{user.name || role.toLowerCase()}</strong>
          <small>{role}</small>
        </span>
      </button>
      {open && (
        <div className="profile-menu">
          <div className="profile-menu-heading">
            <span className="profile-avatar">
              <UserRound size={16} />
            </span>
            <div>
              <strong>{user.name || "Account"}</strong>
              <small>{role}</small>
            </div>
          </div>
          <div className="profile-detail">
            <span>{user.patientId ? "Patient ID" : "Account"}</span>
            <strong>{identifier}</strong>
          </div>
          <Link
            className="profile-dashboard-link"
            to={dashboardPath}
            onClick={() => setOpen(false)}
          >
            {user.role === "PATIENT" ? "My Cases" : "Open dashboard"}
          </Link>
          <button className="profile-logout" onClick={logout}>
            <LogOut size={15} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppHeader({ staff = false }: { staff?: boolean }) {
  return (
    <header className={`app-header ${staff ? "app-header-staff" : ""}`}>
      <Link
        className="auth-brand"
        to="/"
        aria-label="Go to SehatSetu AI homepage"
      >
        <span className="logo-mark">
          <HeartPulse size={17} />
        </span>
        <span>
          SehatSetu <b>AI</b>
        </span>
      </Link>
      <ProfileMenu />
    </header>
  );
}
