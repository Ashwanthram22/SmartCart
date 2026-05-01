import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getProducts } from "../../api/client";
import { clearToken } from "../../utils/authToken";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("Loading your data...");

  useEffect(() => {
    async function loadData() {
      try {
        const [{ user }, productsData] = await Promise.all([
          getCurrentUser(),
          getProducts(),
        ]);
        setUserName(user.name);
        setProducts(productsData);
        setMessage("");
      } catch (error) {
        setMessage(error.response?.data?.message || "Session expired.");
      }
    }

    loadData();
  }, []);

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <h1>SmartCart AI</h1>
        <div className="dashboard-header-actions">
          <button type="button" className="dashboard-icon-btn" aria-label="Shopping cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="20" r="1.5" fill="currentColor" />
              <circle cx="18" cy="20" r="1.5" fill="currentColor" />
            </svg>
          </button>
          <button type="button" className="dashboard-icon-btn" aria-label="Notifications">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
          <button type="button" className="dashboard-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <h2>{userName ? `Welcome, ${userName}` : "Dashboard"}</h2>
        <p>This page is protected by JWT token authorization.</p>

        {message ? <div className="dashboard-message">{message}</div> : null}

        <div className="dashboard-products">
          {products.map((product) => (
            <article key={product.id}>
              <img src={product.image} alt={product.title} />
              <h3>{product.title}</h3>
              <p>Rs. {product.price}</p>
            </article>
          ))}
        </div>
      </main>
    </section>
  );
}

export default Dashboard;
