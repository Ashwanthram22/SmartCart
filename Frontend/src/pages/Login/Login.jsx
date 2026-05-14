import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { login } from "../../api/client";
import AuthBrand from "../../components/auth/AuthBrand";
import AuthDivider from "../../components/auth/AuthDivider";
import AuthInput from "../../components/auth/AuthInput";
import AuthPrimaryButton from "../../components/auth/AuthPrimaryButton";
import AuthSocialButtons from "../../components/auth/AuthSocialButtons";
import AuthTip from "../../components/auth/AuthTip";
import { isAdmin, isAuthenticated, setToken } from "../../utils/authToken";
import { isWellFormedEmail, EMAIL_FORMAT_HINT } from "../../utils/isWellFormedEmail";
import usePageMeta from "../../hooks/usePageMeta";
import "../../components/auth/AuthShared.css";
import "./Login.css";

function Login() {
  usePageMeta({
    title: "Sign in",
    description: "Sign in to SmartCart AI to access your cart, orders, and personalized picks.",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: "demo@aicart.com",
    password: "demo123",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [emailFieldError, setEmailFieldError] = useState("");
  const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const params = new URLSearchParams(location.search);
  const googleError = params.get("error");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setLoginError("");
    setEmailFieldError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoginError("");
    const email = form.email.trim();
    if (!email) {
      setEmailFieldError("Please enter your email.");
      return;
    }
    setEmailFieldError("");
    if (!isWellFormedEmail(email)) {
      setEmailFieldError(EMAIL_FORMAT_HINT);
      return;
    }
    setIsSubmitting(true);

    try {
      const data = await login(form);
      setToken(data.jwt_token);
      const isAdminUser =
        data.user?.role === "admin" || Boolean(data.user?.isAdmin);
      const intended = location.state?.from?.pathname;
      const redirectTo = intended || (isAdminUser ? "/admin" : "/home");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setLoginError(error.response?.data?.message || "Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${backendBaseUrl}/api/auth/google/start`;
  };

  const googleErrorMap = {
    google_access_denied: "Google login was cancelled.",
    missing_google_code: "Google login could not be completed.",
    google_not_configured: "Google OAuth is not configured on backend.",
    google_token_failed: "Could not verify Google login token.",
    google_profile_failed: "Could not read Google profile.",
    google_email_missing: "No email found in selected Google account.",
    google_auth_failed: "Google login failed. Please try again.",
  };
  const oauthErrorText = googleError
    ? googleErrorMap[googleError] || "Google login failed."
    : "";
  const formErrorText = loginError || oauthErrorText;

  if (isAuthenticated()) {
    return <Navigate to={isAdmin() ? "/admin" : "/home"} replace />;
  }

  return (
    <section className="login-page">
      <main id="main-content" className="login-main">
        <AuthBrand />

        <div className="login-card">
          <h2>Welcome back</h2>

          <form className="login-form" onSubmit={handleSubmit}>
            <AuthInput
              id="email"
              name="email"
              label="Email Address"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@company.com"
              errorBelow={emailFieldError}
            />

            <div className="login-password-row">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="link-button">
                Forgot Password?
              </Link>
            </div>

            <AuthInput
              id="password"
              name="password"
              label=""
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              rightNode={
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              }
            />

            {formErrorText ? (
              <p className="login-form-error" role="alert">
                {formErrorText}
              </p>
            ) : null}

            <AuthPrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign In"}
            </AuthPrimaryButton>
          </form>

          <AuthDivider text="Or continue with" />
          <AuthSocialButtons onGoogleClick={handleGoogleLogin} />
        </div>

        <p className="login-register-note">
          New to SmartCart? <Link to="/register">Create an account</Link>
        </p>

        <AuthTip />
      </main>
    </section>
  );
}

export default Login;
