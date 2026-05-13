import { useEffect, useState } from "react";
import {
  Bell,
  Globe,
  Mail,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
} from "lucide-react";
import { ProfileLayout } from "./ProfileLayout";
import SettingsTabs from "./SettingsTabs";
import { getPreferences, updatePreferences } from "../../api/client";
import { useToast } from "../../hooks/useToast";
import usePageMeta from "../../hooks/usePageMeta";
import "./SettingsSecurity.css";
import "./SettingsPreferences.css";

const CURRENCIES = [
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
];

const THEMES = [
  { value: "system", label: "Match system" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const NOTIFICATION_OPTIONS = [
  {
    key: "orderUpdates",
    title: "Order updates",
    description: "Shipping confirmations, delivery ETAs and delays.",
  },
  {
    key: "dealAlerts",
    title: "Deal alerts",
    description: "AI-curated deals on the categories you browse most.",
  },
  {
    key: "backInStock",
    title: "Back-in-stock",
    description: "When products you watch return to stock.",
  },
  {
    key: "priceDrops",
    title: "Price drops",
    description: "When a watched product hits your target price.",
  },
  {
    key: "weeklyDigest",
    title: "Weekly digest",
    description: "A Monday roundup of new arrivals and trends.",
  },
];

const DEFAULTS = {
  currency: "INR",
  theme: "system",
  notifications: {
    orderUpdates: true,
    dealAlerts: true,
    backInStock: true,
    priceDrops: true,
    weeklyDigest: false,
  },
  marketingEmails: false,
};

export default function SettingsPreferences() {
  usePageMeta({
    title: "Preferences",
    description: "Choose your currency, theme and notification preferences.",
  });

  const toast = useToast();
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [original, setOriginal] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { preferences } = await getPreferences();
        if (cancelled) return;
        const merged = {
          ...DEFAULTS,
          ...preferences,
          notifications: {
            ...DEFAULTS.notifications,
            ...(preferences?.notifications || {}),
          },
        };
        setPrefs(merged);
        setOriginal(merged);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Couldn't load your preferences.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty =
    JSON.stringify({
      ...prefs,
      notifications: prefs.notifications,
    }) !==
    JSON.stringify({
      ...original,
      notifications: original.notifications,
    });

  const updateField = (patch) => setPrefs((prev) => ({ ...prev, ...patch }));

  const updateNotification = (key, value) =>
    setPrefs((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError("");
    try {
      const { preferences } = await updatePreferences({
        currency: prefs.currency,
        theme: prefs.theme,
        notifications: prefs.notifications,
        marketingEmails: prefs.marketingEmails,
      });
      const merged = {
        ...DEFAULTS,
        ...preferences,
        notifications: {
          ...DEFAULTS.notifications,
          ...(preferences?.notifications || {}),
        },
      };
      setPrefs(merged);
      setOriginal(merged);
      toast.success("Preferences saved.");
    } catch (err) {
      const msg = err.response?.data?.message || "Couldn't save your preferences.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrefs(original);
    setError("");
  };

  return (
    <ProfileLayout>
      <div className="settings-security">
        <SettingsTabs />

        <header className="settings-security-header">
          <div className="settings-kicker">
            <SettingsIcon size={16} aria-hidden="true" />
            <span>Account settings</span>
          </div>
          <h1 className="settings-security-title">Preferences</h1>
          <p className="settings-security-lede">
            Personalise how SmartCart AI looks and what notifications you receive.
          </p>
        </header>

        {loading ? (
          <p className="sp-loading">Loading your preferences…</p>
        ) : (
          <div className="settings-stack">
            <section className="settings-card" aria-labelledby="sp-display-heading">
              <div className="settings-card-head">
                <div className="settings-card-icon" aria-hidden="true">
                  <Globe size={22} />
                </div>
                <h2 id="sp-display-heading" className="settings-card-title">
                  Display
                </h2>
              </div>
              <div className="sp-grid">
                <label className="sp-field">
                  <span className="sp-field-label">Preferred currency</span>
                  <select
                    className="sp-select"
                    value={prefs.currency}
                    onChange={(e) => updateField({ currency: e.target.value })}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <span className="sp-field-help">
                    Used in receipts and emails. UI currency may follow soon.
                  </span>
                </label>

                <label className="sp-field">
                  <span className="sp-field-label">
                    <Sun size={14} aria-hidden="true" /> Theme
                  </span>
                  <select
                    className="sp-select"
                    value={prefs.theme}
                    onChange={(e) => updateField({ theme: e.target.value })}
                  >
                    {THEMES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <span className="sp-field-help">
                    System matches your OS appearance setting.
                  </span>
                </label>
              </div>
            </section>

            <section className="settings-card" aria-labelledby="sp-notify-heading">
              <div className="settings-card-head">
                <div className="settings-card-icon" aria-hidden="true">
                  <Bell size={22} />
                </div>
                <h2 id="sp-notify-heading" className="settings-card-title">
                  Notifications
                </h2>
              </div>
              <ul className="sp-toggle-list">
                {NOTIFICATION_OPTIONS.map((opt) => {
                  const checked = Boolean(prefs.notifications?.[opt.key]);
                  return (
                    <li key={opt.key} className="sp-toggle-row">
                      <div className="sp-toggle-text">
                        <p className="sp-toggle-title">{opt.title}</p>
                        <p className="sp-toggle-desc">{opt.description}</p>
                      </div>
                      <label className="settings-toggle">
                        <input
                          type="checkbox"
                          className="settings-toggle-input"
                          checked={checked}
                          onChange={(e) =>
                            updateNotification(opt.key, e.target.checked)
                          }
                        />
                        <span className="settings-toggle-track" aria-hidden="true" />
                        <span className="settings-toggle-text">
                          {checked ? "On" : "Off"}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="settings-card" aria-labelledby="sp-mkt-heading">
              <div className="settings-2fa-row">
                <div className="settings-card-head settings-card-head--inline">
                  <div className="settings-card-icon" aria-hidden="true">
                    <Mail size={22} />
                  </div>
                  <div>
                    <h2 id="sp-mkt-heading" className="settings-card-title">
                      Marketing emails
                    </h2>
                    <p className="settings-card-sub">
                      Occasional product updates and seasonal offers from SmartCart AI.
                    </p>
                  </div>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    className="settings-toggle-input"
                    checked={Boolean(prefs.marketingEmails)}
                    onChange={(e) => updateField({ marketingEmails: e.target.checked })}
                  />
                  <span className="settings-toggle-track" aria-hidden="true" />
                  <span className="settings-toggle-text">
                    {prefs.marketingEmails ? "Subscribed" : "Unsubscribed"}
                  </span>
                </label>
              </div>
            </section>

            {error ? (
              <p className="settings-form-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="sp-action-row">
              <button
                type="button"
                className="settings-btn-primary"
                onClick={handleSave}
                disabled={!dirty || saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                className="sp-secondary"
                onClick={handleReset}
                disabled={!dirty || saving}
              >
                Reset
              </button>
              {dirty ? (
                <span className="sp-dirty-tag">
                  <Sparkles size={14} aria-hidden="true" /> Unsaved changes
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </ProfileLayout>
  );
}
