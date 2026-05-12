import { useEffect } from "react";

/**
 * Inject (and clean up) a `<script type="application/ld+json">` tag for
 * page-level structured data (e.g. Product, BreadcrumbList).
 *
 *   useStructuredData({ "@context": "https://schema.org", "@type": "Product", ... });
 *
 * Pass `null`/`undefined` to skip injection (e.g. while data is loading).
 */
export default function useStructuredData(data) {
  useEffect(() => {
    if (!data) return undefined;

    const script = document.createElement("script");
    script.type = "application/ld+json";
    try {
      script.text = JSON.stringify(data);
    } catch {
      return undefined;
    }
    script.dataset.smartcartJsonld = "true";
    document.head.appendChild(script);

    return () => {
      script.parentNode?.removeChild(script);
    };
  }, [data]);
}
