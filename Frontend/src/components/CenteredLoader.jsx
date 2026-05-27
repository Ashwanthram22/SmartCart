import "./CenteredLoader.css";

/**
 * Centered page/section loading spinner.
 * @param {{ label?: string, compact?: boolean, className?: string, showLabel?: boolean }} props
 */
export default function CenteredLoader({
  label = "Loading",
  compact = false,
  className = "",
  showLabel = true,
}) {
  return (
    <div
      className={`centered-loader${compact ? " centered-loader--compact" : ""}${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="centered-loader-spinner" aria-hidden="true" />
      {showLabel ? (
        <p className="centered-loader-label" aria-hidden="true">
          {label}
        </p>
      ) : (
        <span className="centered-loader-sr">{label}</span>
      )}
    </div>
  );
}
