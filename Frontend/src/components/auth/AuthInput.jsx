import { useEffect, useState } from "react";
import {
  LockIcon,
  MailIcon,
  PersonIcon,
  VerifiedIcon,
} from "./AuthInputLeftIcons";
import { EMAIL_FORMAT_HINT, isWellFormedEmail } from "../../utils/isWellFormedEmail";

const leftIconMap = {
  person: PersonIcon,
  mail: MailIcon,
  lock: LockIcon,
  verified: VerifiedIcon,
};

function AuthInput({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  rightNode = null,
  leftIcon = null,
  /** Shown under the field in red (e.g. submit validation). Cleared by parent when appropriate. */
  errorBelow = null,
  onBlur = null,
}) {
  /** After blur, treat like Angular $touched — show empty-email hint once user has left the field. */
  const [emailTouched, setEmailTouched] = useState(false);
  /**
   * After the first blur with non-empty text, show format errors while typing.
   * Before that, "Enter proper email format" only appears on that first blur (or when parent passes EMAIL_FORMAT_HINT on submit).
   */
  const [emailHadBlurWithContent, setEmailHadBlurWithContent] = useState(false);

  useEffect(() => {
    if (type === "email" && errorBelow === EMAIL_FORMAT_HINT) {
      setEmailHadBlurWithContent(true);
    }
  }, [type, errorBelow]);

  const wrapClass = [
    "auth-field-input-wrap",
    leftIcon ? "auth-field-input-wrap--has-left" : "",
    rightNode ? "auth-field-input-wrap--has-right" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const LeftGlyph = leftIcon ? leftIconMap[leftIcon] : null;

  const trimmed = String(value ?? "").trim();
  const formatInvalid =
    type === "email" && trimmed.length > 0 && !isWellFormedEmail(trimmed);
  const emailFormatError =
    formatInvalid && emailHadBlurWithContent ? EMAIL_FORMAT_HINT : null;
  const emailEmptyAfterBlur =
    type === "email" && emailTouched && trimmed.length === 0
      ? "Please enter your email."
      : null;
  const residualErrorBelow =
    errorBelow && errorBelow !== EMAIL_FORMAT_HINT ? errorBelow : null;
  const bottomError = emailFormatError || emailEmptyAfterBlur || residualErrorBelow || null;
  const errorId = bottomError ? `${id}-field-error` : undefined;

  function handleBlur(event) {
    if (type === "email") {
      const v = String(event.currentTarget.value ?? "").trim();
      setEmailTouched(true);
      if (v.length > 0) setEmailHadBlurWithContent(true);
    }
    onBlur?.(event);
  }

  function handleFocus() {
    if (type === "email") setEmailTouched(false);
  }

  return (
    <div className="auth-field">
      {label ? <label htmlFor={id}>{label}</label> : null}
      <div className={wrapClass}>
        {LeftGlyph ? (
          <span className="auth-field-left-icon">
            <LeftGlyph />
          </span>
        ) : null}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          required
          aria-invalid={bottomError ? true : undefined}
          aria-describedby={errorId}
        />
        {rightNode ? <div className="auth-field-right">{rightNode}</div> : null}
      </div>
      {bottomError ? (
        <p id={errorId} className="auth-field-error" role="alert">
          {bottomError}
        </p>
      ) : null}
    </div>
  );
}

export default AuthInput;
