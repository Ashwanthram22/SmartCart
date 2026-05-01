import {
  LockIcon,
  MailIcon,
  PersonIcon,
  VerifiedIcon,
} from "./AuthInputLeftIcons";

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
}) {
  const wrapClass = [
    "auth-field-input-wrap",
    leftIcon ? "auth-field-input-wrap--has-left" : "",
    rightNode ? "auth-field-input-wrap--has-right" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const LeftGlyph = leftIcon ? leftIconMap[leftIcon] : null;

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
          placeholder={placeholder}
          required
        />
        {rightNode ? <div className="auth-field-right">{rightNode}</div> : null}
      </div>
    </div>
  );
}

export default AuthInput;
