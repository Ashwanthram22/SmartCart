import { useEffect, useState } from "react";
import { getProducts, parseProductsListResponse } from "../../api/client";
import HomeFooter from "./HomeFooter";
import HomeHeader from "./HomeHeader";
import HomeHero from "./HomeHero";
import RecommendedSection from "./RecommendedSection";
import TrendingSection from "./TrendingSection";
import RecentlyViewedStrip from "../../components/RecentlyViewedStrip";
import usePageMeta from "../../hooks/usePageMeta";
import "./Home.css";

/** Same `GET /api/products` as catalog; smaller page size for home rows. */
const HOME_ROW_SIZE = 4;

function Home() {
  usePageMeta({
    title: "SmartCart AI — your AI-powered shopping assistant",
    description:
      "Discover trending tech and AI-curated picks tailored to how you actually shop.",
    appendBrand: false,
  });

  const [recommended, setRecommended] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [recData, trendData] = await Promise.all([
          getProducts({
            segment: "AI Picks",
            page: 1,
            limit: HOME_ROW_SIZE,
            sort: "recommended",
          }),
          getProducts({
            segment: "Trending",
            page: 1,
            limit: HOME_ROW_SIZE,
          }),
        ]);
        if (cancelled) return;
        setRecommended(parseProductsListResponse(recData).items);
        setTrending(parseProductsListResponse(trendData).items);
      } catch {
        if (!cancelled) setError("Could not load recommendations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="home-page">
      <HomeHeader />
      <main id="main-content">
        <HomeHero />
        <RecommendedSection products={recommended} loading={loading} error={error} />
        <TrendingSection products={trending} loading={loading} error={error} />
        <RecentlyViewedStrip title="Pick up where you left off" />
      </main>
      <HomeFooter />
    </div>
  );
}

export default Home;
