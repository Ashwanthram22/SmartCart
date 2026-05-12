import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAdmin, setToken } from "../../utils/authToken";
import "../Login/Login.css";

function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setToken(token);
    navigate(isAdmin() ? "/admin" : "/home", { replace: true });
  }, [navigate, searchParams]);

  return (
    <section className="login-page">
      <main id="main-content" className="login-main">
        <div className="login-card">
          <h2>Signing you in...</h2>
          <p>Please wait while we complete Google authentication.</p>
        </div>
      </main>
    </section>
  );
}

export default AuthCallback;
