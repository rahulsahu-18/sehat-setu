import { ArrowLeft, HeartPulse, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-grid" />
      <div className="auth-shell">
        <Link className="auth-back" to="/">
          <ArrowLeft size={15} /> Back to access options
        </Link>
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
        <div className="auth-layout">
          <section className="auth-intro">
            <span className="auth-eyebrow">
              <span className="eyebrow-dot" /> {eyebrow}
            </span>
            <h1>{title}</h1>
            <p>{description}</p>
            <div className="auth-trust">
              <ShieldCheck size={16} /> Secure access for connected care teams
            </div>
          </section>
          <section className="auth-card">{children}</section>
        </div>
      </div>
    </main>
  );
}

export function FormMessage({
  error,
  success,
}: {
  error: string;
  success: string;
}) {
  return (
    <>
      {error && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-message form-success" role="status">
          {success}
        </p>
      )}
    </>
  );
}
