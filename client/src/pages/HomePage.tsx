import { useEffect, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Building2,
  Check,
  ChevronDown,
  FileText,
  HeartPulse,
  Languages,
  Menu,
  Mic,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { ProfileMenu } from "@/components/AppHeader";
import {
  getCopy,
  localeFromPath,
  localeLabels,
  locales,
  setLocale,
  translate,
  type Locale,
} from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const icons = [Building2, HeartPulse, Sparkles, ShieldCheck, Stethoscope];
const capabilityIcons = [Mic, FileText, ScanLine, Languages, Zap, FileText];
const storyIcons = [Mic, FileText, ShieldCheck];

function Logo() {
  return (
    <Link className="logo" to="/" aria-label="SehatSetu AI home">
      <span className="logo-mark">
        <HeartPulse size={17} strokeWidth={2.2} />
      </span>
      <span>
        SehatSetu <b>AI</b>
      </span>
    </Link>
  );
}
function LanguageSwitcher({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="language-switcher">
      <Button
        variant="outline"
        size="sm"
        className="language-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Languages data-icon="inline-start" />{" "}
        <span>{localeLabels[locale]}</span>
        <ChevronDown data-icon="inline-end" />
      </Button>
      {open && (
        <div className="language-menu" role="listbox" aria-label={translate(locale, "Language")}>
          <span className="language-menu-label">{translate(locale, "Language")}</span>
          {locales.map((item) => (
            <button
              key={item}
              role="option"
              aria-selected={item === locale}
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
            >
              {localeLabels[item]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function Navbar({
  copy,
  locale,
  onChange,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const links = [
    [copy.nav.how, "#how-it-works"],
    [copy.nav.capabilities, "#capabilities"],
    [copy.nav.workers, "#india"],
    [copy.nav.safety, "#safety"],
    [copy.nav.about, "#about"],
  ];
  const homeAnchor = (anchor: string) =>
    `${window.location.pathname === "/" ? "" : "/"}${anchor}`;
  const signedIn = Boolean(localStorage.getItem("token"));
  return (
    <header className={`nav-wrap ${scrolled ? "nav-scrolled" : ""}`}>
      <nav className="nav container">
        <Logo />
        <div className={`nav-links ${open ? "nav-open" : ""}`}>
          {links.map(([label, href]) => (
            <a
              key={label}
              href={homeAnchor(href)}
              onClick={() => setOpen(false)}
            >
              {label}
            </a>
          ))}
          <a className="mobile-demo" href={homeAnchor("#demo")}>
            {copy.nav.demo}
          </a>
        </div>
        <div className="nav-actions">
          <LanguageSwitcher locale={locale} onChange={onChange} />
          {signedIn ? (
            <ProfileMenu />
          ) : (
            <>
              <a
                className="button button-ghost desktop-only"
                href={homeAnchor("#demo")}
              >
                {copy.nav.demo}
              </a>
              <Link className="button button-primary desktop-only" to="/auth">
                {copy.nav.start} <ArrowRight size={15} />
              </Link>
            </>
          )}
          <button
            className="menu-button"
            aria-label={open ? copy.nav.menuClose : copy.nav.menuOpen}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </nav>
    </header>
  );
}

type PatientCase = {
  _id: string;
  caseNo: string;
  status: string;
  priority: string;
  intakeLanguage: string;
  facilityId?: { name: string; location: string };
  hasUpdates?: boolean;
};

function SignedInWorkspace() {
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<PatientCase | null>(null);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");
  let user: { role?: string; name?: string } = {};
  try {
    user = JSON.parse(localStorage.getItem("authUser") || "{}");
  } catch {
    user = {};
  }

  useEffect(() => {
    if (!token || user.role !== "PATIENT") return;
    api
      .get("/patient/cases")
      .then((response) => setCases(response.data.data))
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message || "Unable to load your cases.",
        ),
      );
  }, [token, user.role]);

  if (!token) return null;
  const isPatient = user.role === "PATIENT";
  const dashboardPath =
    user.role === "FACILITY_ADMIN" ? "/facility/dashboard" : "/staff/dashboard";
  const statusLabel = (status: string) => status.replaceAll("_", " ");

  return (
    <section className="signed-workspace" id="patient-dashboard">
      <div className="container signed-workspace-inner">
        <div className="signed-workspace-heading">
          <div>
            <span className="section-label">SIGNED-IN WORKSPACE</span>
            <h2>
              {isPatient
                ? "My Cases"
                : `Welcome back${user.name ? `, ${user.name.split(" ")[0]}` : ""}.`}
            </h2>
            <p>
              {isPatient
                ? "Choose a care case to see its latest status."
                : "Your operational workspace is ready."}
            </p>
          </div>
          <Link
            className="button button-primary"
            to={isPatient ? "/patient/cases" : dashboardPath}
          >
            {isPatient ? "Open My Cases" : "Open dashboard"}{" "}
            <ArrowRight size={15} />
          </Link>
        </div>
        {isPatient ? (
          <div className="case-workspace-content">
            <div className="case-list">
              {error && <p className="dashboard-error">{error}</p>}
              {cases.length === 0 ? (
                <div className="case-empty">
                  <FileText size={22} />
                  <strong>No care cases yet</strong>
                  <span>Start an AI intake to create your first case.</span>
                </div>
              ) : (
                cases.map((item) => (
                  <button
                    className={`case-row ${selectedCase?._id === item._id ? "case-row-active" : ""}`}
                    key={item._id}
                    onClick={() => setSelectedCase(item)}
                  >
                    <span>
                      <strong>{item.caseNo}</strong>
                      <small>{item.facilityId?.name || "Care facility"}</small>
                    </span>
                    <span
                      className={`status-badge status-${item.status.toLowerCase()}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                    {item.hasUpdates && (
                      <span
                        className="case-update-dot"
                        aria-label="New case update"
                        title="New case update"
                      />
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="case-detail-panel">
              {selectedCase ? (
                <>
                  <span className="section-label">CASE STATUS</span>
                  <h3>{selectedCase.caseNo}</h3>
                  <p>
                    Your case is currently{" "}
                    <strong>
                      {statusLabel(selectedCase.status).toLowerCase()}
                    </strong>
                    .
                  </p>
                  {selectedCase.hasUpdates && (
                    <p className="case-update-notice" role="status">
                      New case update. Open the intake to view messages from
                      your care team.
                    </p>
                  )}
                  <div className="case-detail-grid">
                    <span>
                      Facility
                      <strong>
                        {selectedCase.facilityId?.name || "Not available"}
                      </strong>
                    </span>
                    <span>
                      Priority<strong>{selectedCase.priority}</strong>
                    </span>
                    <span>
                      Intake language
                      <strong>{selectedCase.intakeLanguage}</strong>
                    </span>
                  </div>
                  <Link
                    className="text-link"
                    to={`/patient/intake/${selectedCase._id}`}
                  >
                    Open intake <ArrowRight size={15} />
                  </Link>
                </>
              ) : (
                <div className="case-detail-placeholder">
                  <HeartPulse size={24} />
                  <span>Select a case</span>
                  <small>Its current care status will appear here.</small>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="role-workspace-card">
            <Stethoscope size={23} />
            <div>
              <strong>
                {user.role === "FACILITY_ADMIN"
                  ? "Facility administration"
                  : `${user.role === "NURSE" ? "Nurse" : "Doctor"} care dashboard`}
              </strong>
              <span>
                Review your cases, applications, and connected care work.
              </span>
            </div>
            <Link to={dashboardPath} aria-label="Open dashboard">
              <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
function TriageDashboard({
  d,
}: {
  d: ReturnType<typeof getCopy>["dashboard"];
}) {
  return (
    <div className="dashboard-wrap">
      <div className="data-orbit orbit-one" />
      <div className="data-orbit orbit-two" />
      <div className="triage-dashboard">
        <div className="dash-top">
          <div>
            <span className="dash-kicker">{d.kicker}</span>
            <strong>{d.workspace}</strong>
          </div>
          <Badge variant="outline" className="assist-pill">
            <span className="pulse-dot" /> {d.assist}
          </Badge>
        </div>
        <div className="patient-input">
          <div className="input-label">
            <span>
              <AudioLines size={14} /> {d.input}
            </span>
            <span className="synthetic">{d.synthetic}</span>
          </div>
          <p>{d.quote}</p>
        </div>
        <div className="extract-label">
          <span>{d.extracted}</span>
          <Separator className="line" />
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span>{d.temperature}</span>
            <strong>38.4°C</strong>
          </div>
          <div className="metric">
            <span>{d.duration}</span>
            <strong>{d.days}</strong>
          </div>
          <div className="metric metric-wide">
            <span>{d.symptoms}</span>
            <strong>
              {d.symptoms === "SYMPTOMS"
                ? "Fever"
                : d.symptoms === "लक्षण"
                  ? "बुखार"
                  : "ଜ୍ୱର"}{" "}
              <i />{" "}
              {d.symptoms === "SYMPTOMS"
                ? "Cough"
                : d.symptoms === "लक्षण"
                  ? "खांसी"
                  : "କାଶ"}{" "}
              <i />{" "}
              {d.symptoms === "SYMPTOMS"
                ? "Fatigue"
                : d.symptoms === "लक्षण"
                  ? "थकान"
                  : "ଥକାପଣ"}
            </strong>
          </div>
        </div>
        <div className="missing">
          <div className="missing-icon">
            <ChevronDown size={15} />
          </div>
          <div>
            <span>{d.missing}</span>
            <strong>{d.respiratory}</strong>
          </div>
          <span className="needs-review">{d.needs}</span>
        </div>
        <div className="priority-row">
          <div>
            <span>{d.priority}</span>
            <strong>
              <span className="amber-dot" /> {d.moderate}
            </strong>
          </div>
          <span className="flag-label">{d.flag}</span>
        </div>
        <div className="next-step">
          <span>{d.next}</span>
          <strong>
            {d.review} <ArrowRight size={15} />
          </strong>
        </div>
        <div className="dash-footer">
          <span>
            {d.suggestion} <b>→</b> {d.decision}
          </span>
          <span>{d.professional}</span>
        </div>
      </div>
    </div>
  );
}
function Hero({ copy }: { copy: ReturnType<typeof getCopy> }) {
  return (
    <section className="hero" id="top">
      <div className="hero-grid" />
      <div className="container hero-inner">
        <div className="hero-copy">
          <Badge variant="outline" className="eyebrow">
            <span className="eyebrow-dot" /> {copy.hero.eyebrow}
          </Badge>
          <h1>
            {copy.hero.title}
            <br />
            <em>{copy.hero.accent}</em>
          </h1>
          <p>{copy.hero.body}</p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" to="/auth">
              {copy.hero.start} <ArrowRight size={17} />
            </Link>
            <a
              className="button button-outline button-large"
              href="#how-it-works"
            >
              {copy.hero.how}
            </a>
          </div>
          <div className="hero-trust">
            {copy.hero.trust.map((x) => (
              <span key={x}>
                <Check size={14} /> {x}
              </span>
            ))}
          </div>
        </div>
        <TriageDashboard d={copy.dashboard} />
      </div>
    </section>
  );
}
function TrustStrip({ copy }: { copy: ReturnType<typeof getCopy> }) {
  return (
    <section className="trust-strip">
      <div className="container">
        <p>{copy.trust.title}</p>
        <div className="setting-list">
          {copy.trust.settings.map((item, i) => {
            const Icon = icons[i];
            return (
              <div key={item}>
                <span className="setting-icon">
                  <Icon />
                </span>
                {item}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
function ProblemSection({ copy }: { copy: ReturnType<typeof getCopy> }) {
  return (
    <section className="section problem" id="how-it-works">
      <div className="container">
        <div className="section-heading split-heading">
          <div>
            <span className="section-label">{copy.challenge.label}</span>
            <h2>
              {copy.challenge.title}
              <br />
              <span>{copy.challenge.accent}</span>
            </h2>
          </div>
          <p>{copy.challenge.body}</p>
        </div>
        <div className="flow">
          <div className="flow-line" />
          {copy.challenge.flow.map(([title, text], i) => (
            <div className="flow-item" key={title}>
              <span>0{i + 1}</span>
              <strong>{title}</strong>
              <small>{text}</small>
              {i < 2 && (
                <div className="flow-center">
                  <ArrowRight size={20} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="story-cards">
          {copy.challenge.cards.map(([title, text], i) => {
            const Icon = storyIcons[i];
            return (
              <Card
                className={`story-card ${i === 1 ? "highlighted" : ""}`}
                key={title}
              >
                <CardContent>
                  <span className="story-number">0{i + 1}</span>
                  <Icon />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
function Capabilities({ copy }: { copy: ReturnType<typeof getCopy> }) {
  return (
    <section className="section capabilities" id="capabilities">
      <div className="container">
        <div className="section-heading centered">
          <span className="section-label">{copy.capabilities.label}</span>
          <h2>
            {copy.capabilities.title} <span>{copy.capabilities.accent}</span>
          </h2>
          <p>{copy.capabilities.body}</p>
        </div>
        <div className="cap-grid">
          {copy.capabilities.cards.map(([title, text], i) => {
            const Icon = capabilityIcons[i];
            return (
              <article
                className={`cap-card ${["teal", "mint", "amber", "violet", "teal", "mint"][i]}`}
                key={title}
              >
                <div className="cap-icon">
                  <Icon size={20} />
                </div>
                <span className="card-arrow">
                  <ArrowRight size={15} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
function IndiaSection({ copy }: { copy: ReturnType<typeof getCopy> }) {
  return (
    <section className="section india" id="india">
      <div className="container india-grid">
        <div>
          <span className="section-label">{copy.india.label}</span>
          <h2>
            {copy.india.title}
            <br />
            <span>{copy.india.accent}</span>
          </h2>
          <p>{copy.india.body}</p>
          <a className="text-link" href="#demo">
            {copy.india.link} <ArrowRight size={15} />
          </a>
        </div>
        <div className="india-visual">
          <div className="india-ring ring-a" />
          <div className="india-ring ring-b" />
          <div
            className="india-shape"
            aria-label="Abstract outline representing India"
          >
            <svg viewBox="0 0 260 310" aria-hidden="true">
              <path d="M84 17 127 29 151 52 191 73 179 105 204 130 184 155 194 188 170 210 165 250 134 292 113 263 93 224 68 211 72 177 51 155 66 126 54 95 72 70Z" />
            </svg>
            <Sparkles className="india-spark" size={22} />
          </div>
          {copy.india.tags.map((tag, i) => (
            <span className={`india-tag tag-${i + 1}`} key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
function SafetySection({ copy }: { copy: ReturnType<typeof getCopy> }) {
  return (
    <section className="section safety" id="safety">
      <div className="container">
        <div className="section-heading centered">
          <span className="section-label">{copy.safety.label}</span>
          <h2>
            {copy.safety.title} <span>{copy.safety.accent}</span>
          </h2>
          <p>{copy.safety.body}</p>
        </div>
        <div className="safety-board">
          <div className="safety-column assists">
            <div className="safety-title">
              <Sparkles size={17} /> {copy.safety.assists}
            </div>
            {copy.safety.items.map((x) => (
              <div className="safety-item" key={x}>
                <Check size={15} /> {x}
              </div>
            ))}
          </div>
          <div className="human-loop">
            <ShieldCheck size={25} />
            <span>{copy.safety.loop}</span>
            <small>
              {copy.dashboard.suggestion} <b>→</b> {copy.dashboard.decision}
            </small>
          </div>
          <div className="safety-column decides">
            <div className="safety-title">
              <Stethoscope size={17} /> {copy.safety.decides}
            </div>
            {copy.safety.human.map((x) => (
              <div className="safety-item" key={x}>
                <Check size={15} /> {x}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
function Workflow({ copy }: { copy: ReturnType<typeof getCopy> }) {
  return (
    <section className="section workflow">
      <div className="container">
        <div className="workflow-header">
          <div>
            <span className="section-label">{copy.workflow.label}</span>
            <h2>
              {copy.workflow.title}
              <br />
              <span>{copy.workflow.accent}</span>
            </h2>
          </div>
          <p>{copy.workflow.body}</p>
        </div>
        <div className="steps">
          {copy.workflow.steps.map(([title, text], i) => {
            const Icon = [Mic, ScanLine, Zap, Stethoscope, ArrowRight][i];
            return (
              <div className="step" key={title}>
                <span className="step-num">0{i + 1}</span>
                <div className="step-icon">
                  <Icon />
                </div>
                <strong>{title}</strong>
                <small>{text}</small>
                {i < 4 && <ArrowRight className="step-arrow" size={17} />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
function FinalCTA({ copy }: { copy: ReturnType<typeof getCopy> }) {
  return (
    <section className="final-cta" id="demo">
      <div className="cta-grid" />
      <div className="container cta-inner">
        <span className="section-label">{copy.cta.label}</span>
        <h2>
          {copy.cta.title}
          <br />
          <em>{copy.cta.accent}</em>
        </h2>
        <p>{copy.cta.body}</p>
        <div className="hero-actions">
          <Link className="button button-primary button-large" to="/auth">
            {copy.cta.demo} <ArrowRight size={17} />
          </Link>
          <a
            className="button button-dark-outline button-large"
            href="#how-it-works"
          >
            {copy.cta.workflow}
          </a>
        </div>
      </div>
    </section>
  );
}
function Footer({ copy }: { copy: ReturnType<typeof getCopy> }) {
  return (
    <footer id="about">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p>{copy.footer.about}</p>
        </div>
        <div className="footer-links">
          <a href="#how-it-works">{copy.nav.how}</a>
          <a href="#capabilities">{copy.nav.capabilities}</a>
          <a href="#safety">{copy.nav.safety}</a>
          <a href="#demo">{copy.nav.demo}</a>
        </div>
        <div className="footer-disclaimer">
          <ShieldCheck size={17} />
          <p>{copy.footer.disclaimer}</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 SehatSetu AI</span>
        <span>{copy.footer.care}</span>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const [locale, setCurrentLocale] = useState<Locale>("en");
  useEffect(() => {
    const update = () => setCurrentLocale(localeFromPath());
    update();
    window.addEventListener("localechange", update);
    return () => window.removeEventListener("localechange", update);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const copy = getCopy(locale);
  const changeLocale = (next: Locale) => {
    setLocale(next);
    setCurrentLocale(next);
  };
  return (
    <>
      <Navbar copy={copy} locale={locale} onChange={changeLocale} />
      <main>
        <Hero copy={copy} />
        <SignedInWorkspace />
        <TrustStrip copy={copy} />
        <ProblemSection copy={copy} />
        <Capabilities copy={copy} />
        <IndiaSection copy={copy} />
        <SafetySection copy={copy} />
        <Workflow copy={copy} />
        <FinalCTA copy={copy} />
      </main>
      <Footer copy={copy} />
    </>
  );
}
