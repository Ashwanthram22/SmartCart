import { useEffect, useMemo, useState } from "react";
import { getProducts } from "../../api/client";
import {
  pickRecommendedProducts,
  pickTrendingProducts,
} from "../../utils/productSelection";
import HomeFooter from "./HomeFooter";
import HomeHeader from "./HomeHeader";
import HomeHero from "./HomeHero";
import RecommendedSection from "./RecommendedSection";
import TrendingSection from "./TrendingSection";
import "./Home.css";

function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getProducts();
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
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

  const recommended = useMemo(() => pickRecommendedProducts(products, 4), [products]);
  const trending = useMemo(
    () => pickTrendingProducts(products, 4, recommended),
    [products, recommended]
  );

  return (
    <div className="home-page">
      <HomeHeader />
      <main>
        <HomeHero />
        <RecommendedSection products={recommended} loading={loading} error={error} />
        <TrendingSection products={trending} loading={loading} error={error} />
      </main>
      <HomeFooter />
    </div>
  );
}

export default Home;
