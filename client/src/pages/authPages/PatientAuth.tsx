import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { AuthShell, FormMessage } from "@/components/AuthShell";

type SignInDataType = {
  phone: string;
  password: string;
};

type SignUpDataType = {
  name: string;
  phone: string;
  gender: string;
  language: "english" | "hindi" | "odia";
  password: string;
};

function PatientAuth() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const [signinData, setSigninData] = useState<SignInDataType>({
    phone: "",
    password: "",
  });

  const [signupData, setSignupData] = useState<SignUpDataType>({
    name: "",
    phone: "",
    gender: "",
    language: "english",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/user/login", {
        identifier: signinData.phone,
        password: signinData.password,
      });
      localStorage.setItem("token", response.data.data.token);
      localStorage.setItem("authUser", JSON.stringify(response.data.data.user));
      navigate("/patient/setup");
    } catch (error: any) {
      setError(error.response?.data?.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/user/register", {
        name: signupData.name,
        phoneNo: signupData.phone,
        gender: signupData.gender,
        language: signupData.language,
        password: signupData.password,
      });
      localStorage.setItem("token", response.data.data.token);
      localStorage.setItem("authUser", JSON.stringify(response.data.data.user));
      navigate("/patient/setup");
    } catch (error: any) {
      setError(error.response?.data?.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="PATIENT ACCESS"
      title="Care that starts with you."
      description="Create a secure patient account to keep your care journey connected."
    >
      <FormMessage error={error} success={success} />
      {open ? (
        <form className="auth-form" onSubmit={handleSignUp}>
          <div className="auth-card-heading">
            <span>01 / PROFILE</span>
            <h2>Create patient account</h2>
            <p>A few details help us personalize your care.</p>
          </div>
          <label htmlFor="name">Full name</label>
          <input
            type="text"
            id="name"
            value={signupData.name}
            onChange={(e) =>
              setSignupData({
                ...signupData,
                name: e.target.value,
              })
            }
            required
          />
          <label htmlFor="signupPhone">Phone number</label>
          <input
            type="tel"
            id="signupPhone"
            value={signupData.phone}
            onChange={(e) =>
              setSignupData({
                ...signupData,
                phone: e.target.value,
              })
            }
            required
          />
          <div className="auth-form-row">
            <div>
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                value={signupData.gender}
                onChange={(e) =>
                  setSignupData({ ...signupData, gender: e.target.value })
                }
                required
              >
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="language">Preferred language</label>
              <select
                id="language"
                value={signupData.language}
                onChange={(e) =>
                  setSignupData({
                    ...signupData,
                    language: e.target.value as SignUpDataType["language"],
                  })
                }
                required
              >
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
                <option value="odia">Odia</option>
              </select>
            </div>
          </div>
          <label htmlFor="signupPassword">Password</label>
          <input
            type="password"
            id="signupPassword"
            value={signupData.password}
            onChange={(e) =>
              setSignupData({
                ...signupData,
                password: e.target.value,
              })
            }
            minLength={8}
            required
          />
          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="auth-switch">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError("");
                setSuccess("");
              }}
            >
              Sign in
            </button>
          </p>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleSignIn}>
          <div className="auth-card-heading">
            <span>01 / SIGN IN</span>
            <h2>Welcome back</h2>
            <p>Continue to your connected care space.</p>
          </div>
          <label htmlFor="phoneNo">Phone number or email</label>
          <input
            type="text"
            id="phoneNo"
            value={signinData.phone}
            onChange={(e) =>
              setSigninData({
                ...signinData,
                phone: e.target.value,
              })
            }
            required
          />
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={signinData.password}
            onChange={(e) =>
              setSigninData({
                ...signinData,
                password: e.target.value,
              })
            }
            required
          />
          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="auth-switch">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setError("");
                setSuccess("");
              }}
            >
              Create an account
            </button>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export default PatientAuth;
