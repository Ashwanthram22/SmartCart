import { useEffect, useState } from "react";
import { getCurrentUser, getProducts } from "../../api/client";
import { CartIcon } from "../../components/CartIcon";
import "./Dashboard.css";

function Dashboard() {
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

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <h1>SmartCart AI</h1>
        <div className="dashboard-header-actions">
          <button type="button" className="dashboard-icon-btn" aria-label="Shopping cart">
            <CartIcon size={26} />
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
