import { useEffect } from "react";

const DEFAULT_TITLE = "SmartCart AI — your AI-powered shopping assistant";
const DEFAULT_DESCRIPTION =
  "SmartCart AI helps you find the right products faster with curated picks, intelligent recommendations, and a built-in shopping assistant.";
const TITLE_SUFFIX = " · SmartCart AI";

/**
 * Set the document title (and optional `<meta name="description">`)
 * for the lifetime of the calling component, then restore the
 * previous values on unmount.
 *
 *   usePageMeta("Cart", "Review your cart and check out securely.");
 *   usePageMeta({ title: "Profile", description: "..." });
 *
 * The `appendBrand` flag (default true) controls whether the
 * `· SmartCart AI` suffix is added — set to `false` for the home
 * page where the full brand title is already exact.
 */
export default function usePageMeta(titleOrOptions, descriptionArg) {
  const opts =
    typeof titleOrOptions === "string"
      ? { title: titleOrOptions, description: descriptionArg }
      : titleOrOptions || {};
  const { title, description, appendBrand = true } = opts;

  useEffect(() => {
    const previousTitle = document.title;

    if (title) {
      document.title = appendBrand ? `${title}${TITLE_SUFFIX}` : title;
    } else {
      document.title = DEFAULT_TITLE;
    }

    let descTag = document.querySelector('meta[name="description"]');
    let createdDescTag = false;
    let previousDesc = "";
    if (description) {
      if (!descTag) {
        descTag = document.createElement("meta");
        descTag.setAttribute("name", "description");
        document.head.appendChild(descTag);
        createdDescTag = true;
      } else {
        previousDesc = descTag.getAttribute("content") || "";
      }
      descTag.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;
      if (description && descTag) {
        if (createdDescTag) {
          descTag.parentNode?.removeChild(descTag);
        } else {
          descTag.setAttribute("content", previousDesc || DEFAULT_DESCRIPTION);
        }
      }
    };
  }, [title, description, appendBrand]);
}
