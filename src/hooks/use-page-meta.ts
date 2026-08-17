import { useEffect } from "react";

const BRAND = "Craftvaro";

/**
 * Sets the document title and meta description for a page.
 * Titles are suffixed with the brand so every tab reads as Craftvaro.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const full = title.includes(BRAND) ? title : `${title} | ${BRAND}`;
    document.title = full;

    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.href = `${window.location.origin}${window.location.pathname}`;
  }, [title, description]);
}

export default usePageMeta;
