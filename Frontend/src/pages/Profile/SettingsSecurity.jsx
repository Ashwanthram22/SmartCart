import { useState } from "react";
import {
  ArrowRight,
  Laptop,
  Lock,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  UserCheck,
} from "lucide-react";
import { ProfileLayout } from "./ProfileLayout";
import { changePassword } from "../../api/client";
import { useToast } from "../../hooks/useToast";
import "./SettingsSecurity.css";

const LOGIN_SESSIONS = [
  {
    id: "s1",
    title: 'MacBook Pro 16"',
    current: true,
    detail: "San Francisco, USA • Chrome • IP: 192.168.1.45",
    timeLabel: "Just now",
    kind: "desktop",
  },
  {
    id: "s2",
    title: "iPhone 15 Pro",
    current: false,
    detail: "San Francisco, USA • SmartCart iOS App",
    timeLabel: "2 hours ago",
    kind: "phone",
  },
  {
    id: "s3",
    title: "iPad Air",
    current: false,
    detail: "Austin, USA • Safari",
    timeLabel: "Oct 24, 2023",
    kind: "tablet",
  },
];

function SessionIcon({ kind }) {
  if (kind === "phone") return <Smartphone size={22} aria-hidden="true" />;
  if (kind === "tablet") return <Tablet size={22} aria-hidden="true" />;
  return <Laptop size={22} aria-hidden="true" />;
}

const INITIAL_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function SettingsSecurity() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [pwForm, setPwForm] = useState(INITIAL_FORM);
  const [pwError, setPwError] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const toast = useToast();

  const handlePwChange = (field) => (e) => {
    setPwForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (pwError) setPwError("");
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwSubmitting) return;

    const { currentPassword, newPassword, confirmPassword } = pwForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError("All fields are required.");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New password and confirmation don't match.");
      return;
    }
    if (currentPassword === newPassword) {
      setPwError("New password must be different from your current password.");
      return;
    }

    setPwSubmitting(true);
    setPwError("");
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success("Password updated.");
      setPwForm(INITIAL_FORM);
    } catch (err) {
      const msg = err.response?.data?.message || "Could not update your password.";
      setPwError(msg);
    } finally {
      setPwSubmitting(false);
    }
  };

  return (
    <ProfileLayout>
      <div className="settings-security">
        <header className="settings-security-header">
          <div className="settings-kicker">
            <UserCheck size={16} aria-hidden="true" />
            <span>Account Settings</span>
          </div>
          <h1 className="settings-security-title">Security</h1>
          <p className="settings-security-lede">
            Manage your account protection and sign-in activity to keep your shopping data safe.
          </p>
        </header>

        <div className="settings-stack">
          <section className="settings-card" aria-labelledby="settings-password-heading">
            <div className="settings-card-head">
              <div className="settings-card-icon" aria-hidden="true">
                <Lock size={22} />
              </div>
              <h2 id="settings-password-heading" className="settings-card-title">
                Change Password
              </h2>
            </div>
            <form className="settings-password-form" onSubmit={handlePasswordSubmit} noValidate>
              <div className="settings-field settings-field--full">
                <label htmlFor="settings-current-password">Current Password</label>
                <input
                  id="settings-current-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={pwForm.currentPassword}
                  onChange={handlePwChange("currentPassword")}
                />
              </div>
              <div className="settings-field">
                <label htmlFor="settings-new-password">New Password</label>
                <input
                  id="settings-new-password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={pwForm.newPassword}
                  onChange={handlePwChange("newPassword")}
                />
              </div>
              <div className="settings-field">
                <label htmlFor="settings-confirm-password">Confirm New Password</label>
                <input
                  id="settings-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={pwForm.confirmPassword}
                  onChange={handlePwChange("confirmPassword")}
                />
              </div>
              {pwError ? (
                <p className="settings-form-error" role="alert">
                  {pwError}
                </p>
              ) : null}
              <div className="settings-form-actions">
                <button
                  type="submit"
                  className="settings-btn-primary"
                  disabled={pwSubmitting}
                >
                  {pwSubmitting ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
          </section>

          <section className="settings-card" aria-labelledby="settings-2fa-heading">
            <div className="settings-2fa-row">
              <div className="settings-card-head settings-card-head--inline">
                <div className="settings-card-icon" aria-hidden="true">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 id="settings-2fa-heading" className="settings-card-title">
                    Two-Factor Authentication
                  </h2>
                  <p className="settings-card-sub">Secure your account with an extra layer of protection.</p>
                </div>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  className="settings-toggle-input"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                />
                <span className="settings-toggle-track" aria-hidden="true" />
                <span className="settings-toggle-text">{twoFactorEnabled ? "Enabled" : "Disabled"}</span>
              </label>
            </div>
          </section>

          <section className="settings-card" aria-labelledby="settings-activity-heading">
            <div className="settings-card-head">
              <div className="settings-card-icon" aria-hidden="true">
                <Laptop size={22} />
              </div>
              <h2 id="settings-activity-heading" className="settings-card-title">
                Login Activity
              </h2>
            </div>
            <ul className="settings-activity-list">
              {LOGIN_SESSIONS.map((session) => (
                <li key={session.id} className="settings-activity-row">
                  <div className="settings-activity-main">
                    <div className="settings-activity-device-icon" aria-hidden="true">
                      <SessionIcon kind={session.kind} />
                    </div>
                    <div>
                      <h3 className="settings-activity-title">
                        {session.title}
                        {session.current ? (
                          <span className="settings-activity-badge">Current</span>
                        ) : null}
                      </h3>
                      <p className="settings-activity-meta">{session.detail}</p>
                    </div>
                  </div>
                  <span className="settings-activity-time">{session.timeLabel}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="settings-activity-view-all"
              onClick={() => toast.info("Detailed activity log coming soon.")}
            >
              View All Activity
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </section>

          <section className="settings-ai-banner" aria-labelledby="settings-ai-heading">
            <div className="settings-ai-banner-watermark" aria-hidden="true">
              <Sparkles size={160} />
            </div>
            <div className="settings-ai-banner-inner">
              <div className="settings-ai-banner-icon" aria-hidden="true">
                <Shield size={28} />
              </div>
              <div className="settings-ai-banner-copy">
                <h3 id="settings-ai-heading" className="settings-ai-banner-title">
                  AI Protection Active
                </h3>
                <p className="settings-ai-banner-text">
                  Our SmartCart AI is continuously monitoring your account for unusual purchase patterns or
                  suspicious login attempts. Your data is encrypted with enterprise-grade standards.
                </p>
              </div>
              <button
                type="button"
                className="settings-ai-banner-btn"
                onClick={() => toast.info("AI Shield management opens soon.")}
              >
                Manage AI Shield
              </button>
            </div>
          </section>
        </div>

        <footer className="settings-footer">
          <div className="settings-footer-inner">
            <div>
              <span className="settings-footer-brand">SmartCart AI</span>
              <p className="settings-footer-copy">© 2024 SmartCart AI. Intelligent shopping for the future.</p>
            </div>
            <div className="settings-footer-links">
              <a href="/profile">Privacy Policy</a>
              <a href="/profile">Terms of Service</a>
              <a href="/profile">Help Center</a>
              <a href="/profile">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </ProfileLayout>
  );
}
