import { NavLink } from "react-router-dom";

/**
 * Sub-navigation rendered at the top of every Settings sub-page.
 * Uses NavLink so the active route gets the highlighted style
 * automatically.
 */
const TABS = [
  { to: "/profile/settings", label: "Security", end: true },
  { to: "/profile/settings/preferences", label: "Preferences", end: false },
];

export default function SettingsTabs() {
  return (
    <nav className="settings-subnav settings-subnav--tabs" aria-label="Settings sections">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            "settings-subnav-tab" +
            (isActive ? " settings-subnav-tab--active" : "")
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
