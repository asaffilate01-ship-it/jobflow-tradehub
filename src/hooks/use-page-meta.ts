import { useEffect } from "react";

const BRAND = "Craftvaro";

/**
 * Sets the document title and meta description for a page.
 * Titles are suffixed with the brand so every tab reads as Craftvaro.
 */
export function usePageMeta(title: string, description?: string, index = true) {
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

    for (const [property, content] of [["og:title", full], ["twitter:title", full], ["og:description", description ?? ""], ["twitter:description", description ?? ""]]) {
      if (!content) continue;
      const attribute = property.startsWith("og:") ? "property" : "name";
      let tag = document.querySelector(`meta[${attribute}="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attribute, property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    }

    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", index ? "index,follow" : "noindex,nofollow");

    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const pageUrl = `${window.location.origin}${window.location.pathname}`;
    if (canonical) canonical.href = pageUrl;
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute("content", pageUrl);
  }, [title, description, index]);
}

export default usePageMeta;
