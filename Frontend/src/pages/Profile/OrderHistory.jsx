import { ProfileLayout } from "./ProfileLayout";
import "./OrderHistory.css";

const ORDERS = [
  {
    id: "oh-1",
    status: "transit",
    orderPlaced: "Oct 24, 2024",
    total: "$1,249.00",
    orderNumber: "SC-9048221",
    title: 'MacBook Pro 14" - M3 Chip',
    subtitle: "Space Grey, 16GB Unified Memory, 512GB SSD",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA11Iruo4RYLYCYOMh-CrcAlxdmXvk-FRYz__P9haIQeD61M1yKIm99vykfK45V0UQbnO4E7SBKYwwzTIhyfaZOoJw6rPKHRz9BRrr3hartxIfIbJIx5--0Zxpxxc47VcPNWYhKtFkgqs_VoJcu0eZeRRFTLmIy9jCyjPXz9ncjOIi__uJfQf5W-xJZMiZGwSlzf7qMOYA23LxpwK30JMhXvaox5Lz-3ES3EPXF1XRfvbZU9rz5CyEkp4YSGyTO5MYL-xabIC8hzKJX",
    aiBadge: true,
    extraLine: null,
    noteItalic: null,
    actions: [
      { label: "Track Package", variant: "primary" },
      { label: "View Details", variant: "outline" },
    ],
  },
  {
    id: "oh-2",
    status: "delivered",
    orderPlaced: "Oct 18, 2024",
    total: "$349.50",
    orderNumber: "SC-8821943",
    title: "Smart Sound Over-Ear Headphones",
    subtitle: "Midnight Blue, Adaptive Noise Cancellation",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBC33NqZV4qEjrPECPg11ftmAZXmfm8rOnZ9X-I_SawgCuIHwdydyIyBFbWe1lZhgptpoccxhcp94p42ZrIOT1OJs66UNhFXnOBEqxugtIrsLlfxV90-sSQR2_QGQN6i2MJL_pGc1xb7Zan1W2OenPIiiwqkSmyqLZ7rez8HRVn0-0RB2LOBQkTkgvgSzRYMph1lL8qDEFxCnZwDeaJwMBNX9RpBZ1YWLuKifoCbY9qQe92upLxyMPHg_BCNrpJSldpHxAM33bxkx5Q",
    aiBadge: false,
    extraLine: "Delivered on October 21, 2024",
    noteItalic: null,
    actions: [
      { label: "Buy Again", variant: "outline" },
      { label: "Write a Review", variant: "outline" },
    ],
  },
  {
    id: "oh-3",
    status: "processing",
    orderPlaced: "Oct 26, 2024",
    total: "$89.00",
    orderNumber: "SC-9102345",
    title: "Precision Stylus Gen 2",
    subtitle: "Compatible with SmartTab Series",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD33REKeWjq1WmcuDZQ5jyAoya6efsM64nX7cdGLOj_59gSlUMGd-xTEZjoh6Pp2WmEi5Ws-dITrg7wy58Lh5sGNCeWljcPzft7JaE7oZ9Mv873CFJDNnNA3zsfcxHhOPk7rgyfDpmtKZI74tR8aNEKAT3EC4IY-xTAKYXUCIsGgpnhXNGvMXTyTWd7AYp5Mgm2-cbuwIHqtiavrEHDh2T2LZ1-0cmbs4PnfvBh_dizVSJMFBa2lUimfLfvxCm6BBWi5MHNLlbxZswN",
    aiBadge: false,
    extraLine: null,
    noteItalic: "Scheduled for shipment within 24 hours",
    actions: [
      { label: "Edit Order", variant: "outline" },
      { label: "Cancel", variant: "danger-outline" },
    ],
  },
];

function IconFilter() {
  return (
    <svg className="oh-btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg className="oh-btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg className="oh-status-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="m8.5 12.5 2.5 2.5 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSync() {
  return (
    <svg className="oh-status-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M18 3v4h-4M6 21v-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg className="oh-ai-sparkle" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconInsights() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19h16M7 15v4M11 10v9M15 13v6M19 7v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StatusBadge({ status }) {
  if (status === "transit") {
    return (
      <div className="oh-badge oh-badge--transit">
        <span className="oh-badge-dot" aria-hidden="true" />
        In Transit
      </div>
    );
  }
  if (status === "delivered") {
    return (
      <div className="oh-badge oh-badge--delivered">
        <IconCheckCircle />
        Delivered
      </div>
    );
  }
  return (
    <div className="oh-badge oh-badge--processing">
      <IconSync />
      Processing
    </div>
  );
}

export default function OrderHistory() {
  return (
    <ProfileLayout>
      <div className="order-history">
        {/* <nav className="oh-subnav" aria-label="Workspace">
          <span className="oh-subnav-link oh-subnav-link--active">History</span>
          <a href="#" className="oh-subnav-link">
            Recommendations
          </a>
          <a href="#" className="oh-subnav-link">
            Compare
          </a>
        </nav> */}

        <div className="oh-page-head">
          <div>
            <h1 className="oh-title">Order History</h1>
            <p className="oh-subtitle">Manage and track your recent SmartCart AI assisted purchases.</p>
          </div>
          <div className="oh-toolbar">
            <button type="button" className="oh-tool-btn">
              <IconFilter />
              Filter
            </button>
            <button type="button" className="oh-tool-btn">
              <IconDownload />
              Export
            </button>
          </div>
        </div>

        <div className="oh-card-list">
          {ORDERS.map((order) => (
            <article key={order.id} className="oh-order-card">
              <div className="oh-order-meta-bar">
                <div className="oh-order-meta-grid">
                  <div>
                    <p className="oh-meta-label">Order Placed</p>
                    <p className="oh-meta-value">{order.orderPlaced}</p>
                  </div>
                  <div>
                    <p className="oh-meta-label">Total</p>
                    <p className="oh-meta-value oh-meta-value--bold">{order.total}</p>
                  </div>
                  <div>
                    <p className="oh-meta-label">Order #</p>
                    <p className="oh-meta-value">{order.orderNumber}</p>
                  </div>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="oh-order-body">
                <div className="oh-order-thumb">
                  <img src={order.image} alt="" loading="lazy" />
                </div>
                <div className="oh-order-main">
                  <div>
                    <h2 className="oh-product-title">{order.title}</h2>
                    <p className="oh-product-sub">{order.subtitle}</p>
                    {order.aiBadge ? (
                      <div className="oh-ai-chip">
                        <IconSparkle />
                        <span>AI Optimized Price</span>
                      </div>
                    ) : null}
                    {order.extraLine ? <p className="oh-product-extra">{order.extraLine}</p> : null}
                    {order.noteItalic ? <p className="oh-product-note">{order.noteItalic}</p> : null}
                  </div>
                  <div className="oh-order-actions">
                    {order.actions.map((a) => (
                      <button
                        key={a.label}
                        type="button"
                        className={
                          a.variant === "primary"
                            ? "oh-action-btn oh-action-btn--primary"
                            : a.variant === "danger-outline"
                              ? "oh-action-btn oh-action-btn--danger"
                              : "oh-action-btn oh-action-btn--outline"
                        }
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="oh-insight" aria-labelledby="oh-insight-heading">
          <div className="oh-insight-glow" aria-hidden="true" />
          <div className="oh-insight-inner">
            <div className="oh-insight-icon-wrap">
              <IconInsights />
            </div>
            <div className="oh-insight-copy">
              <h3 id="oh-insight-heading" className="oh-insight-title">
                Smart Insight: Spending Pattern
              </h3>
              <p className="oh-insight-text">
                Based on your history, your shopping efficiency has improved by{" "}
                <strong className="oh-insight-highlight">14%</strong> this month. You&apos;ve saved an average of{" "}
                <strong className="oh-insight-highlight">$42</strong> per order using AI-negotiated deals.
              </p>
            </div>
            <button type="button" className="oh-insight-cta">
              View Full Report
            </button>
          </div>
        </section>

        <footer className="oh-footer">
          <div className="oh-footer-inner">
            <div>
              <span className="oh-footer-brand">SmartCart AI</span>
              <p className="oh-footer-copy">© 2024 SmartCart AI. Intelligent shopping for the future.</p>
            </div>
            <div className="oh-footer-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Help Center</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </ProfileLayout>
  );
}
