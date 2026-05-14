import { useNavigate } from "react-router-dom";
import { ShopTopNav } from "../../components/ShopTopNav";
import { ShopSegmentNav } from "../../components/ShopSegmentNav";
import { catalogListUrl } from "../../constants/shopRoutes";

function HomeHeader() {
  const navigate = useNavigate();

  const goToCatalogSegment = (segment) => {
    navigate(catalogListUrl(segment, ""));
  };

  return (
    <header className="home-header">
      <div className="home-header-catalog-shell">
        <ShopTopNav searchPlaceholder="Ask AI for product advice..." />
      </div>
      <div className="home-header-segments">
        <ShopSegmentNav onSegmentNavigate={goToCatalogSegment} />
      </div>
    </header>
  );
}

export default HomeHeader;
