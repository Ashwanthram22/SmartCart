import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { register } from "../../api/client";
import AuthBrand from "../../components/auth/AuthBrand";
import AuthInput from "../../components/auth/AuthInput";
import { EyeIcon } from "../../components/auth/EyeIcon";
import AuthPrimaryButton from "../../components/auth/AuthPrimaryButton";
import { isAuthenticated, setToken } from "../../utils/authToken";
import usePageMeta from "../../hooks/usePageMeta";
import "../../components/auth/AuthShared.css";
import "./Register.css";

function Register() {
  usePageMeta({
    title: "Create account",
    description: "Join SmartCart AI in seconds and start getting AI-curated picks made for you.",
  });

  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setMessage("Password and confirm password do not match.");
      return;
    }

    if (!form.acceptedTerms) {
      setMessage("Please accept terms and privacy policy.");
      return;
    }

    setMessage("Creating account...");

    try {
      const data = await register({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setToken(data.jwt_token);
      setMessage("Account created successfully.");
      navigate("/home", { replace: true });
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to create account.");
    }
  };

  if (isAuthenticated()) {
    return <Navigate to="/home" replace />;
  }

  return (
    <section className="register-page">
      <header className="register-topbar">
        <div className="register-topbar-inner">
          <div className="register-topbar-brand">
            <AuthBrand compact />
          </div>
          <nav className="register-topbar-nav" aria-label="Primary">
            <a href="#">Categories</a>
            <a href="#">Deals</a>
            <a href="#">Support</a>
          </nav>
        </div>
      </header>

      <main id="main-content" className="register-main">
        <div className="register-left-panel">
          <div className="register-left-glow register-left-glow--one" aria-hidden="true" />
          <div className="register-left-glow register-left-glow--two" aria-hidden="true" />
          <div className="register-left-content">
            <h1>Elevate Your Shopping Intelligence.</h1>
            <p className="register-left-lead">
              Experience a personalized marketplace powered by Lumina Intelligence,
              designed to find exactly what you need before you even know it.
            </p>
            <div className="register-features">
              <article>
                <span className="register-feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h4>Instant Checkout</h4>
                <p>One-tap purchase across all retailers.</p>
              </article>
              <article>
                <span className="register-feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="m12 3 1.9 3.8 4.2.6-3 3 .7 4.2L12 17.8 8.2 14.6l.7-4.2-3-3 4.2-.6L12 3z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h4>AI Curation</h4>
                <p>Products hand-picked for your lifestyle.</p>
              </article>
            </div>
          </div>
          <div className="register-left-wave" aria-hidden="true" />
        </div>

        <div className="register-right-panel">
          <div className="register-form-wrap">
            <h2>Join SmartCart AI</h2>
            <p>Create your account to start your premium shopping journey.</p>

            <form className="register-form" onSubmit={handleSubmit}>
              <AuthInput
                id="name"
                name="name"
                label="Full Name"
                leftIcon="person"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your full name"
              />

              <AuthInput
                id="email"
                name="email"
                label="Email Address"
                type="email"
                leftIcon="mail"
                value={form.email}
                onChange={handleChange}
                placeholder="name@example.com"
              />

              <div className="register-password-grid">
                <AuthInput
                  id="password"
                  name="password"
                  label="Password"
                  leftIcon="lock"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  rightNode={
                    <button
                      type="button"
                      className="register-eye-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <EyeIcon visible={showPassword} />
                    </button>
                  }
                />
                <AuthInput
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm"
                  leftIcon="verified"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  rightNode={
                    <button
                      type="button"
                      className="register-eye-toggle"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={
                        showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                      }
                    >
                      <EyeIcon visible={showConfirmPassword} />
                    </button>
                  }
                />
              </div>

              <label className="register-terms">
                <input
                  type="checkbox"
                  name="acceptedTerms"
                  checked={form.acceptedTerms}
                  onChange={handleChange}
                />
                <span>
                  I agree to the <a href="#">Terms of Service</a> and{" "}
                  <a href="#">Privacy Policy</a>.
                </span>
              </label>

              <AuthPrimaryButton type="submit">Create Account</AuthPrimaryButton>
            </form>

            <div className="register-login-link">
              Already have an account? <Link to="/login">Login here</Link>
            </div>

            <div className="register-badges">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                    stroke="#6b38d4"
                    strokeWidth="2"
                  />
                  <path d="m9 12 2 2 4-4" stroke="#6b38d4" strokeWidth="2" />
                </svg>
                PCI DSS Compliant
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="#6b38d4" strokeWidth="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#6b38d4" strokeWidth="2" />
                </svg>
                256-bit Encryption
              </span>
            </div>

            {message ? <div className="register-message">{message}</div> : null}
          </div>
        </div>
      </main>
    </section>
  );
}

export default Register;
