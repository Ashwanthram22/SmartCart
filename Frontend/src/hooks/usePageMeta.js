import { useEffect } from "react";

/** Shown in the browser tab on every route — intentionally not per-page. */
const DOCUMENT_TITLE = "SmartCart AI";

const DEFAULT_DESCRIPTION =
  "SmartCart AI helps you find the right products faster with curated picks, intelligent recommendations, and a built-in shopping assistant.";

/**
 * Keeps `document.title` fixed to the SmartCart brand. Call sites may still
 * pass `title` / `appendBrand` for API compatibility; those values are ignored
 * for the tab title.
 *
 * Optional `description` still updates `<meta name="description">` when
 * provided, and restores the previous content on unmount.
 */
export default function usePageMeta(titleOrOptions, descriptionArg) {
  const opts =
    typeof titleOrOptions === "string"
      ? { title: titleOrOptions, description: descriptionArg }
      : titleOrOptions || {};
  const { description } = opts;

  useEffect(() => {
    document.title = DOCUMENT_TITLE;

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
      document.title = DOCUMENT_TITLE;
      if (description && descTag) {
        if (createdDescTag) {
          descTag.parentNode?.removeChild(descTag);
        } else {
          descTag.setAttribute("content", previousDesc || DEFAULT_DESCRIPTION);
        }
      }
    };
  }, [description]);
}
