import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { FormMessage } from "@/components/AuthShell";
import { AppHeader } from "@/components/AppHeader";
import { detectLocale, getPatientCopy, translate, useLocale } from "@/lib/i18n";

type Facility = { _id: string; name: string; type: string; location: string };
type Language = "english" | "hindi" | "odia";

function PatientCareSetup() {
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState("");
  const [language, setLanguage] = useState<Language>(() => {
    const locale = detectLocale();
    return locale === "hi" ? "hindi" : locale === "or" ? "odia" : "english";
  });
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const locale = useLocale();
  const t = (message: string) => translate(locale, message);
  const copy = getPatientCopy(locale);

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const response = await api.get("/facility");
        setFacilities(response.data.data);
      } catch (requestError: any) {
        setError(
          requestError.response?.data?.message || "Unable to load facilities.",
        );
      } finally {
        setLoading(false);
      }
    };
    loadFacilities();
  }, []);

  const startIntake = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStarting(true);
    setError("");
    try {
      const response = await api.post("/patient/intake", {
        facilityId,
        language,
        consent,
      });
      navigate(`/patient/intake/${response.data.data.case.id}`);
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message || "Unable to start AI intake.",
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <main className="care-setup-page">
      <AppHeader />
      <div className="care-setup-inner">
        <section className="care-setup-intro">
          <span className="auth-eyebrow">
            <span className="eyebrow-dot" /> {t("PATIENT CARE SPACE")}
          </span>
          <h1>{copy.setupTitle}</h1>
          <p>{copy.setupBody}</p>
          <div className="auth-trust">
            <ShieldCheck size={16} /> {t("Your selection is attached to a secure care case")}
          </div>
        </section>
        <section className="care-setup-card">
          <div className="auth-card-heading">
            <span>{t("01 / CARE SETUP")}</span>
            <h2>{t("Choose your preferences")}</h2>
            <p>{t("You can begin sharing your concern after this step.")}</p>
          </div>
          <FormMessage error={error} success="" />
          <form className="auth-form" onSubmit={startIntake}>
            <label htmlFor="careFacility">{copy.facility}</label>
            <select
              id="careFacility"
              value={facilityId}
              onChange={(event) => setFacilityId(event.target.value)}
              required
              disabled={loading}
            >
              <option value="">
                {loading ? t("Loading facilities...") : copy.chooseFacility}
              </option>
              {facilities.map((facility) => (
                <option key={facility._id} value={facility._id}>
                  {facility.name} - {facility.location}
                </option>
              ))}
            </select>
            <label htmlFor="intakeLanguage">{copy.intakeLanguage}</label>
            <select
              id="intakeLanguage"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              required
            >
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="odia">Odia</option>
            </select>
            <label className="consent-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                required
              />
              <span>{copy.syntheticConsent}</span>
            </label>
            <button
              className="button button-primary auth-submit"
              type="submit"
              disabled={
                starting || loading || facilities.length === 0 || !consent
              }
            >
              {starting ? t("Preparing intake...") : copy.startIntake}{" "}
              <ArrowRight size={16} />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default PatientCareSetup;
