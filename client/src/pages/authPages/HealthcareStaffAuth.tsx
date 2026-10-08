import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { AuthShell, FormMessage } from "@/components/AuthShell";
import { translate, useLocale } from "@/lib/i18n";

type Facility = {
  _id: string;
  name: string;
  type: string;
  location: string;
};

type StaffRole = "DOCTOR" | "NURSE";

function HealthcareStaffAuth() {
  const locale = useLocale();
  const t = (message: string) => translate(locale, message);
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);

  const [facilities, setFacilities] = useState<Facility[]>([]);

  const [loadingFacilities, setLoadingFacilities] = useState(true);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [registerData, setRegisterData] = useState({
    name: "",
    identifier: "",
    password: "",
    role: "" as StaffRole | "",
    facilityId: "",
  });

  const [loginData, setLoginData] = useState({
    identifier: "",
    password: "",
    facilityId: "",
  });

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const response = await api.get("/facility");

        setFacilities(response.data.data);
      } catch {
        setError(t("Failed to load facilities"));
      } finally {
        setLoadingFacilities(false);
      }
    };

    fetchFacilities();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (registerData.identifier.includes("@")) {
        setError(
          t("Use a phone number for staff applications. You can use email when you sign in."),
        );
        setLoading(false);
        return;
      }

      const response = await api.post("/staff/apply", {
        name: registerData.name,
        phoneNo: registerData.identifier,

        password: registerData.password,

        role: registerData.role,

        facilityId: registerData.facilityId,
      });

      setSuccess(t("Application submitted. Wait for facility admin approval."));

      setRegisterData({
        name: "",
        identifier: "",
        password: "",
        role: "",
        facilityId: "",
      });
    } catch (error: any) {
      setError(t(error.response?.data?.message || "Failed to submit application"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("/staff/login", loginData);

      localStorage.setItem("token", response.data.data.token);
      localStorage.setItem("authUser", JSON.stringify(response.data.data.user));

      setSuccess(t("Login successful!"));
      navigate("/staff/dashboard");

      // Navigate to staff dashboard
      // navigate("/staff/dashboard");
    } catch (error: any) {
      setError(t(error.response?.data?.message || "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow={t("CARE TEAM ACCESS")}
      title={t("Bring your expertise into the loop.")}
      description={t("Apply to a connected facility or sign in to support faster, safer care decisions.")}
    >
      <FormMessage error={error} success={success} />

      {isLogin ? (
        <form className="auth-form" onSubmit={handleLogin}>
          <h2>{t("Staff Login")}</h2>

          <input
            type="text"
            placeholder={t("Email or Phone")}
            value={loginData.identifier}
            onChange={(e) =>
              setLoginData({
                ...loginData,
                identifier: e.target.value,
              })
            }
            required
          />

          <input
            type="password"
            placeholder={t("Password")}
            value={loginData.password}
            onChange={(e) =>
              setLoginData({ ...loginData, password: e.target.value })
            }
            required
          />

          <select
            value={loginData.facilityId}
            onChange={(e) =>
              setLoginData({
                ...loginData,
                facilityId: e.target.value,
              })
            }
            required
          >
            <option value="">{t("Select Facility")}</option>

            {facilities.map((facility) => (
              <option key={facility._id} value={facility._id}>
                {facility.name} - {facility.location}
              </option>
            ))}
          </select>

          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? t("Logging in...") : t("Login")}
          </button>

          <p>{t("Don't have an account?")}</p>

          <button
            className="button button-secondary auth-submit"
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError("");
              setSuccess("");
            }}
          >
            {t("Apply as Staff")}
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleRegister}>
          <h2>{t("Apply as Healthcare Staff")}</h2>

          <input
            type="text"
            placeholder={t("Full Name")}
            value={registerData.name}
            onChange={(e) =>
              setRegisterData({
                ...registerData,
                name: e.target.value,
              })
            }
            required
          />

          <input
            type="text"
            placeholder={t("Phone number")}
            value={registerData.identifier}
            onChange={(e) =>
              setRegisterData({
                ...registerData,
                identifier: e.target.value,
              })
            }
            required
          />

          <input
            type="password"
            placeholder={t("Password")}
            minLength={8}
            value={registerData.password}
            onChange={(e) =>
              setRegisterData({
                ...registerData,
                password: e.target.value,
              })
            }
            required
          />

          <select
            value={registerData.role}
            onChange={(e) =>
              setRegisterData({
                ...registerData,
                role: e.target.value as StaffRole,
              })
            }
            required
          >
            <option value="">{t("Select Role")}</option>

            <option value="DOCTOR">{t("Doctor")}</option>

            <option value="NURSE">{t("Nurse")}</option>
          </select>

          <select
            value={registerData.facilityId}
            onChange={(e) =>
              setRegisterData({
                ...registerData,
                facilityId: e.target.value,
              })
            }
            required
          >
            <option value="">{t("Select Facility")}</option>

            {loadingFacilities ? (
              <option disabled>{t("Loading...")}</option>
            ) : (
              facilities.map((facility) => (
                <option key={facility._id} value={facility._id}>
                  {facility.name} - {facility.location}
                </option>
              ))
            )}
          </select>

          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Apply"}
          </button>

          <p>Already have an account?</p>

          <button
            className="button button-secondary auth-submit"
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError("");
              setSuccess("");
            }}
          >
            Login
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default HealthcareStaffAuth;
