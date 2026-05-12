import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword, validateResetToken } from "../../api/client";
import AuthInput from "../../components/auth/AuthInput";
import AuthPrimaryButton from "../../components/auth/AuthPrimaryButton";
import { isAuthenticated } from "../../utils/authToken";
import usePageMeta from "../../hooks/usePageMeta";
import "../../components/auth/AuthShared.css";
import "../ForgotPassword/ForgotPassword.css";

function ResetPassword() {
  usePageMeta({
    title: "Reset password",
    description: "Set a new password for your SmartCart AI account.",
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [tokenState, setTokenState] = useState("checking"); // checking | valid | invalid | used | expired
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!token) {
        if (!cancelled) setTokenState("invalid");
        return;
      }
      try {
        const data = await validateResetToken(token);
        if (cancelled) return;
        if (data.valid) {
          setTokenState("valid");
        } else if (data.reason === "expired") {
          setTokenState("expired");
        } else if (data.reason === "used") {
          setTokenState("used");
        } else {
          setTokenState("invalid");
        }
      } catch {
        if (!cancelled) setTokenState("invalid");
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword });
      setSuccess(true);
      // Auto-route to login after a short pause so the success message has time to read.
      setTimeout(() => navigate("/login", { replace: true }), 1600);
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset your password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated()) {
    return <Navigate to="/home" replace />;
  }

  const invalidReason =
    tokenState === "expired"
      ? "This reset link has expired. Request a fresh one."
      : tokenState === "used"
        ? "This reset link has already been used."
        : "This reset link is invalid.";

  return (
    <div className="forgot-page">
      <header className="forgot-header">
        <Link to="/login" className="forgot-logo">
          SmartCart AI
        </Link>
      </header>

      <div className="forgot-body">
        <main id="main-content" className="forgot-main">
          <div className="forgot-card">
            <h1 className="forgot-title">Set a new password</h1>
            <p className="forgot-subtitle">
              Choose a strong password you haven&apos;t used elsewhere. The link
              you used is single-use and expires after an hour.
            </p>

            {tokenState === "checking" ? (
              <p className="forgot-feedback">Validating your link…</p>
            ) : tokenState === "valid" && !success ? (
              <form className="forgot-form" onSubmit={handleSubmit} noValidate>
                <AuthInput
                  id="new-password"
                  name="newPassword"
                  label="New Password"
                  type="password"
                  leftIcon="lock"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
                <AuthInput
                  id="confirm-password"
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  leftIcon="lock"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />

                {error ? <p className="forgot-feedback" role="alert">{error}</p> : null}

                <AuthPrimaryButton type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : "Reset Password"}
                </AuthPrimaryButton>
              </form>
            ) : success ? (
              <p className="forgot-feedback">
                Password reset! Sending you to sign in…
              </p>
            ) : (
              <>
                <p className="forgot-feedback">{invalidReason}</p>
                <Link to="/forgot-password" className="forgot-back-link">
                  Request a new link →
                </Link>
              </>
            )}

            <div className="forgot-divider" />

            <Link to="/login" className="forgot-back-link">
              ← Back to Login
            </Link>
          </div>
        </main>
      </div>

      <footer className="forgot-footer">
        <span>© 2026 SmartCart AI. All rights reserved.</span>
      </footer>
    </div>
  );
}

export default ResetPassword;
