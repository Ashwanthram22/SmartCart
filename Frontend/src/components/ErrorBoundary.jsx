import { Component } from "react";
import "./ErrorBoundary.css";

/**
 * Catches errors in the rendered subtree and shows a friendly fallback
 * instead of an empty white page. Two presentation modes:
 *
 *   - `variant="page"` (default) — full-bleed centred card with a Reload
 *     button, suitable for wrapping a route.
 *   - `variant="inline"` — compact bordered card you can drop next to other
 *     content (e.g. inside a section like "Recommended for you") so a
 *     single broken widget doesn't take down a whole page.
 *
 * In dev (`import.meta.env.DEV`) the actual error message is shown to make
 * debugging easier; production builds always show the generic copy.
 *
 * The `resetKey` prop lets parents force a fresh attempt — pass the route
 * pathname so navigating away from a broken page un-traps the user.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handleReset = this.handleReset.bind(this);
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info);
    }
    if (typeof this.props.onError === "function") {
      try {
        this.props.onError(error, info);
      } catch {
        /* swallow handler errors so we don't recurse */
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  handleReset() {
    this.setState({ error: null });
  }

  handleReload() {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { variant = "page", title, message } = this.props;
    const headline = title || "Something went wrong";
    const body =
      message ||
      "We hit an unexpected error rendering this part of the page. You can " +
        "retry the action or reload the page.";
    const detail = import.meta.env.DEV ? String(error?.message || error) : null;

    if (variant === "silent") {
      // Optional widget failed — render nothing so the rest of the page
      // keeps working. Dev still gets the console.error from componentDidCatch.
      return null;
    }

    if (variant === "inline") {
      return (
        <div className="sc-eb sc-eb--inline" role="alert">
          <p className="sc-eb-title">{headline}</p>
          <p className="sc-eb-body">{body}</p>
          {detail ? <code className="sc-eb-detail">{detail}</code> : null}
          <button type="button" className="sc-eb-btn" onClick={this.handleReset}>
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="sc-eb sc-eb--page" role="alert">
        <div className="sc-eb-card">
          <p className="sc-eb-eyebrow">SmartCart AI</p>
          <h1 className="sc-eb-title sc-eb-title--lg">{headline}</h1>
          <p className="sc-eb-body">{body}</p>
          {detail ? <code className="sc-eb-detail">{detail}</code> : null}
          <div className="sc-eb-actions">
            <button
              type="button"
              className="sc-eb-btn sc-eb-btn--ghost"
              onClick={this.handleReset}
            >
              Try again
            </button>
            <button
              type="button"
              className="sc-eb-btn sc-eb-btn--primary"
              onClick={this.handleReload}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
