import { Bell, HeartPulse, LogOut, UserRound } from "lucide-react";
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

type AppNotification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  caseId: string;
  questionId?: string;
  readAt?: string | null;
  createdAt: string;
};

function NotificationsMenu() {
  const navigate = useNavigate();
  const locale = useLocale();
  const user = getUser();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    if (!user.role) return;
    setLoading(true);
    api.get("/notifications?limit=15")
      .then((response) => {
        setItems(response.data.data.items || []);
        setUnreadCount(response.data.data.unreadCount || 0);
      })
      .catch(() => setError(translate(locale, "Notifications are temporarily unavailable.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user.role]);

  const openNotification = async (item: AppNotification) => {
    try {
      if (!item.readAt) {
        await api.patch(`/notifications/${item._id}/read`, {});
        setItems((current) => current.map((notification) =>
          notification._id === item._id ? { ...notification, readAt: new Date().toISOString() } : notification,
        ));
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch {
      setError(translate(locale, "Could not mark notification as read."));
    }
    setOpen(false);
    if (user.role === "PATIENT" && item.questionId) {
      navigate(`/patient/follow-ups/${item.questionId}`);
    } else if (user.role === "PATIENT" && item.caseId) {
      navigate(`/patient/intake/${item.caseId}`);
    } else if (item.caseId) {
      navigate(`/staff/cases/${item.caseId}`);
    }
  };

  if (!user.role) return null;
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => { const next = !open; setOpen(next); if (next) load(); }}
        aria-label={translate(locale, "Notifications")}
        aria-expanded={open}
        style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, border: "1px solid #dce7ea", background: "#fff", color: "#1e5961", cursor: "pointer" }}
      >
        <Bell size={17} />
        {unreadCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, minWidth: 17, height: 17, padding: "0 3px", borderRadius: 99, background: "#c33f37", color: "#fff", fontSize: 10, display: "grid", placeItems: "center" }}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 48, width: "min(360px, calc(100vw - 28px))", maxHeight: 420, overflowY: "auto", background: "#fff", border: "1px solid #dce7ea", boxShadow: "0 16px 44px #12333a24", borderRadius: 14, zIndex: 50, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "4px 4px 10px", borderBottom: "1px solid #edf2f3" }}>
            <strong>{translate(locale, "Notifications")}</strong>
            <button type="button" onClick={load} aria-label={translate(locale, "Refresh notifications")} style={{ border: 0, background: "transparent", color: "#087e8b", cursor: "pointer" }}>↻</button>
          </div>
          {loading && <p style={{ padding: 10, color: "#607980", fontSize: 13 }}>Loading…</p>}
          {!!error && <p role="status" style={{ padding: 10, color: "#9b302b", fontSize: 13 }}>{error}</p>}
          {!loading && !items.length && <p style={{ padding: 10, color: "#607980", fontSize: 13 }}>{translate(locale, "You have no notifications.")}</p>}
          {items.map((item) => (
            <button key={item._id} type="button" onClick={() => void openNotification(item)} style={{ display: "block", width: "100%", textAlign: "left", padding: 11, border: 0, borderRadius: 10, marginTop: 5, background: item.readAt ? "#fff" : "#f0f8f9", cursor: "pointer", color: "#17313a" }}>
              <span style={{ display: "block", fontWeight: 750, fontSize: 13 }}>{item.title}</span>
              <span style={{ display: "block", color: "#59757d", fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>{item.message}</span>
              <span style={{ display: "block", color: "#7d9196", fontSize: 11, marginTop: 5 }}>{new Date(item.createdAt).toLocaleString(localeTag(locale))}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
        <NotificationsMenu />
        <ProfileMenu />
      </div>
    </header>
  );
}
