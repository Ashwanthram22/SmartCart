import { useState } from "react";
import { Link } from "react-router-dom";
import LegalDocumentModal from "../../components/LegalDocumentModal";
import { FOOTER_SOCIAL_LINKS } from "../../config/footerSocialLinks";
import { FOOTER_DOCUMENTS } from "../../content/footerDocuments";
import { LEGAL_DOCUMENTS } from "../../content/legalDocuments";
import "./HomeFooter.css";

const FOOTER_COLUMNS = [
  {
    title: "Get to Know Us",
    links: [
      { label: "About SmartCart", modalId: "about" },
      { label: "Careers", modalId: "careers" },
      { label: "Press Releases", modalId: "press" },
      { label: "SmartCart AI Lab", modalId: "ai-lab" },
      // { label: "Sustainability", modalId: "sustainability" },
      { label: "Our Blog", modalId: "blog" },
    ],
  },
  {
    title: "Connect with Us",
    links: FOOTER_SOCIAL_LINKS.map(({ id, label, url }) => ({
      label,
      externalUrl: url || null,
      externalKey: id,
    })),
  },
  {
    title: "Make Money with Us",
    links: [
      { label: "Sell on SmartCart", modalId: "sell" },
      { label: "Become an Affiliate", modalId: "affiliate" },
      { label: "Advertise Your Products", modalId: "advertise" },
      { label: "Partner Brands", modalId: "partner-brands" },
      { label: "SmartCart for Vendors", modalId: "vendors" },
    ],
  },
  {
    title: "Let Us Help You",
    links: [
      { label: "Your Account", to: "/profile" },
      { label: "Your Orders", to: "/profile/orders" },
      { label: "Saved Items", to: "/profile/saved" },
      { label: "Shipping Info", to: "/profile/addresses" },
      { label: "Help Center", to: "/profile/settings" },
      // { label: "Contact Us", to: "/profile" },
    ],
  },
];

const FOOTER_LEGAL = [
  { label: "Conditions of Use & Sale", modalId: "terms" },
  { label: "Privacy Notice", modalId: "privacy" },
  { label: "Interest-Based Ads", href: "#" },
];

function HomeFooter() {
  const [footerModal, setFooterModal] = useState(null);
  const [legalModal, setLegalModal] = useState(null);

  const renderColumnLink = (link) => {
    if (link.modalId) {
      return (
        <button
          type="button"
          className="home-footer-col-link"
          onClick={() => setFooterModal(link.modalId)}
        >
          {link.label}
        </button>
      );
    }

    if (link.to) {
      return (
        <Link to={link.to} className="home-footer-col-link">
          {link.label}
        </Link>
      );
    }

    if (link.externalUrl) {
      return (
        <a
          href={link.externalUrl}
          className="home-footer-col-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.label}
        </a>
      );
    }

    if (link.externalKey != null) {
      return (
        <span className="home-footer-col-link home-footer-col-link--muted" aria-disabled="true">
          {link.label}
        </span>
      );
    }

    return (
      <a href={link.href ?? "#"} className="home-footer-col-link">
        {link.label}
      </a>
    );
  };

  return (
    <footer className="home-footer" role="contentinfo">
      <LegalDocumentModal
        open={footerModal != null}
        documentId={footerModal}
        documents={FOOTER_DOCUMENTS}
        onClose={() => setFooterModal(null)}
      />
      <LegalDocumentModal
        open={legalModal != null}
        documentId={legalModal}
        documents={LEGAL_DOCUMENTS}
        onClose={() => setLegalModal(null)}
      />

      <div className="home-footer-main">
        <div className="home-footer-cols">
          {FOOTER_COLUMNS.map((col) => (
            <nav
              key={col.title}
              className="home-footer-col"
              aria-label={col.title}
            >
              <h3 className="home-footer-col-title">{col.title}</h3>
              <ul className="home-footer-col-list">
                {col.links.map((link) => (
                  <li key={link.label}>{renderColumnLink(link)}</li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="home-footer-bottom">
        <div className="home-footer-bottom-inner">
          <nav className="home-footer-legal" aria-label="Legal">
            {FOOTER_LEGAL.map((link) =>
              link.modalId ? (
                <button
                  key={link.label}
                  type="button"
                  className="home-footer-legal-link"
                  onClick={() => setLegalModal(link.modalId)}
                >
                  {link.label}
                </button>
              ) : (
                <a key={link.label} href={link.href ?? "#"} className="home-footer-legal-link">
                  {link.label}
                </a>
              ),
            )}
          </nav>

          <p className="home-footer-copy">
            © 2025–{new Date().getFullYear()}, SmartCart Inc. or its affiliates
          </p>
        </div>
      </div>
    </footer>
  );
}

export default HomeFooter;
