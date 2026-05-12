import Skeleton from "../../components/Skeleton";
import "./ProductDetailSkeleton.css";

/**
 * Ghost layout for ProductDetail.jsx — matches the real grid (gallery on
 * the left, summary on the right, then specs / reviews below) so the page
 * doesn't shift when the data lands.
 */
export default function ProductDetailSkeleton() {
  return (
    <div className="product-page" aria-busy="true" aria-label="Loading product">
      <div className="pd-skel-shell">
        <div className="pd-skel-grid">
          <div className="pd-skel-gallery">
            <Skeleton height={420} radius={18} />
            <div className="pd-skel-thumbs">
              <Skeleton height={68} radius={10} />
              <Skeleton height={68} radius={10} />
              <Skeleton height={68} radius={10} />
              <Skeleton height={68} radius={10} />
            </div>
          </div>

          <div className="pd-skel-summary">
            <Skeleton height={16} width="40%" radius={4} />
            <Skeleton height={32} width="80%" radius={6} className="pd-skel-mt-12" />
            <Skeleton height={20} width="55%" radius={4} className="pd-skel-mt-12" />

            <div className="pd-skel-price-row pd-skel-mt-24">
              <Skeleton height={36} width={120} radius={8} />
              <Skeleton height={20} width={80} radius={6} />
            </div>

            <div className="pd-skel-block pd-skel-mt-24">
              <Skeleton height={14} width="100%" radius={4} />
              <Skeleton height={14} width="92%" radius={4} className="pd-skel-mt-8" />
              <Skeleton height={14} width="68%" radius={4} className="pd-skel-mt-8" />
            </div>

            <div className="pd-skel-actions pd-skel-mt-24">
              <Skeleton height={48} radius={10} />
              <Skeleton height={48} radius={10} />
            </div>
          </div>
        </div>

        <div className="pd-skel-section pd-skel-mt-32">
          <Skeleton height={22} width={220} radius={6} />
          <div className="pd-skel-spec-grid pd-skel-mt-16">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="pd-skel-spec-row">
                <Skeleton height={14} width="40%" radius={4} />
                <Skeleton height={14} width="55%" radius={4} />
              </div>
            ))}
          </div>
        </div>

        <div className="pd-skel-section pd-skel-mt-32">
          <Skeleton height={22} width={180} radius={6} />
          <div className="pd-skel-reviews pd-skel-mt-16">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="pd-skel-review">
                <Skeleton height={14} width={140} radius={4} />
                <Skeleton height={14} width="92%" radius={4} className="pd-skel-mt-8" />
                <Skeleton height={14} width="78%" radius={4} className="pd-skel-mt-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
