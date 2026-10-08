import { HeartPulse, LogOut, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/services/api";
import { LanguageSelector } from "@/components/LanguageSelector";
import { translate, useLocale } from "@/lib/i18n";

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
  const locale = useLocale();
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
    user.patientId || user.email || user.phoneNo || translate(locale, "Authenticated user");
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
        aria-label={translate(locale, "Open profile menu")}
      >
        <span className="profile-avatar">
          <UserRound size={16} />
          {hasPatientUpdates && (
            <i className="profile-update-dot" aria-label={translate(locale, "New case update")} />
          )}
        </span>
        <span className="profile-trigger-copy">
          <strong>{user.name || translate(locale, role.toLowerCase())}</strong>
          <small>{translate(locale, role.toLowerCase())}</small>
        </span>
      </button>
      {open && (
        <div className="profile-menu">
          <div className="profile-menu-heading">
            <span className="profile-avatar">
              <UserRound size={16} />
            </span>
            <div>
              <strong>{user.name || translate(locale, "Account")}</strong>
              <small>{translate(locale, role.toLowerCase())}</small>
            </div>
          </div>
          <div className="profile-detail">
            <span>{user.patientId ? translate(locale, "Patient ID") : translate(locale, "Account")}</span>
            <strong>{identifier}</strong>
          </div>
          <Link
            className="profile-dashboard-link"
            to={dashboardPath}
            onClick={() => setOpen(false)}
          >
            {translate(locale, user.role === "PATIENT" ? "My Cases" : "Open dashboard")}
          </Link>
          <button className="profile-logout" onClick={logout}>
            <LogOut size={15} /> {translate(locale, "Log out")}
          </button>
        </div>
      )}
    </div>
  );
}

export function AppHeader({ staff = false }: { staff?: boolean }) {
  const locale = useLocale();
  return (
    <header className={`app-header ${staff ? "app-header-staff" : ""}`}>
      <Link
        className="auth-brand"
        to="/"
        aria-label={translate(locale, "Go to SehatSetu AI homepage")}
      >
        <span className="logo-mark">
          <HeartPulse size={17} />
        </span>
        <span>
          SehatSetu <b>AI</b>
        </span>
      </Link>
      <div className="app-header-actions">
        <LanguageSelector />
        <ProfileMenu />
      </div>
    </header>
  );
}
