function AuthPrimaryButton({ children, type = "button", disabled = false }) {
  return (
    <button className="auth-primary-button" type={type} disabled={disabled}>
      <span>{children}</span>
      <span aria-hidden="true">&rarr;</span>
    </button>
  );
}

export default AuthPrimaryButton;
