import { useState } from "react";
import { Link } from "react-router-dom";
import { ProfileLayout } from "./ProfileLayout";
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

function IconVerifiedUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconPassword() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

function Icon2FA() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconDevices() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconDesktop() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconTablet() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowForward() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSparkleWatermark() {
  return (
    <svg width="160" height="160" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.2 4.2L17 7l-4.2 1.2L12 12l-1.2-4.8L7 7l4.2-1.2L12 2zm0 12l1.2 4.2L17 19l-4.2 1.2L12 24l-1.2-4.8L7 19l4.2-1.2L12 14z" />
    </svg>
  );
}

function IconShieldSpark() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 8v4l2 2M9 7l1.5 1M15 7l-1.5 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SessionIcon({ kind }) {
  if (kind === "phone") return <IconPhone />;
  if (kind === "tablet") return <IconTablet />;
  return <IconDesktop />;
}

export default function SettingsSecurity() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <ProfileLayout>
      <div className="settings-security">
        {/* <nav className="settings-subnav" aria-label="Workspace">
          <Link to="/profile/orders" className="settings-subnav-link">
            History
          </Link>
          <a href="#" className="settings-subnav-link">
            Recommendations
          </a>
          <a href="#" className="settings-subnav-link">
            Compare
          </a>
        </nav> */}

        <header className="settings-security-header">
          <div className="settings-kicker">
            <IconVerifiedUser />
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
                <IconPassword />
              </div>
              <h2 id="settings-password-heading" className="settings-card-title">
                Change Password
              </h2>
            </div>
            <form className="settings-password-form" onSubmit={handlePasswordSubmit}>
              <div className="settings-field settings-field--full">
                <label htmlFor="settings-current-password">Current Password</label>
                <input
                  id="settings-current-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
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
                />
              </div>
              <div className="settings-form-actions">
                <button type="submit" className="settings-btn-primary">
                  Update Password
                </button>
              </div>
            </form>
          </section>

          <section className="settings-card" aria-labelledby="settings-2fa-heading">
            <div className="settings-2fa-row">
              <div className="settings-card-head settings-card-head--inline">
                <div className="settings-card-icon" aria-hidden="true">
                  <Icon2FA />
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
                <IconDevices />
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
            <button type="button" className="settings-activity-view-all">
              View All Activity
              <IconArrowForward />
            </button>
          </section>

          <section className="settings-ai-banner" aria-labelledby="settings-ai-heading">
            <div className="settings-ai-banner-watermark" aria-hidden="true">
              <IconSparkleWatermark />
            </div>
            <div className="settings-ai-banner-inner">
              <div className="settings-ai-banner-icon" aria-hidden="true">
                <IconShieldSpark />
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
              <button type="button" className="settings-ai-banner-btn">
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
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Help Center</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </ProfileLayout>
  );
}
