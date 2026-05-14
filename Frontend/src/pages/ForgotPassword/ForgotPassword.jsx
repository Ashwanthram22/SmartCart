import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { requestPasswordReset } from "../../api/client";
import AuthInput from "../../components/auth/AuthInput";
import AuthPrimaryButton from "../../components/auth/AuthPrimaryButton";
import { isAuthenticated } from "../../utils/authToken";
import { isWellFormedEmail, EMAIL_FORMAT_HINT } from "../../utils/isWellFormedEmail";
import usePageMeta from "../../hooks/usePageMeta";
import "../../components/auth/AuthShared.css";
import "./ForgotPassword.css";

function ForgotPassword() {
  usePageMeta({
    title: "Forgot password",
    description: "Reset your SmartCart AI account password.",
  });

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [emailFieldError, setEmailFieldError] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailFieldError("Please enter your email.");
      return;
    }
    setEmailFieldError("");
    if (!isWellFormedEmail(trimmed)) {
      setEmailFieldError(EMAIL_FORMAT_HINT);
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setDevResetUrl("");

    try {
      const data = await requestPasswordReset({ email: trimmed });
      setMessage(data.message);
      // Dev-only convenience: backend returns the live reset URL when
      // NODE_ENV !== "production" so the flow works without an email
      // provider configured.
      if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
    } catch (error) {
      setMessage(error.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated()) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="forgot-page">
      <header className="forgot-header">
        <Link to="/login" className="forgot-logo">
          SmartCart AI
        </Link>
        <button type="button" className="forgot-help-btn" aria-label="Help">
          ?
        </button>
      </header>

      <div className="forgot-body">
        <main id="main-content" className="forgot-main">
          <div className="forgot-card">
            <div className="forgot-card-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M9 11V8a3 3 0 0 1 5.5-1.7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M18 5v4h-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 className="forgot-title">Reset your password</h1>
            <p className="forgot-subtitle">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            <form className="forgot-form" onSubmit={handleSubmit}>
              <AuthInput
                id="email"
                name="email"
                label="Email Address"
                type="email"
                leftIcon="mail"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setMessage("");
                  setEmailFieldError("");
                }}
                errorBelow={emailFieldError}
                placeholder="name@example.com"
              />

              <AuthPrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </AuthPrimaryButton>
            </form>

            {message ? <p className="forgot-feedback">{message}</p> : null}

            {devResetUrl ? (
              <div className="forgot-dev-link" role="note">
                <strong>Dev mode:</strong> a real email isn&apos;t configured, so
                here&apos;s the reset link directly.
                <Link to={devResetUrl.replace(/^https?:\/\/[^/]+/, "")} className="forgot-dev-link-anchor">
                  Open reset page →
                </Link>
              </div>
            ) : null}

            <div className="forgot-divider" />

            <Link to="/login" className="forgot-back-link">
              ← Back to Login
            </Link>
          </div>

          <div className="forgot-banner" role="note">
            <span className="forgot-banner-icon" aria-hidden="true">
              ✦
            </span>
            <p>Secure end-to-end encryption for your data privacy.</p>
          </div>
        </main>
      </div>

      <footer className="forgot-footer">
        <span>© 2026 SmartCart AI. All rights reserved.</span>
        <nav aria-label="Legal">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact Support</a>
        </nav>
      </footer>
    </div>
  );
}

export default ForgotPassword;
