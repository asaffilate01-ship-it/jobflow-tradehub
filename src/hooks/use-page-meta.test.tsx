import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePageMeta } from "./use-page-meta";

function MetaPage({ index = true }: { index?: boolean }) {
  usePageMeta("Paid marketplace", "Active paid and trial traders only.", index);
  return null;
}

describe("usePageMeta", () => {
  afterEach(() => {
    document.head.querySelectorAll('meta[name="robots"],meta[property="og:title"],meta[property="og:url"],link[rel="canonical"]').forEach((node) => node.remove());
  });

  it("sets canonical and social metadata", () => {
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
    render(<MetaPage />);
    expect(document.title).toBe("Paid marketplace | Craftvaro");
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe("Paid marketplace | Craftvaro");
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("index,follow");
    expect(canonical.href).toContain("localhost");
  });

  it("supports noindex pages", () => {
    render(<MetaPage index={false} />);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex,nofollow");
  });
});
