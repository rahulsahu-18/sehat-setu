import React from "react";
import { Building2, HeartPulse, Stethoscope, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

function AuthPage() {
  const navigate = useNavigate();

  return (
    <main className="auth-page auth-choice-page">
      <div className="auth-grid" />
      <div className="auth-choice-wrap">
        <div className="auth-brand">
          <span className="logo-mark">
            <HeartPulse size={17} />
          </span>
          <span>
            SehatSetu <b>AI</b>
          </span>
        </div>

        {/* Header */}
        <div className="auth-choice-heading">
          <span className="auth-eyebrow">
            <span className="eyebrow-dot" /> SECURE ENTRY
          </span>
          <h1>Choose your care path.</h1>
          <p>
            One connected space for patients, facilities, and the teams who care
            for them.
          </p>
        </div>

        {/* Auth Options */}
        <div className="auth-options">
          {/* Patient */}
          <button
            className="auth-option auth-option-teal"
            onClick={() => navigate("/auth/patient")}
          >
            <div className="auth-option-icon">
              <UserRound size={22} />
            </div>

            <h2 className="text-xl font-semibold text-white">Patient</h2>

            <p className="mt-2 text-sm text-slate-400">
              Login or create your patient account.
            </p>

            <div className="mt-5 text-sm font-medium text-blue-400">
              Continue →
            </div>
          </button>

          {/* Facility */}
          <button
            onClick={() => navigate("/auth/facility")}
            className="auth-option auth-option-mint"
          >
            <div className="auth-option-icon">
              <Building2 size={22} />
            </div>

            <h2 className="text-xl font-semibold text-white">Facility</h2>

            <p className="mt-2 text-sm text-slate-400">
              Register a healthcare facility or login as facility admin.
            </p>

            <div className="mt-5 text-sm font-medium text-purple-400">
              Continue →
            </div>
          </button>

          {/* Doctor */}
          <button
            onClick={() => navigate("/auth/doctor")}
            className="auth-option auth-option-blue"
          >
            <div className="auth-option-icon">
              <Stethoscope size={22} />
            </div>

            <h2 className="text-xl font-semibold text-white">Doctor</h2>

            <p className="mt-2 text-sm text-slate-400">
              Apply to a facility or login as a doctor.
            </p>

            <div className="mt-5 text-sm font-medium text-emerald-400">
              Continue →
            </div>
          </button>

          {/* Nurse */}
          <button
            onClick={() => navigate("/auth/nurse")}
            className="auth-option auth-option-amber"
          >
            <div className="auth-option-icon">
              <Stethoscope size={22} />
            </div>

            <h2 className="text-xl font-semibold text-white">Nurse</h2>

            <p className="mt-2 text-sm text-slate-400">
              Apply to a facility or login as a nurse.
            </p>

            <div className="mt-5 text-sm font-medium text-pink-400">
              Continue →
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}

export default AuthPage;
