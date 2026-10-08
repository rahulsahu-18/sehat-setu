import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { AuthShell, FormMessage } from "@/components/AuthShell";
import { translate, useLocale } from "@/lib/i18n";

enum FacilityType {
  GOVERNMENT_HOSPITAL = "GOVERNMENT_HOSPITAL",
  PHC = "PHC",
  CAMPUS_HEALTH_CENTER = "CAMPUS_HEALTH_CENTER",
  COMPANY_CLINIC = "COMPANY_CLINIC",
  INDUSTRIAL_HEALTH_UNIT = "INDUSTRIAL_HEALTH_UNIT",
  PUBLIC_HEALTH_CAMP = "PUBLIC_HEALTH_CAMP",
}

type RegisterData = {
  facilityName: string;
  facilityType: FacilityType | "";
  location: string;
  adminName: string;
  email: string;
  phoneNo: string;
  password: string;
};

type LoginData = {
  identifier: string;
  password: string;
};

function FacilityRedg() {
  const locale = useLocale();
  const t = (message: string) => translate(locale, message);
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);

  const [registerData, setRegisterData] = useState<RegisterData>({
    facilityName: "",
    facilityType: "",
    location: "",
    adminName: "",
    email: "",
    phoneNo: "",
    password: "",
  });

  const [loginData, setLoginData] = useState<LoginData>({
    identifier: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("/facility/register", {
        facility: {
          name: registerData.facilityName,
          type: registerData.facilityType,
          location: registerData.location,
        },

        admin: {
          name: registerData.adminName,
          email: registerData.email,
          phoneNo: registerData.phoneNo,
          password: registerData.password,
        },
      });

      const token = response.data.data.token;

      localStorage.setItem("token", token);
      localStorage.setItem(
        "authUser",
        JSON.stringify(response.data.data.admin),
      );

      setSuccess(t("Facility registered successfully!"));
      navigate("/facility/dashboard");
    } catch (error: any) {
      setError(t(error.response?.data?.message || "Failed to register facility"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("/facility/login", {
        identifier: loginData.identifier,
        password: loginData.password,
      });

      const token = response.data.data.token;

      localStorage.setItem("token", token);
      localStorage.setItem("authUser", JSON.stringify(response.data.data.user));

      setSuccess(t("Facility admin login successful!"));
      navigate("/facility/dashboard");
    } catch (error: any) {
      setError(t(error.response?.data?.message || "Failed to login"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow={t("FACILITY ACCESS")}
      title={t("Build a stronger care network.")}
      description={t("Register your facility or sign in to coordinate the people and decisions that keep care moving.")}
    >
      <FormMessage error={error} success={success} />

      {isLogin ? (
        // =========================
        // FACILITY ADMIN LOGIN
        // =========================

        <form className="auth-form" onSubmit={handleLogin}>
          <h3>{t("Facility Admin Login")}</h3>

          <div>
            <label htmlFor="identifier">{t("Email / Phone:")}</label>

            <input
              type="text"
              id="identifier"
              value={loginData.identifier}
              onChange={(e) =>
                setLoginData({
                  ...loginData,
                  identifier: e.target.value,
                })
              }
              placeholder={t("Enter email or phone")}
              required
            />
          </div>

          <div>
            <label htmlFor="loginPassword">{t("Password:")}</label>

            <input
              type="password"
              id="loginPassword"
              value={loginData.password}
              onChange={(e) =>
                setLoginData({
                  ...loginData,
                  password: e.target.value,
                })
              }
              placeholder={t("Enter password")}
              required
            />
          </div>

          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? t("Logging in...") : t("Login")}
          </button>

          <p>
            {t("Don't have a facility account?")}{" "}
            <button
              className="auth-link-button"
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError("");
                setSuccess("");
              }}
            >
              {t("Register Facility")}
            </button>
          </p>
        </form>
      ) : (
        // =========================
        // FACILITY REGISTRATION
        // =========================

        <form className="auth-form" onSubmit={handleRegister}>
          <h3>{t("Register Facility")}</h3>

          <h4>{t("Facility Information")}</h4>

          <div>
            <label htmlFor="facilityName">{t("Facility Name:")}</label>

            <input
              type="text"
              id="facilityName"
              value={registerData.facilityName}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  facilityName: e.target.value,
                })
              }
              placeholder={t("Enter facility name")}
              required
            />
          </div>

          <div>
            <label htmlFor="facilityType">{t("Facility Type:")}</label>

            <select
              id="facilityType"
              value={registerData.facilityType}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  facilityType: e.target.value as FacilityType,
                })
              }
              required
            >
              <option value="">{t("Select facility type")}</option>

              <option value={FacilityType.GOVERNMENT_HOSPITAL}>
                {t("Government Hospital")}
              </option>

              <option value={FacilityType.PHC}>{t("PHC")}</option>

              <option value={FacilityType.CAMPUS_HEALTH_CENTER}>
                {t("Campus Health Center")}
              </option>

              <option value={FacilityType.COMPANY_CLINIC}>
                {t("Company Clinic")}
              </option>

              <option value={FacilityType.INDUSTRIAL_HEALTH_UNIT}>
                {t("Industrial Health Unit")}
              </option>

              <option value={FacilityType.PUBLIC_HEALTH_CAMP}>
                {t("Public Health Camp")}
              </option>
            </select>
          </div>

          <div>
            <label htmlFor="location">{t("Location:")}</label>

            <input
              type="text"
              id="location"
              value={registerData.location}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  location: e.target.value,
                })
              }
              placeholder={t("Enter facility location")}
              required
            />
          </div>

          <h4>{t("Facility Admin Information")}</h4>

          <div>
            <label htmlFor="adminName">{t("Admin Name:")}</label>

            <input
              type="text"
              id="adminName"
              value={registerData.adminName}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  adminName: e.target.value,
                })
              }
              placeholder={t("Enter admin name")}
              required
            />
          </div>

          <div>
            <label htmlFor="email">{t("Email:")}</label>

            <input
              type="email"
              id="email"
              value={registerData.email}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  email: e.target.value,
                })
              }
              placeholder={t("Enter admin email")}
              required
            />
          </div>

          <div>
            <label htmlFor="phoneNo">{t("Phone No:")}</label>

            <input
              type="tel"
              id="phoneNo"
              value={registerData.phoneNo}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  phoneNo: e.target.value,
                })
              }
              placeholder={t("Enter phone number")}
              required
            />
          </div>

          <div>
            <label htmlFor="registerPassword">{t("Password:")}</label>

            <input
              type="password"
              id="registerPassword"
              value={registerData.password}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  password: e.target.value,
                })
              }
              placeholder={t("Minimum 8 characters")}
              required
              minLength={8}
            />
          </div>

          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? t("Registering...") : t("Register Facility")}
          </button>

          <p>
            {t("Already have a facility account?")}{" "}
            <button
              className="auth-link-button"
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError("");
                setSuccess("");
              }}
            >
              {t("Login as Admin")}
            </button>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export default FacilityRedg;
