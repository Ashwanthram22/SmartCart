function AuthBrand({ compact = false }) {
  return (
    <div className={compact ? "auth-brand auth-brand-compact" : "auth-brand"}>
      <div className="auth-brand-logo">AI</div>
      <div>
        <h1>SmartCart AI</h1>
        {!compact ? <p>Intelligent shopping at your fingertips</p> : null}
      </div>
    </div>
  );
}

export default AuthBrand;
