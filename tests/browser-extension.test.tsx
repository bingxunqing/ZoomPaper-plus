import { describe, expect, it } from "vitest";
// @ts-expect-error 浏览器扩展保持原生 JavaScript，可直接由 Chrome 加载。
import { detectPaper } from "../browser-extension/detector.js";

describe("browser extension paper detection", () => {
  it("uses standard academic metadata", () => {
    expect(detectPaper({
      pageUrl: "https://aclanthology.org/2026.acl-long.8/",
      title: "A Paper",
      citationPdfUrl: "/2026.acl-long.8.pdf",
    })).toEqual({
      pdfUrl: "https://aclanthology.org/2026.acl-long.8.pdf",
      title: "A Paper",
      sourceUrl: "https://aclanthology.org/2026.acl-long.8/",
    });
  });

  it("recognizes arXiv and ignores supplementary PDFs", () => {
    expect(detectPaper({
      pageUrl: "https://arxiv.org/abs/2601.12345",
      title: "ArXiv Paper",
      links: [{ href: "/supplement.pdf", text: "Supplement", title: "" }],
    })?.pdfUrl).toBe("https://arxiv.org/pdf/2601.12345");
  });

  it("prefers a selected direct PDF link", () => {
    expect(detectPaper({
      pageUrl: "https://example.org/paper",
      linkUrl: "https://example.org/main.pdf",
      title: "Example",
      citationPdfUrl: "https://example.org/metadata.pdf",
    })?.pdfUrl).toBe("https://example.org/main.pdf");
  });
});
