import { useNavigate } from "react-router-dom";
import { ShopTopNav } from "../../components/ShopTopNav";
import { ShopSegmentNav } from "../../components/ShopSegmentNav";

function HomeHeader({ segmentResultSummary }) {
  const navigate = useNavigate();

  const goToCatalogSegment = (segment) => {
    const params = new URLSearchParams();
    if (segment && segment !== "AI Picks") params.set("segment", segment);
    const qs = params.toString();
    navigate(qs ? `/catalog/laptops?${qs}` : "/catalog/laptops");
  };

  return (
    <header className="home-header">
      <div className="home-header-catalog-shell">
        <ShopTopNav searchPlaceholder="Ask AI for product advice..." />
      </div>
      <div className="home-header-segments">
        <ShopSegmentNav resultSummary={segmentResultSummary} onSegmentNavigate={goToCatalogSegment} />
      </div>
    </header>
  );
}

export default HomeHeader;
