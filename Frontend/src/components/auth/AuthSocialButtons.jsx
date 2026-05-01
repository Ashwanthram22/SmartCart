function AuthSocialButtons({ onGoogleClick, disabled = false }) {
  return (
    <div className="auth-social-single">
      <button
        type="button"
        className="auth-social-button auth-social-google"
        onClick={onGoogleClick}
        disabled={disabled}
      >
        <span className="social-icon social-icon-google">G</span>
        <span>Google</span>
      </button>
    </div>
  );
}

export default AuthSocialButtons;
